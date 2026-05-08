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
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/pages/NotFoundPage.vue"),
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  // If auth state is not loaded yet, try to fetch user synchronously from localStorage
  // (Pinia store may not be initialized in beforeEach on first load)
  const hasToken = !!localStorage.getItem("dreamdocs_auth");
  const isAuthenticated = auth.user !== null || hasToken;

  if (to.meta.guestOnly && isAuthenticated) {
    return next("/");
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next("/login");
  }

  if (to.meta.requiresAdmin) {
    const isAdmin = auth.user?.role === "admin" || auth.user?.role === "superadmin";
    if (!isAdmin && !hasToken) {
      return next("/login");
    }
    if (!isAdmin) {
      return next("/forbidden");
    }
  }

  next();
});

export default router;
