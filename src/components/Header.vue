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
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <!-- Logo -->
      <RouterLink to="/" class="text-xl font-bold text-indigo-600">
        DreamDocs Academy
      </RouterLink>

      <!-- Navigation -->
      <nav class="flex items-center gap-6">
        <RouterLink
          to="/"
          class="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
          :class="{ 'text-indigo-600': $route.path === '/' }"
        >
          Главная
        </RouterLink>

        <span
          v-if="auth.user"
          class="text-sm font-medium text-slate-400 cursor-not-allowed"
          title="Будет доступно в следующих фазах"
        >
          Курсы
        </span>

        <span
          v-if="auth.user"
          class="text-sm font-medium text-slate-400 cursor-not-allowed"
          title="Будет доступно в следующих фазах"
        >
          Профиль
        </span>

        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
          :class="{ 'text-indigo-600': $route.path.startsWith('/admin') }"
        >
          Админка
        </RouterLink>
      </nav>

      <!-- Auth state -->
      <div class="flex items-center gap-4">
        <template v-if="auth.user">
          <span class="text-sm text-slate-600">
            {{ auth.user.name }}
            <span
              v-if="auth.isSuperAdmin"
              class="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
            >
              superadmin
            </span>
            <span
              v-else-if="auth.isAdmin"
              class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              admin
            </span>
          </span>
          <button
            @click="handleLogout"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Выйти
          </button>
        </template>

        <template v-else>
          <RouterLink
            to="/login"
            class="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Войти
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>
