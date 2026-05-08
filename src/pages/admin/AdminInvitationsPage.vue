<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const queryClient = useQueryClient();
const limit = ref(20);
const offset = ref(0);
const showCreateModal = ref(false);

const newInvitation = ref({
  email: "",
  role: "employee" as "user" | "employee" | "partner" | "integrator" | "admin" | "superadmin",
});

const { data, isLoading } = useQuery({
  queryKey: ["admin", "invitations", "list", offset.value],
  queryFn: () =>
    trpc.admin.invitation.list.query({
      limit: limit.value,
      offset: offset.value,
    }),
});

watch([offset], () => {
  queryClient.invalidateQueries({ queryKey: ["admin", "invitations", "list"] });
});

const sendMutation = useMutation({
  mutationFn: trpc.admin.invitation.send.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "invitations", "list"] });
    showCreateModal.value = false;
    newInvitation.value = { email: "", role: "employee" };
  },
});

const resendMutation = useMutation({
  mutationFn: trpc.admin.invitation.resend.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "invitations", "list"] });
  },
});

const revokeMutation = useMutation({
  mutationFn: trpc.admin.invitation.revoke.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "invitations", "list"] });
  },
});

function handleSend() {
  sendMutation.mutate(newInvitation.value);
}

function getStatus(inv: any) {
  if (inv.usedAt) return { text: "Использовано", class: "bg-green-100 text-green-700" };
  if (inv.revokedAt) return { text: "Отозвано", class: "bg-red-100 text-red-700" };
  if (new Date(inv.expiresAt) < new Date()) return { text: "Просрочено", class: "bg-slate-100 text-slate-600" };
  return { text: "Активно", class: "bg-blue-100 text-blue-700" };
}

const roleLabels: Record<string, string> = {
  user: "Пользователь",
  employee: "Сотрудник",
  partner: "Партнёр",
  integrator: "Интегратор",
  admin: "Админ",
  superadmin: "Суперадмин",
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU");
}
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900">Приглашения</h1>
        <button
          @click="showCreateModal = true"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Создать приглашение
        </button>
      </div>

      <!-- Table -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 text-left font-medium">Email</th>
              <th class="px-4 py-3 text-left font-medium">Роль</th>
              <th class="px-4 py-3 text-left font-medium">Статус</th>
              <th class="px-4 py-3 text-left font-medium">Истекает</th>
              <th class="px-4 py-3 text-left font-medium">Кем создано</th>
              <th class="px-4 py-3 text-left font-medium">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="inv in data?.items ?? []" :key="inv.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">{{ inv.email }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {{ roleLabels[inv.role] ?? inv.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="getStatus(inv).class">
                  {{ getStatus(inv).text }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ formatDate(inv.expiresAt) }}</td>
              <td class="px-4 py-3 text-slate-600">{{ inv.createdByUser?.name ?? "—" }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="!inv.usedAt && !inv.revokedAt"
                    @click="resendMutation.mutate({ id: inv.id })"
                    class="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    Повторить
                  </button>
                  <button
                    v-if="!inv.usedAt && !inv.revokedAt"
                    @click="revokeMutation.mutate({ id: inv.id })"
                    class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Отозвать
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!data?.items?.length">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">Нет приглашений</td>
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

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showCreateModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-slate-900">Создать приглашение</h3>
        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Email</label>
            <input
              v-model="newInvitation.email"
              type="email"
              placeholder="user@example.com"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Роль</label>
            <select
              v-model="newInvitation.role"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="employee">Сотрудник</option>
              <option value="partner">Партнёр</option>
              <option value="integrator">Интегратор</option>
              <option value="admin">Админ</option>
            </select>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="showCreateModal = false"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            @click="handleSend"
            :disabled="!newInvitation.email || sendMutation.isPending.value"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
