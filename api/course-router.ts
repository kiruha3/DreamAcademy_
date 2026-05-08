import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "./trpc";
import { db } from "./queries/connection";
import {
  programs,
  programVersions,
  courses,
  courseVersions,
  modules,
  moduleVersions,
  moduleContents,
  assessments,
  userProgramEnrollments,
} from "@db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

export const courseRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const publishedVersions = await db.query.programVersions.findMany({
      where: eq(programVersions.status, "published"),
      with: { program: true },
    });

    // Get user enrollments
    const enrollments = await db.query.userProgramEnrollments.findMany({
      where: and(
        eq(userProgramEnrollments.userId, ctx.user.userId),
        isNull(userProgramEnrollments.revokedAt)
      ),
    });
    const enrolledProgramIds = new Set(enrollments.map((e) => e.programId));

    const items = publishedVersions
      .filter((pv) => {
        const target = pv.program.targetAudience;
        return (
          target === "all" ||
          target === ctx.user.role ||
          enrolledProgramIds.has(pv.program.id)
        );
      })
      .map((pv) => ({
        id: pv.program.id,
        slug: pv.program.slug,
        title: pv.program.title,
        description: pv.program.description,
        targetAudience: pv.program.targetAudience,
        hasCertification: pv.program.hasCertification,
        versionId: pv.id,
        versionNumber: pv.versionNumber,
      }));

    return { items };
  }),

  getBySlug: authedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const program = await db.query.programs.findFirst({
        where: eq(programs.slug, input.slug),
      });

      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      // Access check
      if (program.targetAudience !== "all" && program.targetAudience !== ctx.user.role) {
        const enrollment = await db.query.userProgramEnrollments.findFirst({
          where: and(
            eq(userProgramEnrollments.userId, ctx.user.userId),
            eq(userProgramEnrollments.programId, program.id),
            isNull(userProgramEnrollments.revokedAt)
          ),
        });
        if (!enrollment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this program",
          });
        }
      }

      const programVersion = await db.query.programVersions.findFirst({
        where: and(
          eq(programVersions.programId, program.id),
          eq(programVersions.status, "published")
        ),
      });

      if (!programVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published version available",
        });
      }

      const coursesList = await db.query.courses.findMany({
        where: eq(courses.programVersionId, programVersion.id),
        orderBy: courses.sortOrder,
      });

      // Get published course versions
      const courseIds = coursesList.map((c) => c.id);
      const courseVersionsList =
        courseIds.length > 0
          ? await db.query.courseVersions.findMany({
              where: and(
                inArray(courseVersions.courseId, courseIds),
                eq(courseVersions.status, "published")
              ),
            })
          : [];

      const cvByCourse = new Map<number, (typeof courseVersionsList)[0]>();
      for (const cv of courseVersionsList.sort(
        (a, b) => b.versionNumber - a.versionNumber
      )) {
        if (!cvByCourse.has(cv.courseId)) cvByCourse.set(cv.courseId, cv);
      }

      // Get modules
      const cvIds = [...cvByCourse.values()].map((cv) => cv.id);
      const modulesList =
        cvIds.length > 0
          ? await db.query.modules.findMany({
              where: inArray(modules.courseVersionId, cvIds),
              orderBy: modules.sortOrder,
            })
          : [];

      // Get published module versions
      const moduleIds = modulesList.map((m) => m.id);
      const moduleVersionsList =
        moduleIds.length > 0
          ? await db.query.moduleVersions.findMany({
              where: and(
                inArray(moduleVersions.moduleId, moduleIds),
                eq(moduleVersions.status, "published")
              ),
            })
          : [];

      const mvByModule = new Map<number, (typeof moduleVersionsList)[0]>();
      for (const mv of moduleVersionsList.sort(
        (a, b) => b.versionNumber - a.versionNumber
      )) {
        if (!mvByModule.has(mv.moduleId)) mvByModule.set(mv.moduleId, mv);
      }

      // Get contents and assessments
      const mvIds = [...mvByModule.values()].map((mv) => mv.id);
      const [contentsList, moduleAssessmentsList, courseAssessmentsList] =
        await Promise.all([
          mvIds.length > 0
            ? db.query.moduleContents.findMany({
                where: inArray(moduleContents.moduleVersionId, mvIds),
              })
            : Promise.resolve([]),
          mvIds.length > 0
            ? db.query.assessments.findMany({
                where: inArray(assessments.moduleVersionId, mvIds),
              })
            : Promise.resolve([]),
          cvIds.length > 0
            ? db.query.assessments.findMany({
                where: inArray(assessments.courseVersionId, cvIds),
              })
            : Promise.resolve([]),
        ]);

      // Assemble tree
      const coursesResult = coursesList.map((course) => {
        const cv = cvByCourse.get(course.id);
        const courseModules = modulesList
          .filter((m) => m.courseVersionId === cv?.id)
          .map((mod) => {
            const mv = mvByModule.get(mod.id);
            const contents = contentsList.filter(
              (c) => c.moduleVersionId === mv?.id
            );
            const assessment =
              moduleAssessmentsList.find(
                (a) => a.moduleVersionId === mv?.id
              ) ?? null;
            return { ...mod, contents, assessment };
          });

        const courseAssessment =
          courseAssessmentsList.find(
            (a) => a.courseVersionId === cv?.id
          ) ?? null;

        return { ...course, modules: courseModules, assessment: courseAssessment };
      });

      return {
        program,
        version: programVersion,
        courses: coursesResult,
      };
    }),
});
