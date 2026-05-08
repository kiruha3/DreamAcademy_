<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const { data: stats } = useQuery({
  queryKey: ["admin", "stats"],
  queryFn: () => trpc.admin.user.stats.query(),
});

const { data: programsData } = useQuery({
  queryKey: ["admin", "programs", "recent"],
  queryFn: () => trpc.admin.program.list.query({ limit: 5, offset: 0 }),
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-foreground">Дашборд</h1>
      <p class="text-text-secondary">Добро пожаловать в панель управления DreamDocs Academy.</p>

      <!-- Stats cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div class="text-sm font-medium text-text-muted">Всего пользователей</div>
          <div class="mt-2 text-3xl font-bold text-foreground">{{ stats?.users ?? "—" }}</div>
        </div>
        <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div class="text-sm font-medium text-text-muted">Активных пользователей</div>
          <div class="mt-2 text-3xl font-bold text-foreground">{{ stats?.activeUsers ?? "—" }}</div>
        </div>
        <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div class="text-sm font-medium text-text-muted">Программ</div>
          <div class="mt-2 text-3xl font-bold text-foreground">{{ stats?.programs ?? "—" }}</div>
        </div>
        <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div class="text-sm font-medium text-text-muted">Сертификатов</div>
          <div class="mt-2 text-3xl font-bold text-foreground">{{ stats?.certificates ?? "—" }}</div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          to="/admin/programs"
          class="rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">📚</div>
          <h3 class="font-semibold text-foreground">Программы</h3>
          <p class="text-sm text-text-muted mt-1">Управление учебными программами</p>
        </RouterLink>

        <RouterLink
          to="/admin/users"
          class="rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">👥</div>
          <h3 class="font-semibold text-foreground">Пользователи</h3>
          <p class="text-sm text-text-muted mt-1">Управление пользователями и ролями</p>
        </RouterLink>

        <RouterLink
          to="/admin/invitations"
          class="rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">📧</div>
          <h3 class="font-semibold text-foreground">Приглашения</h3>
          <p class="text-sm text-text-muted mt-1">Отправка приглашений новым пользователям</p>
        </RouterLink>
      </div>

      <!-- Recent programs -->
      <div class="rounded-xl border border-border bg-surface shadow-sm">
        <div class="px-6 py-4 border-b border-border">
          <h3 class="font-semibold text-foreground">Последние программы</h3>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="program in programsData?.items ?? []"
            :key="program.id"
            class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <div class="font-medium text-foreground">{{ program.title }}</div>
              <div class="text-sm text-text-muted">{{ program.code }} • {{ program.targetAudience }}</div>
            </div>
            <RouterLink
              :to="`/admin/programs/${program.id}`"
              class="text-sm font-medium text-primary hover:text-primary-dark"
            >
              Открыть →
            </RouterLink>
          </div>
          <div v-if="!programsData?.items?.length" class="px-6 py-4 text-sm text-text-muted">
            Нет программ
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
