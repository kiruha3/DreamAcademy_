import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure } from "./trpc";
import { db } from "./queries/connection";
import {
  assessments,
  assessmentVersions,
  assessmentAttempts,
  questions,
  answerOptions,
  moduleVersions,
  modules,
  courseVersions,
  courses,
  programVersions,
  programs,
  userProgramEnrollments,
  users,
} from "@db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export const assessmentRouter = router({
  getById: authedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const assessment = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.id),
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      // Access check
      await checkAssessmentAccess(ctx.user.userId, assessment);

      const assessmentVersion = await db.query.assessmentVersions.findFirst({
        where: and(
          eq(assessmentVersions.assessmentId, assessment.id),
          eq(assessmentVersions.status, "published")
        ),
        orderBy: desc(assessmentVersions.versionNumber),
      });

      if (!assessmentVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published version",
        });
      }

      const questionsList = await db.query.questions.findMany({
        where: eq(questions.assessmentVersionId, assessmentVersion.id),
        orderBy: questions.sortOrder,
        with: {
          answerOptions: {
            orderBy: answerOptions.sortOrder,
            columns: { id: true, optionText: true, sortOrder: true },
          },
        },
      });

      return {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          passingScore: assessment.passingScore,
          maxAttempts: assessment.maxAttempts,
          timeLimitMinutes: assessment.timeLimitMinutes,
          showCorrectAnswers: assessment.showCorrectAnswers,
          allowRetake: assessment.allowRetake,
        },
        questions: questionsList.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          explanation: q.explanation,
          points: q.points,
          options: q.answerOptions.map((o) => ({
            id: o.id,
            optionText: o.optionText,
          })),
        })),
      };
    }),

  startAttempt: authedProcedure
    .input(z.object({ assessmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await db.query.assessments.findFirst({
        where: eq(assessments.id, input.assessmentId),
      });

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      await checkAssessmentAccess(ctx.user.userId, assessment);

      const assessmentVersion = await db.query.assessmentVersions.findFirst({
        where: and(
          eq(assessmentVersions.assessmentId, assessment.id),
          eq(assessmentVersions.status, "published")
        ),
        orderBy: desc(assessmentVersions.versionNumber),
      });

      if (!assessmentVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No published version",
        });
      }

      // Check max attempts
      const [attemptCount] = await db
        .select({ count: count() })
        .from(assessmentAttempts)
        .where(
          and(
            eq(assessmentAttempts.userId, ctx.user.userId),
            eq(assessmentAttempts.assessmentVersionId, assessmentVersion.id)
          )
        );

      if ((attemptCount?.count ?? 0) >= assessment.maxAttempts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Maximum attempts reached",
        });
      }

      const attemptNumber = (attemptCount?.count ?? 0) + 1;

      const [result] = await db.insert(assessmentAttempts).values({
        userId: ctx.user.userId,
        assessmentVersionId: assessmentVersion.id,
        attemptNumber,
        status: "in_progress",
        startedAt: new Date(),
      });

      return { attemptId: Number(result.insertId) };
    }),

  submit: authedProcedure
    .input(
      z.object({
        attemptId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            selectedOptionIds: z.array(z.number()),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attempt = await db.query.assessmentAttempts.findFirst({
        where: eq(assessmentAttempts.id, input.attemptId),
      });

      if (!attempt || attempt.userId !== ctx.user.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      }

      if (attempt.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Attempt is already completed",
        });
      }

      // Get questions with correct answers
      const questionsList = await db.query.questions.findMany({
        where: eq(questions.assessmentVersionId, attempt.assessmentVersionId),
        with: {
          answerOptions: true,
        },
      });

      let earnedPoints = 0;
      let maxPoints = 0;

      for (const question of questionsList) {
        maxPoints += question.points;
        const userAnswer = input.answers.find(
          (a) => a.questionId === question.id
        );

        if (!userAnswer) continue;

        const correctOptionIds = question.answerOptions
          .filter((o) => o.isCorrect)
          .map((o) => o.id);

        let isCorrect = false;

        if (question.questionType === "single") {
          isCorrect =
            userAnswer.selectedOptionIds.length === 1 &&
            correctOptionIds.includes(userAnswer.selectedOptionIds[0]);
        } else if (question.questionType === "multiple") {
          const selectedSet = new Set(userAnswer.selectedOptionIds);
          const correctSet = new Set(correctOptionIds);
          isCorrect =
            selectedSet.size === correctSet.size &&
            [...selectedSet].every((id) => correctSet.has(id));
        }

        if (isCorrect) {
          earnedPoints += question.points;
        }
      }

      const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
      const av = await db.query.assessmentVersions.findFirst({
        where: eq(assessmentVersions.id, attempt.assessmentVersionId),
      });
      const assessmentRecord = av
        ? await db.query.assessments.findFirst({
            where: eq(assessments.id, av.assessmentId),
          })
        : null;
      const isPassed = score >= (assessmentRecord?.passingScore ?? 80);

      await db
        .update(assessmentAttempts)
        .set({
          status: "completed",
          score,
          maxScore: maxPoints,
          isPassed,
          answersJson: JSON.stringify(input.answers),
          completedAt: new Date(),
        })
        .where(eq(assessmentAttempts.id, attempt.id));

      return {
        attemptId: attempt.id,
        score,
        maxScore: maxPoints,
        isPassed,
        earnedPoints,
      };
    }),

  getResult: authedProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(async ({ ctx, input }) => {
      const attempt = await db.query.assessmentAttempts.findFirst({
        where: eq(assessmentAttempts.id, input.attemptId),
      });

      if (!attempt || attempt.userId !== ctx.user.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      }

      const assessmentVersion = await db.query.assessmentVersions.findFirst({
        where: eq(assessmentVersions.id, attempt.assessmentVersionId),
      });

      const assessment = assessmentVersion
        ? await db.query.assessments.findFirst({
            where: eq(assessments.id, assessmentVersion.assessmentId),
          })
        : null;

      const questionsList = await db.query.questions.findMany({
        where: eq(questions.assessmentVersionId, attempt.assessmentVersionId),
        orderBy: questions.sortOrder,
        with: {
          answerOptions: {
            orderBy: answerOptions.sortOrder,
          },
        },
      });

      const userAnswers = attempt.answersJson
        ? JSON.parse(attempt.answersJson)
        : [];

      const showCorrect = assessment?.showCorrectAnswers ?? true;

      return {
        attempt: {
          id: attempt.id,
          score: attempt.score,
          maxScore: attempt.maxScore,
          isPassed: attempt.isPassed,
          status: attempt.status,
          completedAt: attempt.completedAt,
        },
        questions: questionsList.map((q) => {
          const userAnswer = userAnswers.find(
            (a: any) => a.questionId === q.id
          );
          return {
            id: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            explanation: q.explanation,
            points: q.points,
            options: q.answerOptions.map((o) => ({
              id: o.id,
              optionText: o.optionText,
              isCorrect: showCorrect ? o.isCorrect : undefined,
            })),
            selectedOptionIds: userAnswer?.selectedOptionIds ?? [],
          };
        }),
      };
    }),
});

async function checkAssessmentAccess(userId: number, assessment: typeof assessments.$inferSelect) {
  // If linked to module version
  if (assessment.moduleVersionId) {
    const mv = await db.query.moduleVersions.findFirst({
      where: eq(moduleVersions.id, assessment.moduleVersionId),
    });
    if (!mv) return;

    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, mv.moduleId),
    });
    if (!mod) return;

    const cv = await db.query.courseVersions.findFirst({
      where: eq(courseVersions.id, mod.courseVersionId),
    });
    if (!cv) return;

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, cv.courseId),
    });
    if (!course) return;

    const pv = await db.query.programVersions.findFirst({
      where: eq(programVersions.id, course.programVersionId),
    });
    if (!pv) return;

    const program = await db.query.programs.findFirst({
      where: eq(programs.id, pv.programId),
    });
    if (!program) return;

    if (program.targetAudience !== "all" && program.targetAudience !== (await getUserRole(userId))) {
      const enrollment = await db.query.userProgramEnrollments.findFirst({
        where: and(
          eq(userProgramEnrollments.userId, userId),
          eq(userProgramEnrollments.programId, program.id),
          eq(userProgramEnrollments.revokedAt, null as any)
        ),
      });
      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this assessment" });
      }
    }
  }
}

async function getUserRole(userId: number): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });
  return user?.role ?? "user";
}
