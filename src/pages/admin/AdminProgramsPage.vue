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
  draft: { text: "Черновик", class: "bg-yellow-100 text-yellow-700" },
  published: { text: "Опубликована", class: "bg-green-100 text-green-700" },
  archived: { text: "Архив", class: "bg-slate-100 text-slate-600" },
};
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900">Программы</h1>
        <button
          @click="showCreateModal = true"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + Создать программу
        </button>
      </div>

      <!-- Search -->
      <div class="flex gap-3">
        <input
          v-model="search"
          placeholder="Поиск по названию или коду..."
          class="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <!-- Table -->
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 font-semibold text-slate-700">Название</th>
              <th class="px-4 py-3 font-semibold text-slate-700">Код</th>
              <th class="px-4 py-3 font-semibold text-slate-700">Аудитория</th>
              <th class="px-4 py-3 font-semibold text-slate-700">Версия</th>
              <th class="px-4 py-3 font-semibold text-slate-700">Статус</th>
              <th class="px-4 py-3 font-semibold text-slate-700">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-if="isLoading">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">Загрузка...</td>
            </tr>
            <tr v-else-if="!data?.items?.length">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">Нет программ</td>
            </tr>
            <tr
              v-for="program in data?.items"
              :key="program.id"
              class="hover:bg-slate-50 transition"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-slate-900">{{ program.title }}</div>
                <div class="text-xs text-slate-500">{{ program.slug }}</div>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ program.code }}</td>
              <td class="px-4 py-3 text-slate-600">{{ targetLabels[program.targetAudience] }}</td>
              <td class="px-4 py-3 text-slate-600">
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
                    class="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    Редактировать
                  </button>
                  <button
                    @click="handleDelete(program.id)"
                    class="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
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
        <span class="text-slate-600">
          Показано {{ data.items.length }} из {{ data.total }}
        </span>
        <div class="flex gap-2">
          <button
            @click="offset = Math.max(0, offset - limit)"
            :disabled="offset === 0"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Назад
          </button>
          <button
            @click="offset = offset + limit"
            :disabled="offset + limit >= data.total"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 class="mb-4 text-xl font-bold text-slate-900">Создать программу</h2>
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Название</label>
            <input v-model="newProgram.title" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Slug</label>
              <input v-model="newProgram.slug" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Код</label>
              <input v-model="newProgram.code" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Описание</label>
            <textarea v-model="newProgram.description" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Аудитория</label>
              <select v-model="newProgram.targetAudience" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                <option value="all">Все</option>
                <option value="employee">Сотрудники</option>
                <option value="partner">Партнёры</option>
                <option value="integrator">Интеграторы</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="newProgram.hasCertification" type="checkbox" class="rounded border-slate-300" />
                Есть сертификация
              </label>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="showCreateModal = false"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            @click="handleCreate"
            :disabled="!newProgram.title || !newProgram.slug || !newProgram.code || createMutation.isPending.value"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ createMutation.isPending.value ? "Создание..." : "Создать" }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
