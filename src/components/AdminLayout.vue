<script setup lang="ts">
import { ref } from "vue";
import { useRoute, RouterLink } from "vue-router";

const route = useRoute();
const sidebarOpen = ref(false);

const navItems = [
  { path: "/admin", label: "Дашборд", icon: "📊" },
  { path: "/admin/programs", label: "Программы", icon: "📚" },
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
        'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between px-4 py-4">
          <h2 class="text-lg font-bold text-slate-900">Админ-панель</h2>
          <button @click="sidebarOpen = false" class="lg:hidden text-slate-500">
            ✕
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
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ]"
            @click="sidebarOpen = false"
          >
            <span>{{ item.icon }}</span>
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto bg-slate-50">
      <!-- Mobile header -->
      <div class="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button @click="sidebarOpen = true" class="text-slate-600">
          ☰
        </button>
        <span class="font-semibold text-slate-900">Админ-панель</span>
      </div>

      <div class="p-4 lg:p-8">
        <slot />
      </div>
    </main>
  </div>
</template>
