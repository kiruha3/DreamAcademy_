import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";
import path from "path";

export function setupStatic(app: Hono): void {
  const publicDir = path.resolve(process.cwd(), "dist/public");

  app.use(
    "/*",
    serveStatic({
      root: publicDir,
      rewriteRequestPath: (path) => {
        // For SPA routing, serve index.html for non-API routes
        if (!path.startsWith("/api/") && !path.includes(".")) {
          return "/index.html";
        }
        return path;
      },
    })
  );
}
