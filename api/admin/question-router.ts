import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import { questions, answerOptions } from "@db/schema";
import { eq, sql } from "drizzle-orm";

export const adminQuestionRouter = router({
  list: adminProcedure
    .input(z.object({ assessmentVersionId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.questions.findMany({
        where: eq(questions.assessmentVersionId, input.assessmentVersionId),
        orderBy: questions.sortOrder,
        with: {
          answerOptions: {
            orderBy: answerOptions.sortOrder,
          },
        },
      });

      return { items };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const question = await db.query.questions.findFirst({
        where: eq(questions.id, input.id),
        with: {
          answerOptions: {
            orderBy: answerOptions.sortOrder,
          },
        },
      });

      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      return question;
    }),

  create: adminProcedure
    .input(
      z.object({
        assessmentVersionId: z.number(),
        questionText: z.string().min(1),
        questionType: z.enum(["single", "multiple", "text"]).default("single"),
        explanation: z.string().optional(),
        points: z.number().min(1).default(1),
        options: z
          .array(
            z.object({
              optionText: z.string().min(1),
              isCorrect: z.boolean().default(false),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ input }) => {
      const maxOrder = await db
        .select({ max: sql<number>`COALESCE(MAX(${questions.sortOrder}), 0)` })
        .from(questions)
        .where(eq(questions.assessmentVersionId, input.assessmentVersionId));

      const sortOrder = (maxOrder[0]?.max ?? 0) + 1;

      const [questionRow] = await db.insert(questions).values({
        assessmentVersionId: input.assessmentVersionId,
        sortOrder,
        questionText: input.questionText,
        questionType: input.questionType,
        explanation: input.explanation ?? null,
        points: input.points,
      });

      const questionId = Number(questionRow.insertId);

      // Insert answer options
      for (let i = 0; i < input.options.length; i++) {
        await db.insert(answerOptions).values({
          questionId,
          sortOrder: i + 1,
          optionText: input.options[i].optionText,
          isCorrect: input.options[i].isCorrect,
        });
      }

      return { id: questionId };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        questionText: z.string().min(1).optional(),
        questionType: z.enum(["single", "multiple", "text"]).optional(),
        explanation: z.string().optional(),
        points: z.number().min(1).optional(),
        options: z
          .array(
            z.object({
              optionText: z.string().min(1),
              isCorrect: z.boolean().default(false),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, options, ...data } = input;

      const existing = await db.query.questions.findFirst({
        where: eq(questions.id, id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      await db
        .update(questions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(questions.id, id));

      // Replace answer options if provided
      if (options && options.length > 0) {
        await db.delete(answerOptions).where(eq(answerOptions.questionId, id));

        for (let i = 0; i < options.length; i++) {
          await db.insert(answerOptions).values({
            questionId: id,
            sortOrder: i + 1,
            optionText: options[i].optionText,
            isCorrect: options[i].isCorrect,
          });
        }
      }

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(questions).where(eq(questions.id, input.id));
      return { success: true };
    }),
});
