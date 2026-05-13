import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import {
  programs,
  programVersions,
  courses,
  courseVersions,
  modules,
  moduleVersions,
  moduleContents,
  assessments,
  assessmentVersions,
  questions,
  answerOptions,
  userProgramEnrollments,
} from "@db/schema";
import { eq, and, like, desc, count, or } from "drizzle-orm";

export const adminProgramRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          search: z.string().optional(),
          targetAudience: z
            .enum(["all", "employee", "partner", "integrator"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const conditions = [];
      if (input?.search) {
        conditions.push(
          or(
            like(programs.title, `%${input.search}%`),
            like(programs.code, `%${input.search}%`),
            like(programs.slug, `%${input.search}%`)
          )
        );
      }
      if (input?.targetAudience) {
        conditions.push(eq(programs.targetAudience, input.targetAudience));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.query.programs.findMany({
        where: whereClause,
        orderBy: desc(programs.createdAt),
        limit,
        offset,
        with: {
          versions: {
            orderBy: desc(programVersions.versionNumber),
            limit: 1,
          },
          createdByUser: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      const totalResult = await db
        .select({ count: count() })
        .from(programs)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        limit,
        offset,
      };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const program = await db.query.programs.findFirst({
        where: eq(programs.id, input.id),
        with: {
          versions: {
            orderBy: desc(programVersions.versionNumber),
          },
          createdByUser: {
            columns: { id: true, name: true, email: true },
          },
          enrollments: true,
        },
      });

      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      // Get courses for the latest draft or published version
      const latestActiveVersion = program.versions.find(
        (v) => v.status === "draft" || v.status === "published"
      );

      let coursesList: Array<typeof courses.$inferSelect & { versions: (typeof courseVersions.$inferSelect)[] }> = [];
      if (latestActiveVersion) {
        coursesList = await db.query.courses.findMany({
          where: eq(courses.programVersionId, latestActiveVersion.id),
          orderBy: courses.sortOrder,
          with: {
            versions: {
              orderBy: desc(courseVersions.versionNumber),
              limit: 1,
            },
          },
        });
      }

      return { ...program, courses: coursesList };
    }),

  create: adminProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(100),
        code: z.string().min(1).max(20),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        targetAudience: z.enum(["all", "employee", "partner", "integrator"]).default("all"),
        hasCertification: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.programs.findFirst({
        where: or(eq(programs.slug, input.slug), eq(programs.code, input.code)),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Program with this slug or code already exists",
        });
      }

      const result = await db.transaction(async (tx) => {
        const [programRow] = await tx
          .insert(programs)
          .values({
            slug: input.slug,
            code: input.code,
            title: input.title,
            description: input.description ?? null,
            targetAudience: input.targetAudience,
            hasCertification: input.hasCertification,
            createdBy: ctx.user.userId,
          });

        const programId = Number(programRow.insertId);

        await tx.insert(programVersions).values({
          programId,
          versionNumber: 1,
          status: "draft",
          createdBy: ctx.user.userId,
        });

        return { id: programId };
      });

      return result;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        slug: z.string().min(1).max(100).optional(),
        code: z.string().min(1).max(20).optional(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        targetAudience: z.enum(["all", "employee", "partner", "integrator"]).optional(),
        hasCertification: z.boolean().optional(),
        coverImageUrl: z.string().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const existing = await db.query.programs.findFirst({
        where: eq(programs.id, id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      await db
        .update(programs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(programs.id, id));

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const enrollments = await db
        .select({ count: count() })
        .from(userProgramEnrollments)
        .where(eq(userProgramEnrollments.programId, input.id));

      if (enrollments[0]?.count > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete program with active enrollments",
        });
      }

      await db.delete(programs).where(eq(programs.id, input.id));
      return { success: true };
    }),

  createNewVersion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const program = await db.query.programs.findFirst({
        where: eq(programs.id, input.id),
        with: {
          versions: {
            orderBy: desc(programVersions.versionNumber),
          },
        },
      });

      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const sourceVersion = program.versions.find(
        (v) => v.status === "published" || v.status === "draft"
      );

      if (!sourceVersion) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active version to clone from",
        });
      }

      const maxVersionNumber = program.versions[0]?.versionNumber ?? 0;

      await db.transaction(async (tx) => {
        // 1. Create new program version
        const [newPvRow] = await tx.insert(programVersions).values({
          programId: input.id,
          versionNumber: maxVersionNumber + 1,
          status: "draft",
          createdBy: ctx.user.userId,
        });
        const newProgramVersionId = Number(newPvRow.insertId);

        // 2. Get all courses from source program version
        const sourceCourses = await tx.query.courses.findMany({
          where: eq(courses.programVersionId, sourceVersion.id),
          orderBy: courses.sortOrder,
        });

        for (const sourceCourse of sourceCourses) {
          // 2a. Create new course
          const [newCourseRow] = await tx.insert(courses).values({
            programVersionId: newProgramVersionId,
            sortOrder: sourceCourse.sortOrder,
            slug: sourceCourse.slug,
            title: sourceCourse.title,
            description: sourceCourse.description,
            targetRole: sourceCourse.targetRole,
            isMandatory: sourceCourse.isMandatory,
            image: sourceCourse.image,
          });
          const newCourseId = Number(newCourseRow.insertId);

          // 2b. Create course version v1
          const [newCvRow] = await tx.insert(courseVersions).values({
            courseId: newCourseId,
            versionNumber: 1,
            status: "draft",
          });
          const newCourseVersionId = Number(newCvRow.insertId);

          // 2c. Get source course version (latest)
          const sourceCourseVersions = await tx.query.courseVersions.findMany({
            where: eq(courseVersions.courseId, sourceCourse.id),
            orderBy: desc(courseVersions.versionNumber),
            limit: 1,
          });
          const sourceCvId = sourceCourseVersions[0]?.id;

          if (!sourceCvId) continue;

          // 2d. Get modules from source course version
          const sourceModules = await tx.query.modules.findMany({
            where: eq(modules.courseVersionId, sourceCvId),
            orderBy: modules.sortOrder,
          });

          for (const sourceModule of sourceModules) {
            // Create new module
            const [newModuleRow] = await tx.insert(modules).values({
              courseVersionId: newCourseVersionId,
              sortOrder: sourceModule.sortOrder,
              title: sourceModule.title,
              description: sourceModule.description,
              moduleType: sourceModule.moduleType,
              isMandatory: sourceModule.isMandatory,
              isLocked: sourceModule.isLocked,
            });
            const newModuleId = Number(newModuleRow.insertId);

            // Create module version v1
            const [newMvRow] = await tx.insert(moduleVersions).values({
              moduleId: newModuleId,
              versionNumber: 1,
              status: "draft",
            });
            const newModuleVersionId = Number(newMvRow.insertId);

            // Get source module version (latest)
            const sourceModuleVersions = await tx.query.moduleVersions.findMany({
              where: eq(moduleVersions.moduleId, sourceModule.id),
              orderBy: desc(moduleVersions.versionNumber),
              limit: 1,
            });
            const sourceMvId = sourceModuleVersions[0]?.id;

            if (!sourceMvId) continue;

            // Clone module contents
            const sourceContents = await tx.query.moduleContents.findMany({
              where: eq(moduleContents.moduleVersionId, sourceMvId),
            });
            for (const content of sourceContents) {
              await tx.insert(moduleContents).values({
                moduleVersionId: newModuleVersionId,
                contentType: content.contentType,
                s3Key: content.s3Key,
                s3Checksum: content.s3Checksum,
                rutubeVideoId: content.rutubeVideoId,
                rutubeUrl: content.rutubeUrl,
                durationSeconds: content.durationSeconds,
              });
            }

            // Clone module-level assessments
            const sourceAssessments = await tx.query.assessments.findMany({
              where: eq(assessments.moduleVersionId, sourceMvId),
            });
            for (const sourceAssessment of sourceAssessments) {
              await cloneAssessment(tx, sourceAssessment, {
                moduleVersionId: newModuleVersionId,
                courseVersionId: null,
              });
            }
          }

          // Clone course-level assessments
          const sourceCourseAssessments = await tx.query.assessments.findMany({
            where: eq(assessments.courseVersionId, sourceCvId),
          });
          for (const sourceAssessment of sourceCourseAssessments) {
            await cloneAssessment(tx, sourceAssessment, {
              moduleVersionId: null,
              courseVersionId: newCourseVersionId,
            });
          }
        }
      });

      return { success: true };
    }),

  publish: adminProcedure
    .input(z.object({ id: z.number(), versionId: z.number() }))
    .mutation(async ({ input }) => {
      const version = await db.query.programVersions.findFirst({
        where: eq(programVersions.id, input.versionId),
      });

      if (!version || version.programId !== input.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }

      if (version.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft versions can be published",
        });
      }

      // Validation: must have at least 1 course
      const courseCount = await db
        .select({ count: count() })
        .from(courses)
        .where(eq(courses.programVersionId, version.id));

      if (courseCount[0]?.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot publish a program with no courses",
        });
      }

      await db.transaction(async (tx) => {
        // 1. Publish program version
        await tx
          .update(programVersions)
          .set({ status: "published", publishedAt: new Date() })
          .where(eq(programVersions.id, input.versionId));

        // 2. Get all courses in this program version
        const coursesList = await tx.query.courses.findMany({
          where: eq(courses.programVersionId, input.versionId),
        });

        for (const course of coursesList) {
          // 3. Publish latest course version for each course
          const latestCourseVersion = await tx.query.courseVersions.findFirst({
            where: eq(courseVersions.courseId, course.id),
            orderBy: desc(courseVersions.versionNumber),
          });

          if (latestCourseVersion) {
            await tx
              .update(courseVersions)
              .set({ status: "published", publishedAt: new Date() })
              .where(eq(courseVersions.id, latestCourseVersion.id));

            // 4. Get all modules in this course version
            const modulesList = await tx.query.modules.findMany({
              where: eq(modules.courseVersionId, latestCourseVersion.id),
            });

            for (const mod of modulesList) {
              // 5. Publish latest module version for each module
              const latestModuleVersion = await tx.query.moduleVersions.findFirst({
                where: eq(moduleVersions.moduleId, mod.id),
                orderBy: desc(moduleVersions.versionNumber),
              });

              if (latestModuleVersion) {
                await tx
                  .update(moduleVersions)
                  .set({ status: "published", publishedAt: new Date() })
                  .where(eq(moduleVersions.id, latestModuleVersion.id));

                // 6. Publish assessments linked to this module version
                const moduleAssessments = await tx.query.assessments.findMany({
                  where: eq(assessments.moduleVersionId, latestModuleVersion.id),
                });

                for (const assessment of moduleAssessments) {
                  const latestAssessmentVersion = await tx.query.assessmentVersions.findFirst({
                    where: eq(assessmentVersions.assessmentId, assessment.id),
                    orderBy: desc(assessmentVersions.versionNumber),
                  });

                  if (latestAssessmentVersion) {
                    await tx
                      .update(assessmentVersions)
                      .set({ status: "published", publishedAt: new Date() })
                      .where(eq(assessmentVersions.id, latestAssessmentVersion.id));
                  }
                }
              }
            }

            // 7. Publish assessments linked to this course version
            const courseAssessments = await tx.query.assessments.findMany({
              where: eq(assessments.courseVersionId, latestCourseVersion.id),
            });

            for (const assessment of courseAssessments) {
              const latestAssessmentVersion = await tx.query.assessmentVersions.findFirst({
                where: eq(assessmentVersions.assessmentId, assessment.id),
                orderBy: desc(assessmentVersions.versionNumber),
              });

              if (latestAssessmentVersion) {
                await tx
                  .update(assessmentVersions)
                  .set({ status: "published", publishedAt: new Date() })
                  .where(eq(assessmentVersions.id, latestAssessmentVersion.id));
              }
            }
          }
        }
      });

      return { success: true };
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number(), versionId: z.number() }))
    .mutation(async ({ input }) => {
      const version = await db.query.programVersions.findFirst({
        where: eq(programVersions.id, input.versionId),
      });

      if (!version || version.programId !== input.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }

      await db
        .update(programVersions)
        .set({ status: "archived", archivedAt: new Date() })
        .where(eq(programVersions.id, input.versionId));

      return { success: true };
    }),
});

// Helper to clone an assessment with its questions
async function cloneAssessment(
  tx: typeof db,
  source: typeof assessments.$inferSelect,
  versionIds: { moduleVersionId: number | null; courseVersionId: number | null }
) {
  const [newAssessmentRow] = await tx.insert(assessments).values({
    moduleVersionId: versionIds.moduleVersionId,
    courseVersionId: versionIds.courseVersionId,
    assessmentType: source.assessmentType,
    title: source.title,
    description: source.description,
    passingScore: source.passingScore,
    maxAttempts: source.maxAttempts,
    timeLimitMinutes: source.timeLimitMinutes,
    showCorrectAnswers: source.showCorrectAnswers,
    allowRetake: source.allowRetake,
  });
  const newAssessmentId = Number(newAssessmentRow.insertId);

  const [newAvRow] = await tx.insert(assessmentVersions).values({
    assessmentId: newAssessmentId,
    versionNumber: 1,
    status: "draft",
  });
  const newAssessmentVersionId = Number(newAvRow.insertId);

  // Get source assessment versions (latest)
  const sourceAssessmentVersions = await tx.query.assessmentVersions.findMany({
    where: eq(assessmentVersions.assessmentId, source.id),
    orderBy: desc(assessmentVersions.versionNumber),
    limit: 1,
  });
  const sourceAvId = sourceAssessmentVersions[0]?.id;

  if (!sourceAvId) return;

  // Clone questions
  const sourceQuestions = await tx.query.questions.findMany({
    where: eq(questions.assessmentVersionId, sourceAvId),
    orderBy: questions.sortOrder,
  });

  for (const sourceQuestion of sourceQuestions) {
    const [newQRow] = await tx.insert(questions).values({
      assessmentVersionId: newAssessmentVersionId,
      sortOrder: sourceQuestion.sortOrder,
      questionText: sourceQuestion.questionText,
      questionType: sourceQuestion.questionType,
      explanation: sourceQuestion.explanation,
      points: sourceQuestion.points,
    });
    const newQuestionId = Number(newQRow.insertId);

    // Clone answer options
    const sourceOptions = await tx.query.answerOptions.findMany({
      where: eq(answerOptions.questionId, sourceQuestion.id),
      orderBy: answerOptions.sortOrder,
    });

    for (const opt of sourceOptions) {
      await tx.insert(answerOptions).values({
        questionId: newQuestionId,
        sortOrder: opt.sortOrder,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
      });
    }
  }
}
