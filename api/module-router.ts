import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "./trpc";
import { db } from "./queries/connection";
import {
  modules,
  moduleVersions,
  moduleContents,
  assessments,
  courseVersions,
  courses,
  programVersions,
  programs,
  userProgramEnrollments,
} from "@db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export const moduleRouter = router({
  getById: authedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const moduleItem = await db.query.modules.findFirst({
        where: eq(modules.id, input.id),
      });

      if (!moduleItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      // Get latest module version
      const moduleVersion = await db.query.moduleVersions.findFirst({
        where: eq(moduleVersions.moduleId, moduleItem.id),
        orderBy: desc(moduleVersions.versionNumber),
      });

      if (!moduleVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published version for this module",
        });
      }

      const contents = await db.query.moduleContents.findMany({
        where: eq(moduleContents.moduleVersionId, moduleVersion.id),
      });

      const assessment = await db.query.assessments.findFirst({
        where: eq(assessments.moduleVersionId, moduleVersion.id),
      });

      return { module: moduleItem, version: moduleVersion, contents, assessment };
    }),

  getContext: authedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const moduleItem = await db.query.modules.findFirst({
        where: eq(modules.id, input.id),
      });

      if (!moduleItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      // Get latest module version
      const moduleVersion = await db.query.moduleVersions.findFirst({
        where: eq(moduleVersions.moduleId, moduleItem.id),
        orderBy: desc(moduleVersions.versionNumber),
      });

      if (!moduleVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published version for this module",
        });
      }

      // Lock check
      if (moduleItem.isLocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Модуль заблокирован",
        });
      }

      // Get course version → course → program version → program
      const courseVersion = await db.query.courseVersions.findFirst({
        where: eq(courseVersions.id, moduleItem.courseVersionId),
      });

      const course = courseVersion
        ? await db.query.courses.findFirst({
            where: eq(courses.id, courseVersion.courseId),
          })
        : null;

      const programVersion = course
        ? await db.query.programVersions.findFirst({
            where: eq(programVersions.id, course.programVersionId),
          })
        : null;

      const program = programVersion
        ? await db.query.programs.findFirst({
            where: eq(programs.id, programVersion.programId),
          })
        : null;

      // Access check
      if (program && program.targetAudience !== "all" && program.targetAudience !== ctx.user.role) {
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

      // Get all modules in this course version for navigation
      const allModules = await db.query.modules.findMany({
        where: eq(modules.courseVersionId, moduleItem.courseVersionId),
        orderBy: modules.sortOrder,
      });

      const currentIndex = allModules.findIndex((m) => m.id === moduleItem.id);
      const prevModule = currentIndex > 0 ? allModules[currentIndex - 1] : null;
      const nextModule =
        currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

      const contents = await db.query.moduleContents.findMany({
        where: eq(moduleContents.moduleVersionId, moduleVersion.id),
      });

      const assessment = await db.query.assessments.findFirst({
        where: eq(assessments.moduleVersionId, moduleVersion.id),
      });

      return {
        module: moduleItem,
        version: moduleVersion,
        contents,
        assessment,
        course,
        program,
        prevModule,
        nextModule,
      };
    }),
});
