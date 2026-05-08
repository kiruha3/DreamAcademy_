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
      <h1 class="text-2xl font-bold text-slate-900">Дашборд</h1>
      <p class="text-slate-600">Добро пожаловать в панель управления DreamDocs Academy.</p>

      <!-- Stats cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500">Всего пользователей</div>
          <div class="mt-2 text-3xl font-bold text-slate-900">{{ stats?.users ?? "—" }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500">Активных пользователей</div>
          <div class="mt-2 text-3xl font-bold text-slate-900">{{ stats?.activeUsers ?? "—" }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500">Программ</div>
          <div class="mt-2 text-3xl font-bold text-slate-900">{{ stats?.programs ?? "—" }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="text-sm font-medium text-slate-500">Сертификатов</div>
          <div class="mt-2 text-3xl font-bold text-slate-900">{{ stats?.certificates ?? "—" }}</div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          to="/admin/programs"
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">📚</div>
          <h3 class="font-semibold text-slate-900">Программы</h3>
          <p class="text-sm text-slate-500 mt-1">Управление учебными программами</p>
        </RouterLink>

        <RouterLink
          to="/admin/users"
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">👥</div>
          <h3 class="font-semibold text-slate-900">Пользователи</h3>
          <p class="text-sm text-slate-500 mt-1">Управление пользователями и ролями</p>
        </RouterLink>

        <RouterLink
          to="/admin/invitations"
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">📧</div>
          <h3 class="font-semibold text-slate-900">Приглашения</h3>
          <p class="text-sm text-slate-500 mt-1">Отправка приглашений новым пользователям</p>
        </RouterLink>
      </div>

      <!-- Recent programs -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="px-6 py-4 border-b border-slate-100">
          <h3 class="font-semibold text-slate-900">Последние программы</h3>
        </div>
        <div class="divide-y divide-slate-100">
          <div
            v-for="program in programsData?.items ?? []"
            :key="program.id"
            class="flex items-center justify-between px-6 py-3"
          >
            <div>
              <div class="font-medium text-slate-900">{{ program.title }}</div>
              <div class="text-sm text-slate-500">{{ program.code }} • {{ program.targetAudience }}</div>
            </div>
            <RouterLink
              :to="`/admin/programs/${program.id}`"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Открыть →
            </RouterLink>
          </div>
          <div v-if="!programsData?.items?.length" class="px-6 py-4 text-sm text-slate-500">
            Нет программ
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
