<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const courseId = Number(route.params.id);

const { data: course, isLoading } = useQuery({
  queryKey: ["admin", "course", courseId],
  queryFn: () => trpc.admin.course.getById.query({ id: courseId }),
});

const modulesQuery = useQuery({
  queryKey: ["admin", "modules", "list", courseId],
  queryFn: () => {
    const cvId = course.value?.versions?.[0]?.id;
    if (!cvId) return Promise.resolve({ items: [] });
    return trpc.admin.module.list.query({ courseVersionId: cvId });
  },
  enabled: computed(() => !!course.value?.versions?.[0]?.id),
});

const updateMutation = useMutation({
  mutationFn: trpc.admin.course.update.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });
  },
});

const createModuleMutation = useMutation({
  mutationFn: trpc.admin.module.create.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "modules", "list", courseId] });
    showModuleForm.value = false;
    newModule.value = { title: "", description: "", moduleType: "common", isMandatory: true, isLocked: false };
  },
});

const reorderMutation = useMutation({
  mutationFn: trpc.admin.module.reorder.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "modules", "list", courseId] });
  },
});

const deleteModuleMutation = useMutation({
  mutationFn: trpc.admin.module.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "modules", "list", courseId] });
  },
});

const showModuleForm = ref(false);
const newModule = ref({
  title: "",
  description: "",
  moduleType: "common" as "common" | "employee" | "partner" | "integrator",
  isMandatory: true,
  isLocked: false,
});

const editableCourse = computed(() => ({
  id: courseId,
  slug: course.value?.slug ?? "",
  title: course.value?.title ?? "",
  description: course.value?.description ?? "",
  targetRole: course.value?.targetRole ?? "all",
  isMandatory: course.value?.isMandatory ?? true,
}));

function handleUpdate() {
  updateMutation.mutate(editableCourse.value);
}

function handleCreateModule() {
  const cvId = course.value?.versions?.[0]?.id;
  if (!cvId) return;
  createModuleMutation.mutate({
    courseVersionId: cvId,
    ...newModule.value,
  });
}

function moveModule(index: number, direction: number) {
  const items = modulesQuery.data.value?.items ?? [];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;

  const orderedIds = items.map((m) => m.id);
  const [moved] = orderedIds.splice(index, 1);
  orderedIds.splice(newIndex, 0, moved);

  const cvId = course.value?.versions?.[0]?.id;
  if (!cvId) return;
  reorderMutation.mutate({ courseVersionId: cvId, orderedIds });
}

function handleDeleteModule(id: number) {
  if (confirm("Удалить модуль?")) {
    deleteModuleMutation.mutate({ id });
  }
}

const typeLabels: Record<string, string> = {
  common: "Общий",
  employee: "Сотрудники",
  partner: "Партнёры",
  integrator: "Интеграторы",
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="py-12 text-center text-slate-500">Загрузка...</div>
    <div v-else-if="!course" class="py-12 text-center text-slate-500">Курс не найден</div>
    <div v-else class="mx-auto max-w-5xl space-y-8">
      <div class="flex items-center gap-2 text-sm text-slate-500">
        <button @click="router.push(`/admin/programs/${course.programVersion?.programId}`)" class="hover:text-indigo-600">
          ← Назад к программе
        </button>
      </div>

      <h1 class="text-2xl font-bold text-slate-900">{{ course.title }}</h1>

      <!-- Course Form -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Информация о курсе</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Название</label>
            <input v-model="editableCourse.title" @blur="handleUpdate" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Slug</label>
            <input v-model="editableCourse.slug" @blur="handleUpdate" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-medium text-slate-700">Описание</label>
            <textarea v-model="editableCourse.description" @blur="handleUpdate" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Ролевая ветка</label>
              <select v-model="editableCourse.targetRole" @change="handleUpdate" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                <option value="all">Все</option>
                <option value="employee">Сотрудники</option>
                <option value="partner">Партнёры</option>
                <option value="integrator">Интеграторы</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="editableCourse.isMandatory" @change="handleUpdate" type="checkbox" class="rounded border-slate-300" />
                Обязательный
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Modules -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">Модули</h2>
          <button
            @click="showModuleForm = true"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + Добавить модуль
          </button>
        </div>

        <div v-if="!modulesQuery.data.value?.items?.length" class="py-8 text-center text-slate-500">
          Нет модулей. Добавьте первый модуль.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(mod, index) in modulesQuery.data.value?.items"
            :key="mod.id"
            class="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-indigo-200"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-slate-400">#{{ mod.sortOrder }}</span>
                <h3 class="font-medium text-slate-900">{{ mod.title }}</h3>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {{ typeLabels[mod.moduleType] }}
                </span>
                <span v-if="mod.isMandatory" class="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                  Обязательный
                </span>
                <span v-if="mod.isLocked" class="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600">
                  🔒 Заблокирован
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="moveModule(index, -1)"
                :disabled="index === 0"
                class="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                @click="moveModule(index, 1)"
                :disabled="index === (modulesQuery.data.value?.items?.length ?? 0) - 1"
                class="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                @click="router.push(`/admin/modules/${mod.id}`)"
                class="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
              >
                Редактировать
              </button>
              <button
                @click="handleDeleteModule(mod.id)"
                class="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Module Modal -->
      <div
        v-if="showModuleForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showModuleForm = false"
      >
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-xl font-bold text-slate-900">Добавить модуль</h2>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Название</label>
              <input v-model="newModule.title" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Описание</label>
              <textarea v-model="newModule.description" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Тип</label>
                <select v-model="newModule.moduleType" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                  <option value="common">Общий</option>
                  <option value="employee">Сотрудники</option>
                  <option value="partner">Партнёры</option>
                  <option value="integrator">Интеграторы</option>
                </select>
              </div>
              <div class="flex flex-col justify-end gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-700">
                  <input v-model="newModule.isMandatory" type="checkbox" class="rounded border-slate-300" />
                  Обязательный
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-700">
                  <input v-model="newModule.isLocked" type="checkbox" class="rounded border-slate-300" />
                  Заблокирован
                </label>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="showModuleForm = false" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Отмена
            </button>
            <button
              @click="handleCreateModule"
              :disabled="!newModule.title || createModuleMutation.isPending.value"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ createModuleMutation.isPending.value ? "Создание..." : "Добавить" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
