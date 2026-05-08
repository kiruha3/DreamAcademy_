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
import { courseRouter } from "./course-router";
import { moduleRouter } from "./module-router";
import { progressRouter } from "./progress-router";
import { assessmentRouter } from "./assessment-router";
import { certificateRouter } from "./certificate-router";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  upload: uploadRouter,
  course: courseRouter,
  module: moduleRouter,
  progress: progressRouter,
  assessment: assessmentRouter,
  certificate: certificateRouter,
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
