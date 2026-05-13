<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/composables/useToast";
import AdminLayout from "@/components/AdminLayout.vue";

const queryClient = useQueryClient();
const { error: toastError, success: toastSuccess } = useToast();
const search = ref("");
const roleFilter = ref<"" | "user" | "employee" | "partner" | "integrator" | "admin" | "superadmin">("");
const limit = ref(20);
const offset = ref(0);
const showAssignModal = ref(false);
const selectedUserId = ref<number | null>(null);
const selectedProgramId = ref<number | null>(null);

const showCreateModal = ref(false);
const newUser = ref({ name: '', email: '', password: '', role: 'employee' as const });

const showEditModal = ref(false);
const editUser = ref<{ id: number; name: string; email: string; role: string; password: string }>({
  id: 0, name: '', email: '', role: 'employee', password: ''
});

function openEdit(user: any) {
  editUser.value = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    password: '',
  };
  showEditModal.value = true;
}

function handleUpdate() {
  const payload: any = { id: editUser.value.id };
  if (editUser.value.name) payload.name = editUser.value.name;
  if (editUser.value.email) payload.email = editUser.value.email;
  if (editUser.value.role) payload.role = editUser.value.role;
  if (editUser.value.password) payload.password = editUser.value.password;
  updateMutation.mutate(payload);
}

function handleDelete(userId: number, userName: string) {
  if (confirm('Удалить пользователя ' + userName + '?')) {
    deleteMutation.mutate({ id: userId });
  }
}

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

const createMutation = useMutation({
  mutationFn: trpc.admin.user.create.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'list'] });
    showCreateModal.value = false;
    newUser.value = { name: '', email: '', password: '', role: 'employee' };
    toastSuccess('Пользователь создан');
  },
  onError: (err: any) => {
    toastError('Ошибка создания', err?.message || 'Не удалось создать пользователя');
  },
});

const updateMutation = useMutation({
  mutationFn: trpc.admin.user.update.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'list'] });
    showEditModal.value = false;
    editUser.value = { id: 0, name: '', email: '', role: 'employee', password: '' };
    toastSuccess('Изменения сохранены');
  },
  onError: (err: any) => {
    toastError('Ошибка сохранения', err?.message || 'Не удалось обновить пользователя');
  },
});

const deleteMutation = useMutation({
  mutationFn: trpc.admin.user.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'list'] });
    toastSuccess('Пользователь удалён');
  },
  onError: (err: any) => {
    toastError('Ошибка удаления', err?.message || 'Не удалось удалить пользователя');
  },
});

function handleCreate() {
  if (newUser.value.name && newUser.value.email && newUser.value.password) {
    createMutation.mutate({ ...newUser.value });
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
  active: { text: "Активен", class: "bg-success-light text-success" },
  blocked: { text: "Заблокирован", class: "bg-danger-light text-danger" },
  pending: { text: "Ожидает", class: "bg-warning-light text-warning" },
};
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-bold text-foreground">Пользователи</h1>
        <button
          @click="showCreateModal = true"
          class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-dark sm:w-auto"
        >
          + Создать пользователя
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <input
          v-model="search"
          placeholder="Поиск по имени или email..."
          class="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <select
          v-model="roleFilter"
          class="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Все роли</option>
          <option value="employee">Сотрудник</option>
          <option value="partner">Партнёр</option>
          <option value="integrator">Интегратор</option>
          <option value="admin">Админ</option>
          <option value="superadmin">Суперадмин</option>
        </select>
      </div>

      <!-- Desktop Table -->
      <div class="hidden md:block rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-background text-text-secondary">
            <tr>
              <th class="px-4 py-3 text-left font-medium">Имя</th>
              <th class="px-4 py-3 text-left font-medium">Email</th>
              <th class="px-4 py-3 text-left font-medium">Роль</th>
              <th class="px-4 py-3 text-left font-medium">Статус</th>
              <th class="px-4 py-3 text-left font-medium">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="user in data?.items ?? []" :key="user.id" class="hover:bg-background">
              <td class="px-4 py-3 font-medium text-foreground">{{ user.name }}</td>
              <td class="px-4 py-3 text-text-secondary">{{ user.email }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {{ roleLabels[user.role] ?? user.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="statusLabels[user.status]?.class ?? 'bg-muted text-text-secondary'"
                >
                  {{ statusLabels[user.status]?.text ?? user.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="user.status !== 'blocked'"
                    @click="blockMutation.mutate({ id: user.id })"
                    class="rounded-md bg-danger-light px-2 py-1 text-xs font-medium text-danger hover:bg-danger-light"
                  >
                    Заблокировать
                  </button>
                  <button
                    v-else
                    @click="unblockMutation.mutate({ id: user.id })"
                    class="rounded-md bg-success-light px-2 py-1 text-xs font-medium text-success hover:bg-success-light"
                  >
                    Разблокировать
                  </button>
                  <button
                    @click="openEdit(user)"
                    class="rounded-md bg-primary-light px-2 py-1 text-xs font-medium text-primary hover:bg-primary"
                  >
                    Редактировать
                  </button>
                  <button
                    @click="handleDelete(user.id, user.name)"
                    class="rounded-md bg-danger-light px-2 py-1 text-xs font-medium text-danger hover:bg-danger"
                  >
                    Удалить
                  </button>
                  <button
                    @click="openAssign(user.id)"
                    class="rounded-md bg-accent px-2 py-1 text-xs font-medium text-primary hover:bg-primary-light"
                  >
                    Назначить программу
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!data?.items?.length">
              <td colspan="5" class="px-4 py-8 text-center text-text-muted">Нет пользователей</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden space-y-3">
        <div
          v-for="user in data?.items ?? []"
          :key="user.id"
          class="rounded-xl border border-border bg-surface p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-medium text-foreground">{{ user.name }}</div>
              <div class="text-sm text-text-secondary">{{ user.email }}</div>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="statusLabels[user.status]?.class ?? 'bg-muted text-text-secondary'"
            >
              {{ statusLabels[user.status]?.text ?? user.status }}
            </span>
          </div>
          <div class="mt-2">
            <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
              {{ roleLabels[user.role] ?? user.role }}
            </span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-if="user.status !== 'blocked'"
              @click="blockMutation.mutate({ id: user.id })"
              class="rounded-md bg-danger-light px-3 py-1.5 text-xs font-medium text-danger"
            >
              Заблокировать
            </button>
            <button
              v-else
              @click="unblockMutation.mutate({ id: user.id })"
              class="rounded-md bg-success-light px-3 py-1.5 text-xs font-medium text-success"
            >
              Разблокировать
            </button>
            <button
              @click="openEdit(user)"
              class="rounded-md bg-primary-light px-3 py-1.5 text-xs font-medium text-primary"
            >
              Редактировать
            </button>
            <button
              @click="handleDelete(user.id, user.name)"
              class="rounded-md bg-danger-light px-3 py-1.5 text-xs font-medium text-danger"
            >
              Удалить
            </button>
            <button
              @click="openAssign(user.id)"
              class="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-primary"
            >
              Назначить программу
            </button>
          </div>
        </div>
        <div v-if="!data?.items?.length" class="rounded-xl border border-border bg-surface p-8 text-center text-text-muted">
          Нет пользователей
        </div>
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

    <!-- Assign Program Modal -->
    <div
      v-if="showAssignModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showAssignModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-foreground">Назначить программу</h3>
        <div class="mt-4 space-y-4">
          <select
            v-model="selectedProgramId"
            class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
            class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
          >
            Отмена
          </button>
          <button
            @click="handleAssign"
            :disabled="!selectedProgramId || assignMutation.isPending.value"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-dark disabled:opacity-50"
          >
            Назначить
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showEditModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-foreground">Редактировать пользователя</h3>
        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary">Имя</label>
            <input
              v-model="editUser.name"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Email</label>
            <input
              v-model="editUser.email"
              type="email"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Новый пароль (оставьте пустым, чтобы не менять)</label>
            <input
              v-model="editUser.password"
              type="password"
              placeholder="Не изменять"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Роль</label>
            <select
              v-model="editUser.role"
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
            @click="showEditModal = false"
            class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
          >
            Отмена
          </button>
          <button
            @click="handleUpdate"
            :disabled="!editUser.name || !editUser.email || updateMutation.isPending.value"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-dark disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>

    <!-- Create User Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showCreateModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-foreground">Создать пользователя</h3>
        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary">Имя</label>
            <input
              v-model="newUser.name"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Email</label>
            <input
              v-model="newUser.email"
              type="email"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Пароль</label>
            <input
              v-model="newUser.password"
              type="password"
              class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary">Роль</label>
            <select
              v-model="newUser.role"
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
            @click="handleCreate"
            :disabled="!newUser.name || !newUser.email || !newUser.password || createMutation.isPending.value"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-dark disabled:opacity-50"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
