import { router } from "./trpc";
import { authRouter } from "./auth-router";
import { userRouter } from "./user-router";
import { adminUserRouter } from "./admin/user-router";
import { adminInvitationRouter } from "./admin/invitation-router";
import { adminProgramRouter } from "./admin/program-router";
import { adminCourseRouter } from "./admin/course-router";
import { adminModuleRouter } from "./admin/module-router";
import { adminModuleContentRouter } from "./admin/module-content-router";
import { adminAssessmentRouter } from "./admin/assessment-router";
import { adminQuestionRouter } from "./admin/question-router";
import { uploadRouter } from "./upload-router";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  upload: uploadRouter,
  admin: router({
    user: adminUserRouter,
    invitation: adminInvitationRouter,
    program: adminProgramRouter,
    course: adminCourseRouter,
    module: adminModuleRouter,
    moduleContent: adminModuleContentRouter,
    assessment: adminAssessmentRouter,
    question: adminQuestionRouter,
  }),
});

export type AppRouter = typeof appRouter;
