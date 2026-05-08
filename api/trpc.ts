import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ERROR_MESSAGES } from "@contracts/constants";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = authedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !["admin", "superadmin"].includes(ctx.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ERROR_MESSAGES.FORBIDDEN,
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const superAdminProcedure = authedProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== "superadmin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ERROR_MESSAGES.FORBIDDEN,
      });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }
);
