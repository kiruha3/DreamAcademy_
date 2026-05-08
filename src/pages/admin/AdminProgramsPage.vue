<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const router = useRouter();
const queryClient = useQueryClient();

const search = ref("");
const limit = ref(20);
const offset = ref(0);
const showCreateModal = ref(false);

const newProgram = ref({
  slug: "",
  code: "",
  title: "",
  description: "",
  targetAudience: "all" as "all" | "employee" | "partner" | "integrator",
  hasCertification: false,
});

const { data, isLoading } = useQuery({
  queryKey: ["admin", "programs", "list", search.value, offset.value],
  queryFn: () =>
    trpc.admin.program.list.query({
      search: search.value || undefined,
      limit: limit.value,
      offset: offset.value,
    }),
});

watch([search, offset], () => {
  queryClient.invalidateQueries({ queryKey: ["admin", "programs", "list"] });
});

const createMutation = useMutation({
  mutationFn: trpc.admin.program.create.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "programs", "list"] });
    showCreateModal.value = false;
    newProgram.value = { slug: "", code: "", title: "", description: "", targetAudience: "all", hasCertification: false };
  },
});

const deleteMutation = useMutation({
  mutationFn: trpc.admin.program.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "programs", "list"] });
  },
});

function handleCreate() {
  createMutation.mutate(newProgram.value);
}

function handleDelete(id: number) {
  if (confirm("Удалить программу? Это действие нельзя отменить.")) {
    deleteMutation.mutate({ id });
  }
}

const targetLabels: Record<string, string> = {
  all: "Все",
  employee: "Сотрудники",
  partner: "Партнёры",
  integrator: "Интеграторы",
};

const statusLabels: Record<string, { text: string; class: string }> = {
  draft: { text: "Черновик", class: "bg-warning-light text-warning" },
  published: { text: "Опубликована", class: "bg-success-light text-success" },
  archived: { text: "Архив", class: "bg-muted text-text-secondary" },
};
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-foreground">Программы</h1>
        <button
          @click="showCreateModal = true"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
        >
          + Создать программу
        </button>
      </div>

      <!-- Search -->
      <div class="flex gap-3">
        <input
          v-model="search"
          placeholder="Поиск по названию или коду..."
          class="w-full max-w-md rounded-lg border border-border px-4 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <!-- Table -->
      <div class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <table class="w-full text-left text-sm">
          <thead class="bg-background">
            <tr>
              <th class="px-4 py-3 font-semibold text-text-secondary">Название</th>
              <th class="px-4 py-3 font-semibold text-text-secondary">Код</th>
              <th class="px-4 py-3 font-semibold text-text-secondary">Аудитория</th>
              <th class="px-4 py-3 font-semibold text-text-secondary">Версия</th>
              <th class="px-4 py-3 font-semibold text-text-secondary">Статус</th>
              <th class="px-4 py-3 font-semibold text-text-secondary">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-if="isLoading">
              <td colspan="6" class="px-4 py-8 text-center text-text-muted">Загрузка...</td>
            </tr>
            <tr v-else-if="!data?.items?.length">
              <td colspan="6" class="px-4 py-8 text-center text-text-muted">Нет программ</td>
            </tr>
            <tr
              v-for="program in data?.items"
              :key="program.id"
              class="hover:bg-background transition"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-foreground">{{ program.title }}</div>
                <div class="text-xs text-text-muted">{{ program.slug }}</div>
              </td>
              <td class="px-4 py-3 text-text-secondary">{{ program.code }}</td>
              <td class="px-4 py-3 text-text-secondary">{{ targetLabels[program.targetAudience] }}</td>
              <td class="px-4 py-3 text-text-secondary">
                {{ program.versions?.[0]?.versionNumber ?? "—" }}
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="program.versions?.[0]"
                  :class="[
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusLabels[program.versions[0].status]?.class,
                  ]"
                >
                  {{ statusLabels[program.versions[0].status]?.text }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    @click="router.push(`/admin/programs/${program.id}`)"
                    class="rounded-md bg-accent px-3 py-1 text-xs font-medium text-primary-dark transition hover:bg-primary-light"
                  >
                    Редактировать
                  </button>
                  <button
                    @click="handleDelete(program.id)"
                    class="rounded-md bg-danger-light px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger-light"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="data && data.total > 0" class="flex items-center justify-between text-sm">
        <span class="text-text-secondary">
          Показано {{ data.items.length }} из {{ data.total }}
        </span>
        <div class="flex gap-2">
          <button
            @click="offset = Math.max(0, offset - limit)"
            :disabled="offset === 0"
            class="rounded-lg border border-border px-3 py-1.5 text-text-secondary transition hover:bg-background disabled:opacity-50"
          >
            Назад
          </button>
          <button
            @click="offset = offset + limit"
            :disabled="offset + limit >= data.total"
            class="rounded-lg border border-border px-3 py-1.5 text-text-secondary transition hover:bg-background disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showCreateModal = false"
    >
      <div class="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <h2 class="mb-4 text-xl font-bold text-foreground">Создать программу</h2>
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
            <input v-model="newProgram.title" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Slug</label>
              <input v-model="newProgram.slug" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Код</label>
              <input v-model="newProgram.code" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
            <textarea v-model="newProgram.description" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Аудитория</label>
              <select v-model="newProgram.targetAudience" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="all">Все</option>
                <option value="employee">Сотрудники</option>
                <option value="partner">Партнёры</option>
                <option value="integrator">Интеграторы</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="newProgram.hasCertification" type="checkbox" class="rounded border-border" />
                Есть сертификация
              </label>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="showCreateModal = false"
            class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background"
          >
            Отмена
          </button>
          <button
            @click="handleCreate"
            :disabled="!newProgram.title || !newProgram.slug || !newProgram.code || createMutation.isPending.value"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
          >
            {{ createMutation.isPending.value ? "Создание..." : "Создать" }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
