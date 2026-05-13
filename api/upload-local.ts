import { Hono } from "hono";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "images");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function registerLocalUpload(app: Hono) {
  app.post("/api/upload", async (c) => {
    try {
      const contentType = c.req.header("content-type");
      console.log("[upload] content-type header:", contentType);

      const formData = await c.req.formData();
      const file = formData.get("file");

      console.log("[upload] file type:", typeof file, file ? (file as any).constructor?.name : null, file ? (file as any).type : null, file ? (file as any).size : null);

      if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
        return c.json({ error: "No file provided" }, 400);
      }

      const fileType = (file as any).type || "";
      const fileSize = (file as any).size || 0;

      if (!ALLOWED_TYPES.includes(fileType)) {
        return c.json({ error: `Content type "${fileType}" is not allowed` }, 400);
      }

      if (fileSize > MAX_SIZE) {
        return c.json({ error: `File size exceeds limit of 5MB` }, 400);
      }

      // Ensure upload directory exists
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }

      // Generate safe filename
      const originalName = ((file as any).name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${nanoid(8)}-${originalName}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      const publicUrl = `/uploads/images/${filename}`;

      return c.json({ success: true, publicUrl, filename });
    } catch (err: any) {
      console.error("Upload error:", err);
      return c.json({ error: err?.message || "Upload failed" }, 500);
    }
  });
}
