<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";

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
  <header class="relative bg-navy">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center" @click="mobileMenuOpen = false">
        <img src="/DreamAcademy_white.svg" alt="DreamAcademy" class="h-7" />
      </RouterLink>

      <!-- Desktop Navigation -->
      <nav class="hidden items-center gap-1 lg:flex">
        <RouterLink
          to="/"
          class="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          :class="{ 'bg-white/10 text-white': $route.path === '/' }"
        >
          Главная
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/courses"
          class="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          :class="{ 'bg-white/10 text-white': $route.path.startsWith('/course') || $route.path === '/courses' }"
        >
          Курсы
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/profile"
          class="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          :class="{ 'bg-white/10 text-white': $route.path === '/profile' }"
        >
          Профиль
        </RouterLink>

        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          :class="{ 'bg-white/10 text-white': $route.path.startsWith('/admin') }"
        >
          Админка
        </RouterLink>
      </nav>

      <!-- Desktop Auth state -->
      <div class="hidden items-center gap-3 lg:flex">
        <template v-if="auth.user">
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
            >
              {{ auth.user.name.charAt(0).toUpperCase() }}
            </div>
            <span class="text-sm text-white/80">{{ auth.user.name }}</span>
            <span
              v-if="auth.isSuperAdmin"
              class="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary"
            >
              superadmin
            </span>
            <span
              v-else-if="auth.isAdmin"
              class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60"
            >
              admin
            </span>
          </div>
          <button
            @click="handleLogout"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="LogOut" class="h-4 w-4" />
          </button>
        </template>

        <template v-else>
          <RouterLink
            to="/login"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            Войти
          </RouterLink>
        </template>
      </div>

      <!-- Mobile menu button -->
      <button
        @click="mobileMenuOpen = !mobileMenuOpen"
        class="rounded-lg p-2 text-white/70 transition hover:bg-white/10 lg:hidden"
        aria-label="Меню"
      >
        <Icon v-if="!mobileMenuOpen" name="Menu" class="h-6 w-6" />
        <Icon v-else name="X" class="h-6 w-6" />
      </button>
    </div>

    <!-- Mobile menu -->
    <div
      v-if="mobileMenuOpen"
      class="absolute left-0 right-0 top-full z-50 border-t border-white/10 bg-navy shadow-xl lg:hidden"
    >
      <nav class="flex flex-col p-3 gap-1">
        <RouterLink
          to="/"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="$route.path === '/' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
          @click="mobileMenuOpen = false"
        >
          Главная
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/courses"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="$route.path.startsWith('/course') || $route.path === '/courses' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
          @click="mobileMenuOpen = false"
        >
          Курсы
        </RouterLink>

        <RouterLink
          v-if="auth.user"
          to="/profile"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="$route.path === '/profile' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
          @click="mobileMenuOpen = false"
        >
          Профиль
        </RouterLink>

        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="$route.path.startsWith('/admin') ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
          @click="mobileMenuOpen = false"
        >
          Админка
        </RouterLink>

        <div class="my-1 border-t border-white/10" />

        <template v-if="auth.user">
          <div class="flex items-center gap-2 px-3 py-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
            >
              {{ auth.user.name.charAt(0).toUpperCase() }}
            </div>
            <span class="text-sm text-white/80">{{ auth.user.name }}</span>
            <span
              v-if="auth.isSuperAdmin"
              class="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary"
            >
              superadmin
            </span>
          </div>
          <button
            @click="handleLogout"
            class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="LogOut" class="h-4 w-4" />
            Выйти
          </button>
        </template>

        <RouterLink
          v-else
          to="/login"
          class="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-white transition hover:bg-primary-dark"
          @click="mobileMenuOpen = false"
        >
          Войти
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
