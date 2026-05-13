import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "./trpc";
import { db } from "./queries/connection";
import {
  users, userProgramEnrollments, programProgress, certificates, notifications,
  programVersions, courses, courseVersions, modules, moduleVersions, moduleProgress
} from "@db/schema";
import { eq, and, desc, count, isNull, sql, inArray } from "drizzle-orm";
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

  dashboard: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.userId;

    // User info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, name: true, email: true, role: true, avatar: true, status: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Enrollments with program details
    const enrollments = await db.query.userProgramEnrollments.findMany({
      where: and(
        eq(userProgramEnrollments.userId, userId),
        isNull(userProgramEnrollments.revokedAt)
      ),
      with: { program: true },
    });

    const enrolledProgramIds = enrollments.map((e) => e.programId);

    // Find published program versions for enrolled programs
    const programVersionsList = enrolledProgramIds.length > 0
      ? await db.query.programVersions.findMany({
          where: and(
            inArray(programVersions.programId, enrolledProgramIds),
            eq(programVersions.status, "published")
          ),
        })
      : [];

    const pvByProgramId = new Map<number, typeof programVersionsList[0]>();
    for (const pv of programVersionsList) {
      pvByProgramId.set(pv.programId, pv);
    }

    const publishedPvIds = programVersionsList.map((pv) => pv.id);

    // Find courses for published program versions
    const coursesList = publishedPvIds.length > 0
      ? await db.query.courses.findMany({
          where: inArray(courses.programVersionId, publishedPvIds),
        })
      : [];

    const courseIdToProgramId = new Map<number, number>();
    for (const c of coursesList) {
      const pv = pvByProgramId.get(c.programVersionId);
      if (pv) courseIdToProgramId.set(c.id, pv.programId);
    }

    // Find published course versions
    const courseIds = coursesList.map((c) => c.id);
    const courseVersionsList = courseIds.length > 0
      ? await db.query.courseVersions.findMany({
          where: and(
            inArray(courseVersions.courseId, courseIds),
            eq(courseVersions.status, "published")
          ),
        })
      : [];

    const cvIdToProgramId = new Map<number, number>();
    for (const cv of courseVersionsList) {
      const programId = courseIdToProgramId.get(cv.courseId);
      if (programId) cvIdToProgramId.set(cv.id, programId);
    }

    // Find modules for published course versions
    const publishedCvIds = courseVersionsList.map((cv) => cv.id);
    const modulesList = publishedCvIds.length > 0
      ? await db.query.modules.findMany({
          where: inArray(modules.courseVersionId, publishedCvIds),
        })
      : [];

    // Count total modules per program
    const totalModulesByProgram = new Map<number, number>();
    for (const m of modulesList) {
      const programId = cvIdToProgramId.get(m.courseVersionId);
      if (programId) {
        totalModulesByProgram.set(programId, (totalModulesByProgram.get(programId) ?? 0) + 1);
      }
    }

    // Find module versions for these modules
    const moduleIds = modulesList.map((m) => m.id);
    const moduleVersionsList = moduleIds.length > 0
      ? await db.query.moduleVersions.findMany({
          where: and(
            inArray(moduleVersions.moduleId, moduleIds),
            eq(moduleVersions.status, "published")
          ),
        })
      : [];

    const mvIdToProgramId = new Map<number, number>();
    for (const mv of moduleVersionsList) {
      const mod = modulesList.find((m) => m.id === mv.moduleId);
      if (mod) {
        const programId = cvIdToProgramId.get(mod.courseVersionId);
        if (programId) mvIdToProgramId.set(mv.id, programId);
      }
    }

    // Find completed module progress for user
    const publishedMvIds = moduleVersionsList.map((mv) => mv.id);
    const completedModuleProgress = publishedMvIds.length > 0
      ? await db.query.moduleProgress.findMany({
          where: and(
            eq(moduleProgress.userId, userId),
            inArray(moduleProgress.moduleVersionId, publishedMvIds),
            eq(moduleProgress.status, "completed")
          ),
        })
      : [];

    // Count completed modules per program
    const completedModulesByProgram = new Map<number, number>();
    for (const mp of completedModuleProgress) {
      const programId = mvIdToProgramId.get(mp.moduleVersionId);
      if (programId) {
        completedModulesByProgram.set(programId, (completedModulesByProgram.get(programId) ?? 0) + 1);
      }
    }

    // Get program progress for user
    const programProgressList = await db.query.programProgress.findMany({
      where: and(
        eq(programProgress.userId, userId),
        publishedPvIds.length > 0
          ? inArray(programProgress.programVersionId, publishedPvIds)
          : sql`1=0`
      ),
    });

    const progressByProgramId = new Map<number, typeof programProgressList[0]>();
    for (const pp of programProgressList) {
      const pv = programVersionsList.find((p) => p.id === pp.programVersionId);
      if (pv) progressByProgramId.set(pv.programId, pp);
    }

    // Certificates
    const certs = await db.query.certificates.findMany({
      where: eq(certificates.userId, userId),
      with: {
        programVersion: { with: { program: true } },
      },
      orderBy: desc(certificates.issuedAt),
    });

    // Build programs with progress
    const programsWithProgress = enrollments.map((en) => {
      const program = en.program;
      const progress = progressByProgramId.get(program.id);

      return {
        program,
        totalModules: totalModulesByProgram.get(program.id) ?? 0,
        completedModules: completedModulesByProgram.get(program.id) ?? 0,
        progressPercent: progress?.progressPercent ?? 0,
        status: progress?.status ?? "not_started" as const,
      };
    });

    const avgProgress = programsWithProgress.length > 0
      ? Math.round(programsWithProgress.reduce((sum, p) => sum + p.progressPercent, 0) / programsWithProgress.length)
      : 0;

    const totalModulesAll = programsWithProgress.reduce((sum, p) => sum + p.totalModules, 0);
    const completedModulesAll = programsWithProgress.reduce((sum, p) => sum + p.completedModules, 0);

    return {
      user,
      stats: {
        programsCount: enrollments.length,
        totalModules: totalModulesAll,
        completedModules: completedModulesAll,
        certificatesCount: certs.length,
        averageProgress: avgProgress,
      },
      programs: programsWithProgress,
      certificates: certs.map((c) => ({
        id: c.id,
        certificateNumber: c.certificateNumber,
        programTitle: c.programVersion?.program?.title ?? "",
        issuedAt: c.issuedAt,
      })),
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
