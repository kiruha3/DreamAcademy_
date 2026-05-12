<script setup lang="ts">
import { ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import Icon from "./Icon.vue";

const route = useRoute();
const sidebarOpen = ref(false);

const navItems = [
  { path: "/admin", label: "Дашборд", icon: "LayoutDashboard" },
  { path: "/admin/programs", label: "Программы", icon: "BookOpen" },
  { path: "/admin/users", label: "Пользователи", icon: "Users" },
  { path: "/admin/invitations", label: "Приглашения", icon: "Mail" },
];

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + "/");
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)]">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-surface transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between px-4 py-4">
          <h2 class="text-lg font-bold text-foreground">Админ-панель</h2>
          <button @click="sidebarOpen = false" class="lg:hidden text-text-muted">
            <Icon name="X" />
          </button>
        </div>

        <nav class="flex-1 space-y-1 px-3">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive(item.path)
                ? 'bg-accent text-primary-dark'
                : 'text-text-secondary hover:bg-background hover:text-foreground',
            ]"
            @click="sidebarOpen = false"
          >
            <Icon :name="item.icon" />
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto bg-background">
      <!-- Mobile header -->
      <div class="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
        <button @click="sidebarOpen = true" class="text-text-secondary">
          <Icon name="Menu" />
        </button>
        <span class="font-semibold text-foreground">Админ-панель</span>
      </div>

      <div class="p-4 lg:p-8">
        <slot />
      </div>
    </main>
  </div>
</template>
