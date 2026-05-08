import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "./trpc";
import { db } from "./queries/connection";
import {
  modules,
  moduleVersions,
  moduleProgress,
  courseVersions,
  courses,
  programVersions,
  programProgress,
  courseProgress,
} from "@db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export const progressRouter = router({
  getByProgram: authedProcedure
    .input(z.object({ programId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pv = await db.query.programVersions.findFirst({
        where: and(
          eq(programVersions.programId, input.programId),
          eq(programVersions.status, "published")
        ),
      });

      if (!pv) return { modules: [] };

      const coursesList = await db.query.courses.findMany({
        where: eq(courses.programVersionId, pv.id),
      });

      const courseIds = coursesList.map((c) => c.id);
      const cvList =
        courseIds.length > 0
          ? await db.query.courseVersions.findMany({
              where: and(
                inArray(courseVersions.courseId, courseIds),
                eq(courseVersions.status, "published")
              ),
            })
          : [];
      const cvIds = cvList.map((cv) => cv.id);

      const modulesList =
        cvIds.length > 0
          ? await db.query.modules.findMany({
              where: inArray(modules.courseVersionId, cvIds),
              orderBy: modules.sortOrder,
            })
          : [];
      const moduleIds = modulesList.map((m) => m.id);

      const mvList =
        moduleIds.length > 0
          ? await db.query.moduleVersions.findMany({
              where: and(
                inArray(moduleVersions.moduleId, moduleIds),
                eq(moduleVersions.status, "published")
              ),
            })
          : [];
      const mvIds = mvList.map((mv) => mv.id);

      const progressList =
        mvIds.length > 0
          ? await db.query.moduleProgress.findMany({
              where: and(
                eq(moduleProgress.userId, ctx.user.userId),
                inArray(moduleProgress.moduleVersionId, mvIds)
              ),
            })
          : [];

      const progressByModule = new Map<number, (typeof progressList)[0]>();
      for (const p of progressList) {
        const mv = mvList.find((mv) => mv.id === p.moduleVersionId);
        if (mv) progressByModule.set(mv.moduleId, p);
      }

      return {
        modules: modulesList.map((m) => ({
          moduleId: m.id,
          status: progressByModule.get(m.id)?.status ?? "not_started",
          completedAt: progressByModule.get(m.id)?.completedAt ?? null,
        })),
      };
    }),

  completeModule: authedProcedure
    .input(z.object({ moduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const moduleItem = await db.query.modules.findFirst({
        where: eq(modules.id, input.moduleId),
      });

      if (!moduleItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      const moduleVersion = await db.query.moduleVersions.findFirst({
        where: and(
          eq(moduleVersions.moduleId, input.moduleId),
          eq(moduleVersions.status, "published")
        ),
        orderBy: desc(moduleVersions.versionNumber),
      });

      if (!moduleVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published version for this module",
        });
      }

      const existing = await db.query.moduleProgress.findFirst({
        where: and(
          eq(moduleProgress.userId, ctx.user.userId),
          eq(moduleProgress.moduleVersionId, moduleVersion.id)
        ),
      });

      if (existing) {
        await db
          .update(moduleProgress)
          .set({
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(moduleProgress.id, existing.id));
      } else {
        const courseVersion = await db.query.courseVersions.findFirst({
          where: eq(courseVersions.id, moduleItem.courseVersionId),
        });
        if (!courseVersion) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Course version not found" });
        }

        let cp = await db.query.courseProgress.findFirst({
          where: and(
            eq(courseProgress.userId, ctx.user.userId),
            eq(courseProgress.courseVersionId, courseVersion.id)
          ),
        });

        if (!cp) {
          const course = await db.query.courses.findFirst({
            where: eq(courses.id, courseVersion.courseId),
          });
          if (!course) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
          }

          const programVersion = await db.query.programVersions.findFirst({
            where: eq(programVersions.id, course.programVersionId),
          });
          if (!programVersion) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Program version not found" });
          }

          let pp = await db.query.programProgress.findFirst({
            where: and(
              eq(programProgress.userId, ctx.user.userId),
              eq(programProgress.programVersionId, programVersion.id)
            ),
          });

          if (!pp) {
            const [ppRow] = await db.insert(programProgress).values({
              userId: ctx.user.userId,
              programVersionId: programVersion.id,
              status: "in_progress",
              startedAt: new Date(),
            });
            pp = { id: Number(ppRow.insertId) } as any;
          }

          const [cpRow] = await db.insert(courseProgress).values({
            userId: ctx.user.userId,
            courseVersionId: courseVersion.id,
            programProgressId: pp!.id,
            status: "in_progress",
            startedAt: new Date(),
          });
          cp = { id: Number(cpRow.insertId) } as any;
        }

        await db.insert(moduleProgress).values({
          userId: ctx.user.userId,
          moduleVersionId: moduleVersion.id,
          courseProgressId: cp!.id,
          status: "completed",
          completedAt: new Date(),
        });
      }

      // Update course and program progress
      await updateCourseProgress(ctx.user.userId, moduleItem.courseVersionId);

      return { success: true };
    }),
});

async function updateCourseProgress(userId: number, courseVersionId: number) {
  const allModules = await db.query.modules.findMany({
    where: eq(modules.courseVersionId, courseVersionId),
  });
  const moduleIds = allModules.map((m) => m.id);

  const mvList =
    moduleIds.length > 0
      ? await db.query.moduleVersions.findMany({
          where: and(
            inArray(moduleVersions.moduleId, moduleIds),
            eq(moduleVersions.status, "published")
          ),
        })
      : [];
  const mvIds = mvList.map((mv) => mv.id);

  const progressList =
    mvIds.length > 0
      ? await db.query.moduleProgress.findMany({
          where: and(
            eq(moduleProgress.userId, userId),
            inArray(moduleProgress.moduleVersionId, mvIds)
          ),
        })
      : [];

  const completedCount = progressList.filter((p) => p.status === "completed").length;
  const totalCount = allModules.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const cp = await db.query.courseProgress.findFirst({
    where: and(
      eq(courseProgress.userId, userId),
      eq(courseProgress.courseVersionId, courseVersionId)
    ),
  });

  if (cp) {
    const status = percent >= 100 ? "completed" : "in_progress";
    await db
      .update(courseProgress)
      .set({
        status,
        progressPercent: percent,
        completedAt: status === "completed" ? new Date() : cp.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(courseProgress.id, cp.id));

    await updateProgramProgress(userId, cp.programProgressId);
  }
}

async function updateProgramProgress(_userId: number, programProgressId: number) {
  const pp = await db.query.programProgress.findFirst({
    where: eq(programProgress.id, programProgressId),
    with: { courseProgress: true },
  });

  if (!pp) return;

  const courseProgressList = pp.courseProgress ?? [];
  const totalCourses = courseProgressList.length;
  const completedCourses = courseProgressList.filter(
    (cp) => cp.status === "completed"
  ).length;
  const percent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  const status = percent >= 100 ? "completed" : "in_progress";
  await db
    .update(programProgress)
    .set({
      status,
      progressPercent: percent,
      completedAt: status === "completed" ? new Date() : pp.completedAt,
      updatedAt: new Date(),
    })
    .where(eq(programProgress.id, programProgressId));
}
