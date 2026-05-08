<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await auth.logout();
  router.push("/login");
}
</script>

<template>
  <header class="border-b border-border bg-surface">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <!-- Logo -->
      <RouterLink to="/" class="text-xl font-bold text-primary">
        DreamDocs Academy
      </RouterLink>

      <!-- Navigation -->
      <nav class="flex items-center gap-6">
        <RouterLink
          to="/"
          class="text-sm font-medium text-text-secondary transition hover:text-primary"
          :class="{ 'text-primary': $route.path === '/' }"
        >
          Главная
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/courses"
          class="text-sm font-medium text-text-secondary transition hover:text-primary"
          :class="{ 'text-primary': $route.path.startsWith('/course') || $route.path === '/courses' }"
        >
          Курсы
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/profile"
          class="text-sm font-medium text-text-secondary transition hover:text-primary"
          :class="{ 'text-primary': $route.path === '/profile' }"
        >
          Профиль
        </RouterLink>

        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="text-sm font-medium text-text-secondary transition hover:text-primary"
          :class="{ 'text-primary': $route.path.startsWith('/admin') }"
        >
          Админка
        </RouterLink>
      </nav>

      <!-- Auth state -->
      <div class="flex items-center gap-4">
        <template v-if="auth.user">
          <span class="text-sm text-text-secondary">
            {{ auth.user.name }}
            <span
              v-if="auth.isSuperAdmin"
              class="ml-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark"
            >
              superadmin
            </span>
            <span
              v-else-if="auth.isAdmin"
              class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-secondary"
            >
              admin
            </span>
          </span>
          <button
            @click="handleLogout"
            class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:bg-background"
          >
            Выйти
          </button>
        </template>

        <template v-else>
          <RouterLink
            to="/login"
            class="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          >
            Войти
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>
