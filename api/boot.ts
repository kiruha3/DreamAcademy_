import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { readFile } from "fs/promises";
import { serveStatic } from "@hono/node-server/serve-static";
import { appRouter } from "./router";
import { createContext } from "./context";
import { setupStatic } from "./lib/vite";
import { env } from "./lib/env";
import { getUserFromCookie, getUserFromHeader } from "./lib/auth";
import { registerHtmlZipUpload } from "./html-zip-upload";
import { registerLocalUpload } from "./upload-local";
import { registerCertificatePdf } from "./certificate-pdf";
import { sql } from "drizzle-orm";

const app = new Hono();

// Local file upload endpoint (multipart, not tRPC)
registerLocalUpload(app);

// HTML ZIP upload endpoint (multipart, not tRPC)
registerHtmlZipUpload(app);

// Certificate PDF download endpoint
registerCertificatePdf(app);

// Health checks
app.get("/health", (c) => {
  return c.json({ status: "ok", env: env.NODE_ENV });
});

app.get("/health/db", async (c) => {
  try {
    const { db } = await import("./queries/connection");
    await db.execute(sql`SELECT 1`);
    return c.json({ status: "ok", database: "connected" });
  } catch (err: any) {
    return c.json({ status: "error", database: "disconnected", message: err?.message }, 503);
  }
});

// tRPC endpoint with auth
app.use(
  "/api/trpc/*",
  async (c, next) => {
    // Try to get user from cookie or header and attach to context
    const user = (await getUserFromCookie(c)) ?? (await getUserFromHeader(c));

    return trpcServer({
      router: appRouter,
      endpoint: "/api/trpc",
      createContext: async () => {
        const ctx = await createContext({
          req: c.req.raw,
          resHeaders: c.res.headers,
        });
        if (user) {
          ctx.user = user;
        }
        return ctx;
      },
    })(c, next);
  }
);

// Static files in production
if (env.NODE_ENV === "production") {
  setupStatic(app);
}

// Serve uploaded files in dev mode (before SPA fallback)
if (env.NODE_ENV === "development") {
  app.use("/uploads/*", serveStatic({ root: "./public" }));
  app.use("/content/*", serveStatic({ root: "./public" }));
}

// SPA fallback for dev mode — serve index.html for all non-API routes
if (env.NODE_ENV === "development") {
  app.use("*", async (c) => {
    // Skip static files (Vite serves these from public/)
    const path = c.req.path;
    if (path.includes(".")) {
      return c.notFound();
    }
    const html = await readFile("./index.html", "utf-8");
    return c.html(html);
  });
}

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const port = env.PORT ? parseInt(env.PORT) : 3000;
serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running on http://0.0.0.0:${port}`);

export default app;
