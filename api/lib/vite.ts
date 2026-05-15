import type { Hono } from "hono";
import path from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

const mimeTypes: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

export function setupStatic(app: Hono): void {
  const publicDir = path.resolve(process.cwd(), "dist/public");

  app.get("*", async (c) => {
    const reqPath = c.req.path;

    // Let API routes pass through
    if (reqPath.startsWith("/api/")) {
      return c.notFound();
    }

    // Try to serve exact static file
    const filePath = path.join(publicDir, reqPath);
    if (existsSync(filePath)) {
      const stat = await readFile(filePath).then(() => true).catch(() => false);
      if (stat) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";
        const file = await readFile(filePath);
        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      }
    }

    // SPA fallback — serve index.html for non-file routes
    const html = await readFile(path.join(publicDir, "index.html"), "utf-8");
    return c.html(html);
  });
}
