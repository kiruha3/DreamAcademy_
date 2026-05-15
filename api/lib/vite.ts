import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";
import path from "path";
import { readFile } from "fs/promises";

export function setupStatic(app: Hono): void {
  const publicDir = path.resolve(process.cwd(), "dist/public");

  // Serve static files by exact path patterns
  app.use("/assets/*", serveStatic({ root: publicDir }));
  app.use("/uploads/*", serveStatic({ root: publicDir }));
  app.use("/content/*", serveStatic({ root: publicDir }));
  app.use("/*.svg", serveStatic({ root: publicDir }));
  app.use("/*.png", serveStatic({ root: publicDir }));
  app.use("/*.ico", serveStatic({ root: publicDir }));
  app.use("/*.html", serveStatic({ root: publicDir }));

  // SPA fallback — serve index.html for non-API routes without file extension
  app.get("*", async (c) => {
    const reqPath = c.req.path;
    if (reqPath.startsWith("/api/")) {
      return c.notFound();
    }
    const html = await readFile(path.join(publicDir, "index.html"), "utf-8");
    return c.html(html);
  });
}
