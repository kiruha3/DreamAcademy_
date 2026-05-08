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
  if (inv.usedAt) return { text: "Использовано", class: "bg-success-light text-success" };
  if (inv.revokedAt) return { text: "Отозвано", class: "bg-danger-light text-danger" };
  if (new Date(inv.expiresAt) < new Date()) return { text: "Просрочено", class: "bg-muted text-text-secondary" };
  return { text: "Активно", class: "bg-info-light text-info" };
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
        <h1 class="text-2xl font-bold text-foreground">Приглашения</h1>
        <button
          @click="showCreateModal = true"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-dark"
        >
          + Создать приглашение
        </button>
      </div>

      <!-- Table -->
      <div class="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-background text-text-secondary">
            <tr>
              <th class="px-4 py-3 text-left font-medium">Email</th>
              <th class="px-4 py-3 text-left font-medium">Роль</th>
              <th class="px-4 py-3 text-left font-medium">Статус</th>
              <th class="px-4 py-3 text-left font-medium">Истекает</th>
              <th class="px-4 py-3 text-left font-medium">Кем создано</th>
              <th class="px-4 py-3 text-left font-medium">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="inv in data?.items ?? []" :key="inv.id" class="hover:bg-background">
              <td class="px-4 py-3 font-medium text-foreground">{{ inv.email }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {{ roleLabels[inv.role] ?? inv.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="getStatus(inv).class">
                  {{ getStatus(inv).text }}
                </span>
              </td>
              <td class="px-4 py-3 text-text-secondary">{{ formatDate(inv.expiresAt) }}</td>
              <td class="px-4 py-3 text-text-secondary">{{ inv.createdByUser?.name ?? "—" }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="!inv.usedAt && !inv.revokedAt"
                    @click="resendMutation.mutate({ id: inv.id })"
                    class="rounded-md bg-accent px-2 py-1 text-xs font-medium text-primary hover:bg-primary-light"
                  >
                    Повторить
                  </button>
                  <button
                    v-if="!inv.usedAt && !inv.revokedAt"
                    @click="revokeMutation.mutate({ id: inv.id })"
                    class="rounded-md bg-danger-light px-2 py-1 text-xs font-medium text-danger hover:bg-danger-light"
                  >
                    Отозвать
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!data?.items?.length">
              <td colspan="6" class="px-4 py-8 text-center text-text-muted">Нет приглашений</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="(data?.total ?? 0) > limit" class="flex items-center justify-between">
        <button
          @click="offset = Math.max(0, offset - limit)"
          :disabled="offset === 0"
          class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Назад
        </button>
        <span class="text-sm text-text-secondary">
          {{ offset + 1 }} – {{ Math.min(offset + limit, data?.total ?? 0) }} из {{ data?.total }}
        </span>
        <button
          @click="offset = offset + limit"
          :disabled="offset + limit >= (data?.total ?? 0)"
          class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
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
      <div class="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-foreground">Создать приглашение</h3>
        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary">Email</label>
            <input
              v-model="newInvitation.email"
              type="email"
              placeholder="user@example.com"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Роль</label>
            <select
              v-model="newInvitation.role"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
            class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
          >
            Отмена
          </button>
          <button
            @click="handleSend"
            :disabled="!newInvitation.email || sendMutation.isPending.value"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-dark disabled:opacity-50"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
