import type { Hono } from "hono";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import { db } from "./queries/connection";
import { moduleContents } from "@db/schema";
import { eq } from "drizzle-orm";
import { getUserFromCookie, getUserFromHeader } from "./lib/auth";
import { env } from "./lib/env";

function getPublicDir(): string {
  return env.NODE_ENV === "production"
    ? path.join(process.cwd(), "dist", "public")
    : path.join(process.cwd(), "public");
}

export function registerHtmlZipUpload(app: Hono): void {
  app.post("/api/admin/upload-html-zip", async (c) => {
    // Auth check
    const user = (await getUserFromCookie(c)) ?? (await getUserFromHeader(c));
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      const moduleVersionId = Number(formData.get("moduleVersionId"));

      if (!file || !moduleVersionId || isNaN(moduleVersionId)) {
        return c.json({ error: "Missing file or moduleVersionId" }, 400);
      }

      // Validate file type
      if (!file.name.toLowerCase().endsWith(".zip")) {
        return c.json({ error: "File must be a ZIP archive" }, 400);
      }

      // Save to temp
      const tmpDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(tmpDir, { recursive: true });
      const tempPath = path.join(tmpDir, `${Date.now()}-${file.name}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempPath, buffer);

      try {
        // Validate ZIP
        const zip = new AdmZip(tempPath);
        const entries = zip.getEntries();

        if (entries.length === 0) {
          return c.json({ error: "ZIP archive is empty" }, 400);
        }

        // Check for index.html
        const hasIndexHtml = entries.some(
          (e) => e.entryName.toLowerCase() === "index.html"
        );
        if (!hasIndexHtml) {
          return c.json({ error: "ZIP must contain index.html" }, 400);
        }

        // Path traversal protection
        const extractPath = path.join(
          getPublicDir(),
          "content",
          "modules",
          String(moduleVersionId)
        );
        const targetDir = path.resolve(extractPath);

        for (const entry of entries) {
          const entryPath = path.join(extractPath, entry.entryName);
          const resolved = path.resolve(entryPath);
          if (!resolved.startsWith(targetDir + path.sep) && resolved !== targetDir) {
            return c.json({ error: "Path traversal detected in archive" }, 400);
          }
        }

        // Clean previous extraction if exists
        await fs.rm(extractPath, { recursive: true, force: true });
        await fs.mkdir(extractPath, { recursive: true });

        // Extract
        zip.extractAllTo(extractPath, true);

        // Update database
        const s3Key = `content/modules/${moduleVersionId}/index.html`;
        const existing = await db.query.moduleContents.findFirst({
          where: eq(moduleContents.moduleVersionId, moduleVersionId),
        });

        if (existing) {
          await db
            .update(moduleContents)
            .set({ contentType: "html_zip", s3Key })
            .where(eq(moduleContents.id, existing.id));
        } else {
          await db.insert(moduleContents).values({
            moduleVersionId,
            contentType: "html_zip",
            s3Key,
          });
        }

        return c.json({ success: true, s3Key });
      } finally {
        // Cleanup temp file
        await fs.unlink(tempPath).catch(() => {});
      }
    } catch (err) {
      console.error("HTML ZIP upload error:", err);
      return c.json({ error: "Failed to process ZIP archive" }, 500);
    }
  });
}
