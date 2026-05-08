import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./trpc";
import { db } from "./queries/connection";
import { users, invitations } from "@db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { verifyPassword, hashPassword } from "./lib/hash";
import { setAuthCookieHeader, clearAuthCookieHeader } from "./lib/cookies";
import { ERROR_MESSAGES } from "@contracts/constants";

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        });
      }

      if (user.status === "blocked") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ERROR_MESSAGES.USER_BLOCKED,
        });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        });
      }

      // Update last sign in
      await db
        .update(users)
        .set({ lastSignInAt: new Date() })
        .where(eq(users.id, user.id));

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const { createToken } = await import("./lib/jwt");
      const token = await createToken(tokenPayload);
      setAuthCookieHeader(ctx.resHeaders, token);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.userId),
    });

    if (!user || user.status === "blocked") return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
    };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    clearAuthCookieHeader(ctx.resHeaders);
    return { success: true };
  }),

  acceptInvitation: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(8),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ input }) => {
      const invitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.token, input.token),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.usedAt),
          isNull(invitations.revokedAt)
        ),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: ERROR_MESSAGES.INVITATION_EXPIRED,
        });
      }

      // Create user
      const passwordHash = await hashPassword(input.password);
      const [newUser] = await db.insert(users).values({
        name: input.name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        status: "active",
      });

      // Mark invitation as used
      await db
        .update(invitations)
        .set({ usedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return {
        user: {
          id: Number(newUser.insertId),
          name: input.name,
          email: invitation.email,
          role: invitation.role,
        },
      };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // MVP stub — in full version would send email with reset token
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        // Don't reveal if email exists
        return { success: true };
      }

      // TODO: Generate reset token and send email
      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        password: z.string().min(8),
      })
    )
    .mutation(async () => {
      // MVP stub
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Password reset via token is not yet implemented",
      });
    }),
});
