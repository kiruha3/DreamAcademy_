<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const queryClient = useQueryClient();
const search = ref("");
const roleFilter = ref<"" | "user" | "employee" | "partner" | "integrator" | "admin" | "superadmin">("");
const limit = ref(20);
const offset = ref(0);
const showAssignModal = ref(false);
const selectedUserId = ref<number | null>(null);
const selectedProgramId = ref<number | null>(null);

const { data, isLoading } = useQuery({
  queryKey: ["admin", "users", "list", search.value, roleFilter.value, offset.value],
  queryFn: () =>
    trpc.admin.user.list.query({
      search: search.value || undefined,
      role: roleFilter.value || undefined,
      limit: limit.value,
      offset: offset.value,
    }),
});

watch([search, roleFilter, offset], () => {
  queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
});

const { data: programsData } = useQuery({
  queryKey: ["admin", "programs", "all"],
  queryFn: () => trpc.admin.program.list.query({ limit: 100, offset: 0 }),
});

const blockMutation = useMutation({
  mutationFn: trpc.admin.user.block.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
  },
});

const unblockMutation = useMutation({
  mutationFn: trpc.admin.user.unblock.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
  },
});

const assignMutation = useMutation({
  mutationFn: trpc.admin.user.assignProgram.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
    showAssignModal.value = false;
    selectedUserId.value = null;
    selectedProgramId.value = null;
  },
});

function openAssign(userId: number) {
  selectedUserId.value = userId;
  selectedProgramId.value = null;
  showAssignModal.value = true;
}

function handleAssign() {
  if (selectedUserId.value && selectedProgramId.value) {
    assignMutation.mutate({ userId: selectedUserId.value, programId: selectedProgramId.value });
  }
}

const roleLabels: Record<string, string> = {
  user: "Пользователь",
  employee: "Сотрудник",
  partner: "Партнёр",
  integrator: "Интегратор",
  admin: "Админ",
  superadmin: "Суперадмин",
};

const statusLabels: Record<string, { text: string; class: string }> = {
  active: { text: "Активен", class: "bg-green-100 text-green-700" },
  blocked: { text: "Заблокирован", class: "bg-red-100 text-red-700" },
  pending: { text: "Ожидает", class: "bg-yellow-100 text-yellow-700" },
};
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900">Пользователи</h1>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <input
          v-model="search"
          placeholder="Поиск по имени или email..."
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          v-model="roleFilter"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Все роли</option>
          <option value="employee">Сотрудник</option>
          <option value="partner">Партнёр</option>
          <option value="integrator">Интегратор</option>
          <option value="admin">Админ</option>
          <option value="superadmin">Суперадмин</option>
        </select>
      </div>

      <!-- Table -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 text-left font-medium">Имя</th>
              <th class="px-4 py-3 text-left font-medium">Email</th>
              <th class="px-4 py-3 text-left font-medium">Роль</th>
              <th class="px-4 py-3 text-left font-medium">Статус</th>
              <th class="px-4 py-3 text-left font-medium">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="user in data?.items ?? []" :key="user.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">{{ user.name }}</td>
              <td class="px-4 py-3 text-slate-600">{{ user.email }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {{ roleLabels[user.role] ?? user.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusLabels[user.status]?.class ?? 'bg-slate-100 text-slate-600'"
                >
                  {{ statusLabels[user.status]?.text ?? user.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="user.status !== 'blocked'"
                    @click="blockMutation.mutate({ id: user.id })"
                    class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Заблокировать
                  </button>
                  <button
                    v-else
                    @click="unblockMutation.mutate({ id: user.id })"
                    class="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-100"
                  >
                    Разблокировать
                  </button>
                  <button
                    @click="openAssign(user.id)"
                    class="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    Назначить программу
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!data?.items?.length">
              <td colspan="5" class="px-4 py-8 text-center text-slate-500">Нет пользователей</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="(data?.total ?? 0) > limit" class="flex items-center justify-between">
        <button
          @click="offset = Math.max(0, offset - limit)"
          :disabled="offset === 0"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Назад
        </button>
        <span class="text-sm text-slate-600">
          {{ offset + 1 }} – {{ Math.min(offset + limit, data?.total ?? 0) }} из {{ data?.total }}
        </span>
        <button
          @click="offset = offset + limit"
          :disabled="offset + limit >= (data?.total ?? 0)"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Вперёд
        </button>
      </div>
    </div>

    <!-- Assign Program Modal -->
    <div
      v-if="showAssignModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showAssignModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-slate-900">Назначить программу</h3>
        <div class="mt-4 space-y-4">
          <select
            v-model="selectedProgramId"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option :value="null">Выберите программу</option>
            <option v-for="p in programsData?.items ?? []" :key="p.id" :value="p.id">
              {{ p.title }}
            </option>
          </select>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="showAssignModal = false"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            @click="handleAssign"
            :disabled="!selectedProgramId || assignMutation.isPending.value"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Назначить
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
