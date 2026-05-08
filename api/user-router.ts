import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "./trpc";
import { db } from "./queries/connection";
import { users, userProgramEnrollments, programProgress, certificates, notifications } from "@db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./lib/hash";

export const userRouter = router({
  me: authedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.userId),
      with: {
        programProgress: {
          with: {
            programVersion: {
              with: {
                program: true,
              },
            },
          },
        },
        certificates: {
          with: {
            programVersion: {
              with: {
                program: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      programProgress: user.programProgress,
      certificates: user.certificates,
    };
  }),

  updateProfile: authedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        avatar: z.string().url().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Partial<typeof users.$inferInsert> = {};
      if (input.name) updateData.name = input.name;
      if (input.avatar !== undefined) updateData.avatar = input.avatar || null;

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, ctx.user.userId));

      return { success: true };
    }),

  changePassword: authedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.userId),
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      const valid = await verifyPassword(
        input.currentPassword,
        user.passwordHash
      );
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const newHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, ctx.user.userId));

      return { success: true };
    }),

  myPrograms: authedProcedure.query(async ({ ctx }) => {
    const enrollments = await db.query.userProgramEnrollments.findMany({
      where: and(
        eq(userProgramEnrollments.userId, ctx.user.userId),
        eq(userProgramEnrollments.revokedAt, null as any)
      ),
      with: {
        program: true,
      },
    });

    const result = await Promise.all(
      enrollments.map(async (en) => {
        const progress = await db.query.programProgress.findFirst({
          where: and(
            eq(programProgress.userId, ctx.user.userId),
            eq(programProgress.programVersionId, en.program.id)
          ),
        });

        return {
          program: en.program,
          progress: progress ?? null,
        };
      })
    );

    return result;
  }),

  myCertificates: authedProcedure.query(async ({ ctx }) => {
    const certs = await db.query.certificates.findMany({
      where: eq(certificates.userId, ctx.user.userId),
      with: {
        programVersion: {
          with: {
            program: true,
          },
        },
      },
      orderBy: desc(certificates.issuedAt),
    });

    return certs;
  }),

  myNotifications: authedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const items = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, ctx.user.userId),
          eq(notifications.deletedAt, null as any)
        ),
        orderBy: desc(notifications.createdAt),
        limit,
        offset,
      });

      const total = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.userId),
            eq(notifications.deletedAt, null as any)
          )
        );

      const unreadCount = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.userId),
            eq(notifications.isRead, false),
            eq(notifications.deletedAt, null as any)
          )
        );

      return {
        items,
        total: total[0]?.count ?? 0,
        unreadCount: unreadCount[0]?.count ?? 0,
      };
    }),

  markNotificationsAsRead: authedProcedure
    .input(z.object({ ids: z.array(z.number()).optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.ids && input.ids.length > 0) {
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(
            and(
              eq(notifications.userId, ctx.user.userId),
              ...input.ids.map((id) => eq(notifications.id, id))
            )
          );
      } else {
        // Mark all as read
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(
            and(
              eq(notifications.userId, ctx.user.userId),
              eq(notifications.isRead, false)
            )
          );
      }

      return { success: true };
    }),
});
