<script setup lang="ts">
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/composables/useDebounce";
import AdminLayout from "@/components/AdminLayout.vue";
import Icon from "@/components/Icon.vue";
import StatCard from "@/components/StatCard.vue";

const router = useRouter();
const search = ref("");
const debouncedSearch = useDebounce(search, 300);

const { data: dashboard, isLoading } = useQuery({
  queryKey: ["superadmin", "dashboard"],
  queryFn: () => trpc.admin.user.dashboard.query(),
});

const roleLabels: Record<string, string> = {
  user: "Пользователь",
  employee: "Сотрудник",
  partner: "Партнёр",
  integrator: "Интегратор",
  admin: "Админ",
  superadmin: "Суперадмин",
};

const roleBadgeClass: Record<string, string> = {
  user: "bg-muted text-text-secondary",
  employee: "bg-info-light text-info",
  partner: "bg-purple-100 text-purple-700",
  integrator: "bg-warning-light text-warning",
  admin: "bg-primary-light text-primary",
  superadmin: "bg-success-light text-success",
};

const statusBadgeClass: Record<string, string> = {
  active: "bg-success-light text-success",
  pending: "bg-warning-light text-warning",
  blocked: "bg-danger-light text-danger",
};

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU");
}

const quickActions = [
  { icon: "UserPlus", label: "Создать пользователя", path: "/admin/users" },
  { icon: "Plus", label: "Создать программу", path: "/admin/programs" },
  { icon: "Upload", label: "Импортировать ZIP", path: "/admin/programs" },
  { icon: "FileBarChart", label: "Отчёты", path: "/admin/users" },
  { icon: "Settings", label: "Настройки", path: "/admin/users" },
  { icon: "AlertTriangle", label: "Проверить ошибки", path: "/admin/users" },
];

const filteredUsers = computed(() => {
  if (!debouncedSearch.value) return dashboard.value?.recentUsers ?? [];
  const q = debouncedSearch.value.toLowerCase();
  return (dashboard.value?.recentUsers ?? []).filter(
    (u) =>
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q)
  );
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="rounded-xl bg-navy px-6 py-8 text-white">
        <div class="flex items-center gap-3">
          <Icon name="Crown" class="h-6 w-6 text-primary" />
          <div>
            <h1 class="text-2xl font-bold">Панель суперадминистратора</h1>
            <p class="mt-1 text-sm text-white/60">
              Управление пользователями и мониторинг системы
            </p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="Users"
          label="Всего участников"
          :value="dashboard?.stats.usersTotal ?? 0"
          color="primary"
        />
        <StatCard
          icon="Activity"
          label="Активных сейчас"
          :value="dashboard?.stats.activeNow ?? 0"
          color="success"
        />
        <StatCard
          icon="BookOpen"
          label="Курсов / программ"
          :value="dashboard?.stats.programsTotal ?? 0"
          color="info"
        />
        <StatCard
          icon="Award"
          label="Сертификатов выдано"
          :value="dashboard?.stats.certificatesIssued ?? 0"
          color="warning"
        />
      </div>

      <!-- User base -->
      <div class="rounded-xl border border-border bg-surface shadow-sm">
        <div class="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="font-semibold text-text-primary">База пользователей</h3>
            <p class="text-sm text-text-muted">
              {{ dashboard?.stats.usersTotal ?? 0 }} пользователей в системе
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative">
              <Icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                v-model="search"
                type="text"
                placeholder="Поиск по email..."
                class="rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <RouterLink
              to="/admin/users"
              class="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
            >
              Создать
            </RouterLink>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-background/50 text-left text-text-muted">
                <th class="px-6 py-3 font-medium">ID</th>
                <th class="px-6 py-3 font-medium">Имя</th>
                <th class="px-6 py-3 font-medium">Email</th>
                <th class="px-6 py-3 font-medium">Роль</th>
                <th class="px-6 py-3 font-medium">Статус</th>
                <th class="px-6 py-3 font-medium">Дата регистрации</th>
                <th class="px-6 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="transition hover:bg-background/50"
              >
                <td class="px-6 py-3 text-text-muted">{{ user.id }}</td>
                <td class="px-6 py-3 font-medium text-text-primary">{{ user.name }}</td>
                <td class="px-6 py-3 text-text-secondary">{{ user.email }}</td>
                <td class="px-6 py-3">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="roleBadgeClass[user.role] ?? roleBadgeClass.user"
                  >
                    {{ roleLabels[user.role] ?? user.role }}
                  </span>
                </td>
                <td class="px-6 py-3">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="statusBadgeClass[user.status] ?? statusBadgeClass.active"
                  >
                    {{ user.status }}
                  </span>
                </td>
                <td class="px-6 py-3 text-text-muted">{{ formatDate(user.createdAt) }}</td>
                <td class="px-6 py-3">
                  <RouterLink
                    :to="`/admin/users`"
                    class="text-sm font-medium text-primary hover:text-primary-dark"
                  >
                    Открыть
                  </RouterLink>
                </td>
              </tr>
              <tr v-if="!filteredUsers.length">
                <td colspan="7" class="px-6 py-8 text-center text-text-muted">
                  {{ isLoading ? "Загрузка..." : "Пользователи не найдены" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- System roles -->
        <div class="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Роли системы
          </h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="r in dashboard?.systemRoles ?? []"
              :key="r.role"
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="roleBadgeClass[r.role] ?? roleBadgeClass.user"
            >
              {{ roleLabels[r.role] ?? r.role }} ({{ r.count }})
            </span>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="rounded-xl border border-border bg-surface p-5 shadow-sm lg:col-span-2">
          <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Быстрые действия
          </h3>
          <div class="grid gap-3 sm:grid-cols-3">
            <button
              v-for="action in quickActions"
              :key="action.label"
              @click="router.push(action.path)"
              class="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-text-secondary transition hover:bg-background"
            >
              <Icon :name="action.icon" class="h-4 w-4 text-primary" />
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Attention block -->
      <div class="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Требует внимания
        </h3>
        <div v-if="dashboard?.attentionItems?.length" class="space-y-2">
          <div
            v-for="item in dashboard.attentionItems"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg bg-warning-light/50 px-4 py-3 text-sm text-warning"
          >
            <Icon name="AlertTriangle" class="h-4 w-4 shrink-0" />
            {{ item.message }}
          </div>
        </div>
        <div v-else class="flex items-center gap-2 text-sm text-text-muted">
          <Icon name="CheckCircle" class="h-4 w-4 text-success" />
          Критичных событий нет
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
