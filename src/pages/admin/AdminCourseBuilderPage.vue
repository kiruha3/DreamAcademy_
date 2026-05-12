<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";
import Icon from "@/components/Icon.vue";

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
  onError: (err: any) => {
    alert("Ошибка удаления модуля: " + (err?.message || "Не удалось удалить модуль"));
  },
});

const assessmentsQuery = useQuery({
  queryKey: ["admin", "assessments", "course", courseId],
  queryFn: () => {
    const cvId = course.value?.versions?.[0]?.id;
    if (!cvId) return Promise.resolve({ items: [] });
    return trpc.admin.assessment.list.query({ courseVersionId: cvId });
  },
  enabled: computed(() => !!course.value?.versions?.[0]?.id),
});

const createAssessmentMutation = useMutation({
  mutationFn: trpc.admin.assessment.create.mutate,
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessments", "course", courseId] });
    showAssessmentForm.value = false;
    resetAssessmentForm();
    router.push(`/admin/assessments/${data.id}`);
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

const showAssessmentForm = ref(false);
const newAssessment = ref({
  title: "",
  description: "",
  assessmentType: "final" as "mini_test" | "final" | "certification",
  passingScore: 80,
  maxAttempts: 2,
  timeLimitMinutes: undefined as number | undefined,
  showCorrectAnswers: true,
  allowRetake: false,
});

function handleCreateAssessment() {
  const cvId = course.value?.versions?.[0]?.id;
  if (!cvId) return;
  createAssessmentMutation.mutate({
    courseVersionId: cvId,
    ...newAssessment.value,
    timeLimitMinutes: newAssessment.value.timeLimitMinutes || undefined,
  });
}

function resetAssessmentForm() {
  newAssessment.value = {
    title: "",
    description: "",
    assessmentType: "final",
    passingScore: 80,
    maxAttempts: 2,
    timeLimitMinutes: undefined,
    showCorrectAnswers: true,
    allowRetake: false,
  };
}

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

const deleteAssessmentMutation = useMutation({
  mutationFn: trpc.admin.assessment.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessments", "course", courseId] });
  },
  onError: (err: any) => {
    alert("Ошибка удаления теста: " + (err?.message || "Не удалось удалить тест"));
  },
});

function handleDeleteAssessment(id: number) {
  if (confirm("Удалить тест?")) {
    deleteAssessmentMutation.mutate({ id });
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
    <div v-if="isLoading" class="py-12 text-center text-text-muted">Загрузка...</div>
    <div v-else-if="!course" class="py-12 text-center text-text-muted">Курс не найден</div>
    <div v-else class="mx-auto max-w-5xl space-y-8">
      <div class="flex items-center gap-2 text-sm text-text-muted">
        <button @click="router.push(`/admin/programs/${course.programVersion?.programId}`)" class="hover:text-primary">
          <Icon name="ArrowLeft" /> Назад к программе
        </button>
      </div>

      <h1 class="text-2xl font-bold text-foreground">{{ course.title }}</h1>

      <!-- Course Form -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-foreground">Информация о курсе</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
            <input v-model="editableCourse.title" @blur="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text-secondary">Slug</label>
            <input v-model="editableCourse.slug" @blur="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
            <textarea v-model="editableCourse.description" @blur="handleUpdate" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Ролевая ветка</label>
              <select v-model="editableCourse.targetRole" @change="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="all">Все</option>
                <option value="employee">Сотрудники</option>
                <option value="partner">Партнёры</option>
                <option value="integrator">Интеграторы</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="editableCourse.isMandatory" @change="handleUpdate" type="checkbox" class="rounded border-border" />
                Обязательный
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Assessments -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-lg font-semibold text-foreground">Тесты курса</h2>
          <button
            @click="showAssessmentForm = true"
            class="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          >
            + Добавить тест
          </button>
        </div>

        <div v-if="!assessmentsQuery.data.value?.items?.length" class="py-8 text-center text-text-muted">
          Нет тестов. Добавьте первый тест.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="a in assessmentsQuery.data.value?.items"
            :key="a.id"
            class="flex flex-col gap-3 rounded-lg border border-border p-4 transition hover:border-primary-light sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <h3 class="font-medium text-foreground">{{ a.title }}</h3>
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
                  {{ a.assessmentType === 'mini_test' ? 'Мини-тест' : a.assessmentType === 'final' ? 'Финальный' : 'Сертификация' }}
                </span>
                <span v-if="a.versions?.[0]?.status === 'published'" class="rounded-full bg-success-light px-2 py-0.5 text-xs text-success">
                  Опубликован
                </span>
                <span v-else class="rounded-full bg-warning-light px-2 py-0.5 text-xs text-warning">
                  Черновик
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="router.push(`/admin/assessments/${a.id}`)"
                class="rounded-md bg-accent px-3 py-1 text-xs font-medium text-primary-dark transition hover:bg-primary-light"
              >
                Редактировать
              </button>
              <button
                @click="handleDeleteAssessment(a.id)"
                class="rounded-md bg-danger-light px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger-light"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modules -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-lg font-semibold text-foreground">Модули</h2>
          <button
            @click="showModuleForm = true"
            class="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          >
            + Добавить модуль
          </button>
        </div>

        <div v-if="!modulesQuery.data.value?.items?.length" class="py-8 text-center text-text-muted">
          Нет модулей. Добавьте первый модуль.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(mod, index) in modulesQuery.data.value?.items"
            :key="mod.id"
            data-testid="module-item"
            class="flex flex-col gap-3 rounded-lg border border-border p-4 transition hover:border-primary-light sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <span class="text-sm font-medium text-text-muted">#{{ mod.sortOrder }}</span>
                <h3 class="font-medium text-foreground">{{ mod.title }}</h3>
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
                  {{ typeLabels[mod.moduleType] }}
                </span>
                <span v-if="mod.isMandatory" class="rounded-full bg-danger-light px-2 py-0.5 text-xs text-danger">
                  Обязательный
                </span>
                <span v-if="mod.isLocked" class="rounded-full bg-warning-light px-2 py-0.5 text-xs text-warning">
                  <Icon name="Lock" /> Заблокирован
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="moveModule(index, -1)"
                :disabled="index === 0"
                class="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:bg-background disabled:opacity-30"
                data-testid="reorder-up"
              >
                <Icon name="ArrowUp" />
              </button>
              <button
                @click="moveModule(index, 1)"
                :disabled="index === (modulesQuery.data.value?.items?.length ?? 0) - 1"
                class="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:bg-background disabled:opacity-30"
                data-testid="reorder-down"
              >
                <Icon name="ArrowDown" />
              </button>
              <button
                @click="router.push(`/admin/modules/${mod.id}`)"
                class="rounded-md bg-accent px-3 py-1 text-xs font-medium text-primary-dark transition hover:bg-primary-light"
              >
                Редактировать
              </button>
              <button
                @click="handleDeleteModule(mod.id)"
                class="rounded-md bg-danger-light px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger-light"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Assessment Modal -->
      <div
        v-if="showAssessmentForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showAssessmentForm = false"
      >
        <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
          <h2 class="mb-4 text-xl font-bold text-foreground">Добавить тест</h2>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
              <input v-model="newAssessment.title" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
              <textarea v-model="newAssessment.description" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Тип</label>
                <select v-model="newAssessment.assessmentType" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="mini_test">Мини-тест</option>
                  <option value="final">Финальный</option>
                  <option value="certification">Сертификация</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Проходной балл (%)</label>
                <input v-model.number="newAssessment.passingScore" type="number" min="0" max="100" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Попыток</label>
                <input v-model.number="newAssessment.maxAttempts" type="number" min="1" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Лимит времени (мин)</label>
                <input v-model.number="newAssessment.timeLimitMinutes" type="number" min="1" placeholder="Без ограничения" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div class="flex gap-6">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="newAssessment.showCorrectAnswers" type="checkbox" class="rounded border-border" />
                Показывать правильные
              </label>
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="newAssessment.allowRetake" type="checkbox" class="rounded border-border" />
                Разрешить пересдачу
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="showAssessmentForm = false" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background">
              Отмена
            </button>
            <button
              @click="handleCreateAssessment"
              :disabled="!newAssessment.title || createAssessmentMutation.isPending.value"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ createAssessmentMutation.isPending.value ? "Создание..." : "Добавить" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Add Module Modal -->
      <div
        v-if="showModuleForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showModuleForm = false"
      >
        <div class="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
          <h2 class="mb-4 text-xl font-bold text-foreground">Добавить модуль</h2>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
              <input v-model="newModule.title" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
              <textarea v-model="newModule.description" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Тип</label>
                <select v-model="newModule.moduleType" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="common">Общий</option>
                  <option value="employee">Сотрудники</option>
                  <option value="partner">Партнёры</option>
                  <option value="integrator">Интеграторы</option>
                </select>
              </div>
              <div class="flex flex-col justify-end gap-2">
                <label class="flex items-center gap-2 text-sm text-text-secondary">
                  <input v-model="newModule.isMandatory" type="checkbox" class="rounded border-border" />
                  Обязательный
                </label>
                <label class="flex items-center gap-2 text-sm text-text-secondary">
                  <input v-model="newModule.isLocked" type="checkbox" class="rounded border-border" />
                  Заблокирован
                </label>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="showModuleForm = false" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background">
              Отмена
            </button>
            <button
              @click="handleCreateModule"
              :disabled="!newModule.title || createModuleMutation.isPending.value"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ createModuleMutation.isPending.value ? "Создание..." : "Добавить" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
