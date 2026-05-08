import { router } from "./trpc";
import { authRouter } from "./auth-router";
import { userRouter } from "./user-router";
import { adminUserRouter } from "./admin/user-router";
import { adminInvitationRouter } from "./admin/invitation-router";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  admin: router({
    user: adminUserRouter,
    invitation: adminInvitationRouter,
  }),
});

export type AppRouter = typeof appRouter;
