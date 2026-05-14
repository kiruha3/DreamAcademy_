import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/HomePage.vue"),
    },
    {
      path: "/login",
      name: "login",
      meta: { guestOnly: true },
      component: () => import("@/pages/LoginPage.vue"),
    },
    {
      path: "/accept-invitation",
      name: "accept-invitation",
      component: () => import("@/pages/AcceptInvitationPage.vue"),
    },
    {
      path: "/forbidden",
      name: "forbidden",
      component: () => import("@/pages/ForbiddenPage.vue"),
    },
    {
      path: "/admin",
      component: () => import("@/pages/AdminDashboardPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/programs",
      component: () => import("@/pages/admin/AdminProgramsPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/programs/:id",
      component: () => import("@/pages/admin/AdminProgramBuilderPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/courses/:id",
      component: () => import("@/pages/admin/AdminCourseBuilderPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/modules/:id",
      component: () => import("@/pages/admin/AdminModuleBuilderPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/assessments/:id",
      component: () => import("@/pages/admin/AdminAssessmentBuilderPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/users",
      component: () => import("@/pages/admin/AdminUsersPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/admin/invitations",
      component: () => import("@/pages/admin/AdminInvitationsPage.vue"),
      meta: { requiresAdmin: true },
    },
    {
      path: "/courses",
      component: () => import("@/pages/CoursesPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/course/:slug",
      component: () => import("@/pages/CoursePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/module/:id",
      component: () => import("@/pages/ModulePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/assessment/:id",
      component: () => import("@/pages/TestPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      component: () => import("@/pages/ProfilePage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/certificate/:number",
      component: () => import("@/pages/CertificatePage.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/pages/NotFoundPage.vue"),
    },
  ],
});

router.beforeEach(async (to, _from) => {
  const auth = useAuthStore();

  const needsSession =
    Boolean(to.meta.requiresAuth) ||
    Boolean(to.meta.requiresAdmin) ||
    Boolean(to.meta.guestOnly);

  if (needsSession && auth.user === null) {
    await auth.fetchUser();
  }

  const isAuthenticated = auth.user !== null;

  if (to.meta.guestOnly && isAuthenticated) {
    return { path: "/" };
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: "/login" };
  }

  if (to.meta.requiresAdmin) {
    const isAdmin = auth.user?.role === "admin" || auth.user?.role === "superadmin";
    if (!isAuthenticated) {
      return { path: "/login" };
    }
    if (!isAdmin) {
      return { path: "/forbidden" };
    }
  }
});

export default router;
