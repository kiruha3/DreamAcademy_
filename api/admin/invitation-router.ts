import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import { invitations, users } from "@db/schema";
import { eq, and, gt, isNull, desc, count } from "drizzle-orm";
import { ROLES } from "@contracts/constants";
import { nanoid } from "nanoid";

function generateInvitationToken(): string {
  return nanoid(32);
}

export const adminInvitationRouter = router({
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const items = await db.query.invitations.findMany({
        orderBy: desc(invitations.createdAt),
        limit,
        offset,
        with: {
          createdByUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      const totalResult = await db
        .select({ count: count() })
        .from(invitations);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        limit,
        offset,
      };
    }),

  send: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(ROLES),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Check for active invitation
      const existingInvitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.email, input.email),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.usedAt),
          isNull(invitations.revokedAt)
        ),
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Active invitation already exists for this email",
        });
      }

      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const [result] = await db.insert(invitations).values({
        email: input.email,
        token,
        role: input.role,
        expiresAt,
        createdBy: ctx.user.userId,
      });

      // TODO: Send email with invitation link
      // For now, just return the token for testing

      return {
        id: Number(result.insertId),
        email: input.email,
        token,
        expiresAt,
      };
    }),

  resend: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const invitation = await db.query.invitations.findFirst({
        where: eq(invitations.id, input.id),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been used",
        });
      }

      const newToken = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db
        .update(invitations)
        .set({
          token: newToken,
          expiresAt,
          createdBy: ctx.user.userId,
        })
        .where(eq(invitations.id, input.id));

      return {
        id: input.id,
        email: invitation.email,
        token: newToken,
        expiresAt,
      };
    }),

  revoke: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const invitation = await db.query.invitations.findFirst({
        where: eq(invitations.id, input.id),
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been used",
        });
      }

      await db
        .update(invitations)
        .set({ revokedAt: new Date() })
        .where(eq(invitations.id, input.id));

      return { success: true };
    }),
});
