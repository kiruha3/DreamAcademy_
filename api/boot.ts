import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { readFile } from "fs/promises";
import { appRouter } from "./router";
import { createContext } from "./context";
import { setupStatic } from "./lib/vite";
import { env } from "./lib/env";
import { getUserFromCookie, getUserFromHeader } from "./lib/auth";

const app = new Hono();

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", env: env.NODE_ENV });
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

// SPA fallback for dev mode — serve index.html for all non-API routes
if (env.NODE_ENV === "development") {
  app.use("*", async (c) => {
    // API 404s are handled above; if we reach here, no route matched
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

export default app;
