import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import { assessments, assessmentVersions, questions, answerOptions } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const adminAssessmentRouter = router({
  list: adminProcedure
    .input(
      z.object({
        moduleVersionId: z.number().optional(),
        courseVersionId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.moduleVersionId) {
        conditions.push(eq(assessments.moduleVersionId, input.moduleVersionId));
      }
      if (input.courseVersionId) {
        conditions.push(eq(assessments.courseVersionId, input.courseVersionId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.query.assessments.findMany({
        where: whereClause,
        orderBy: desc(assessments.createdAt),
        with: {
          versions: {
            orderBy: desc(assessmentVersions.versionNumber),
            limit: 1,
          },
        },
      });

      return { items };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const assessment = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.id),
        with: {
          versions: {
            orderBy: desc(assessmentVersions.versionNumber),
            limit: 1,
          },
        },
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      const latestVersion = assessment.versions[0];
      let questionsList: Array<
        typeof questions.$inferSelect & { answerOptions: (typeof answerOptions.$inferSelect)[] }
      > = [];

      if (latestVersion) {
        questionsList = await db.query.questions.findMany({
          where: eq(questions.assessmentVersionId, latestVersion.id),
          orderBy: questions.sortOrder,
          with: {
            answerOptions: {
              orderBy: answerOptions.sortOrder,
            },
          },
        });
      }

      return { ...assessment, questions: questionsList };
    }),

  create: adminProcedure
    .input(
      z.object({
        moduleVersionId: z.number().optional(),
        courseVersionId: z.number().optional(),
        assessmentType: z.enum(["mini_test", "final", "certification"]),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        passingScore: z.number().min(0).max(100).default(80),
        maxAttempts: z.number().min(1).default(2),
        timeLimitMinutes: z.number().optional(),
        showCorrectAnswers: z.boolean().default(true),
        allowRetake: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.moduleVersionId && !input.courseVersionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either moduleVersionId or courseVersionId is required",
        });
      }

      const [assessmentRow] = await db.insert(assessments).values({
        moduleVersionId: input.moduleVersionId ?? null,
        courseVersionId: input.courseVersionId ?? null,
        assessmentType: input.assessmentType,
        title: input.title,
        description: input.description ?? null,
        passingScore: input.passingScore,
        maxAttempts: input.maxAttempts,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        showCorrectAnswers: input.showCorrectAnswers,
        allowRetake: input.allowRetake,
      });

      const assessmentId = Number(assessmentRow.insertId);

      await db.insert(assessmentVersions).values({
        assessmentId,
        versionNumber: 1,
        status: "draft",
      });

      return { id: assessmentId };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        passingScore: z.number().min(0).max(100).optional(),
        maxAttempts: z.number().min(1).optional(),
        timeLimitMinutes: z.number().optional(),
        showCorrectAnswers: z.boolean().optional(),
        allowRetake: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const existing = await db.query.assessments.findFirst({
        where: eq(assessments.id, id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      await db
        .update(assessments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(assessments.id, id));

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(assessments).where(eq(assessments.id, input.id));
      return { success: true };
    }),
});
