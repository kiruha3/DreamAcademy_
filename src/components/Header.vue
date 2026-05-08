<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const mobileMenuOpen = ref(false);

async function handleLogout() {
  mobileMenuOpen.value = false;
  await auth.logout();
  router.push("/login");
}
</script>

<template>
  <header class="relative border-b border-border bg-surface">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <!-- Logo -->
      <RouterLink to="/" class="text-xl font-bold text-primary" @click="mobileMenuOpen = false">
        DreamDocs Academy
      </RouterLink>

      <!-- Desktop Navigation -->
      <nav class="hidden items-center gap-6 lg:flex">
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

      <!-- Desktop Auth state -->
      <div class="hidden items-center gap-4 lg:flex">
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

      <!-- Mobile menu button -->
      <button
        @click="mobileMenuOpen = !mobileMenuOpen"
        class="rounded-lg p-2 text-text-secondary transition hover:bg-background lg:hidden"
        aria-label="Меню"
      >
        <svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <div
      v-if="mobileMenuOpen"
      class="absolute left-0 right-0 top-full z-50 border-b border-border bg-surface shadow-lg lg:hidden"
    >
      <nav class="flex flex-col p-4 gap-1">
        <RouterLink
          to="/"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-background"
          :class="$route.path === '/' ? 'text-primary bg-accent' : 'text-text-secondary'"
          @click="mobileMenuOpen = false"
        >
          Главная
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/courses"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-background"
          :class="$route.path.startsWith('/course') || $route.path === '/courses' ? 'text-primary bg-accent' : 'text-text-secondary'"
          @click="mobileMenuOpen = false"
        >
          Курсы
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/profile"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-background"
          :class="$route.path === '/profile' ? 'text-primary bg-accent' : 'text-text-secondary'"
          @click="mobileMenuOpen = false"
        >
          Профиль
        </RouterLink>

        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-background"
          :class="$route.path.startsWith('/admin') ? 'text-primary bg-accent' : 'text-text-secondary'"
          @click="mobileMenuOpen = false"
        >
          Админка
        </RouterLink>

        <div class="my-1 border-t border-border" />

        <template v-if="auth.user">
          <div class="px-3 py-2 text-sm text-text-secondary">
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
          </div>
          <button
            @click="handleLogout"
            class="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-secondary transition hover:bg-background"
          >
            Выйти
          </button>
        </template>

        <RouterLink
          v-else
          to="/login"
          class="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          @click="mobileMenuOpen = false"
        >
          Войти
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
