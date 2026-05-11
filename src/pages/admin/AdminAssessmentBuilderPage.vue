<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const assessmentId = Number(route.params.id);

const { data: assessment, isLoading } = useQuery({
  queryKey: ["admin", "assessment", assessmentId],
  queryFn: () => trpc.admin.assessment.getById.query({ id: assessmentId }),
});

const updateMutation = useMutation({
  mutationFn: trpc.admin.assessment.update.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessment", assessmentId] });
  },
});

const createQuestionMutation = useMutation({
  mutationFn: trpc.admin.question.create.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessment", assessmentId] });
    showQuestionForm.value = false;
    resetQuestionForm();
  },
});

const deleteQuestionMutation = useMutation({
  mutationFn: trpc.admin.question.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessment", assessmentId] });
  },
  onError: (err: any) => {
    alert("Ошибка удаления вопроса: " + (err?.message || "Не удалось удалить вопрос"));
  },
});

const publishMutation = useMutation({
  mutationFn: trpc.admin.assessment.publish.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessment", assessmentId] });
  },
  onError: (err: any) => {
    alert("Ошибка публикации: " + (err?.message || "Не удалось опубликовать тест"));
  },
});

const updateQuestionMutation = useMutation({
  mutationFn: trpc.admin.question.update.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessment", assessmentId] });
    editingQuestionId.value = null;
  },
});

const editingQuestionId = ref<number | null>(null);
const editQuestion = ref({
  id: 0,
  questionText: "",
  questionType: "single" as "single" | "multiple" | "text",
  explanation: "",
  points: 1,
  options: [] as Array<{ optionText: string; isCorrect: boolean }>,
});

function startEdit(q: any) {
  editingQuestionId.value = q.id;
  editQuestion.value = {
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    explanation: q.explanation ?? "",
    points: q.points,
    options: q.answerOptions?.map((o: any) => ({ optionText: o.optionText, isCorrect: o.isCorrect })) ?? [],
  };
}

function handleUpdateQuestion() {
  updateQuestionMutation.mutate({
    id: editQuestion.value.id,
    questionText: editQuestion.value.questionText,
    questionType: editQuestion.value.questionType,
    explanation: editQuestion.value.explanation,
    points: editQuestion.value.points,
    options: editQuestion.value.options,
  });
}

function addEditOption() {
  editQuestion.value.options.push({ optionText: "", isCorrect: false });
}

function removeEditOption(index: number) {
  editQuestion.value.options.splice(index, 1);
}

const showQuestionForm = ref(false);
const newQuestion = ref({
  questionText: "",
  questionType: "single" as "single" | "multiple" | "text",
  explanation: "",
  points: 1,
  options: [
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ],
});

const editableAssessment = computed(() => ({
  id: assessmentId,
  title: assessment.value?.title ?? "",
  description: assessment.value?.description ?? "",
  passingScore: assessment.value?.passingScore ?? 80,
  maxAttempts: assessment.value?.maxAttempts ?? 2,
  timeLimitMinutes: assessment.value?.timeLimitMinutes ?? undefined,
  showCorrectAnswers: assessment.value?.showCorrectAnswers ?? true,
  allowRetake: assessment.value?.allowRetake ?? false,
}));

function handleUpdate() {
  updateMutation.mutate(editableAssessment.value);
}

function addOption() {
  newQuestion.value.options.push({ optionText: "", isCorrect: false });
}

function removeOption(index: number) {
  newQuestion.value.options.splice(index, 1);
}

function handleCreateQuestion() {
  const avId = assessment.value?.versions?.[0]?.id;
  if (!avId) return;
  createQuestionMutation.mutate({
    assessmentVersionId: avId,
    ...newQuestion.value,
  });
}

function handleDeleteQuestion(id: number) {
  if (confirm("Удалить вопрос?")) {
    deleteQuestionMutation.mutate({ id });
  }
}

function resetQuestionForm() {
  newQuestion.value = {
    questionText: "",
    questionType: "single",
    explanation: "",
    points: 1,
    options: [
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
    ],
  };
}

const typeLabels: Record<string, string> = {
  single: "Один ответ",
  multiple: "Несколько ответов",
  text: "Текстовый ответ",
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="py-12 text-center text-text-muted">Загрузка...</div>
    <div v-else-if="!assessment" class="py-12 text-center text-text-muted">Тест не найден</div>
    <div v-else class="mx-auto max-w-5xl space-y-8">
      <div class="flex items-center gap-2 text-sm text-text-muted">
        <button @click="router.back()" class="hover:text-primary">
          ← Назад
        </button>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-bold text-foreground">{{ assessment.title }}</h1>
        <button
          v-if="assessment.versions?.[0]?.status !== 'published'"
          @click="publishMutation.mutate({ id: assessmentId })"
          :disabled="publishMutation.isPending.value"
          class="rounded-lg bg-success px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-[#16A34A] disabled:opacity-50"
        >
          {{ publishMutation.isPending.value ? "Публикация..." : "Опубликовать" }}
        </button>
        <span v-else class="rounded-full bg-success-light px-3 py-1 text-sm font-medium text-success">
          Опубликовано
        </span>
      </div>

      <!-- Assessment Form -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-foreground">Настройки теста</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
            <input v-model="editableAssessment.title" @blur="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Проходной балл (%)</label>
              <input v-model.number="editableAssessment.passingScore" @blur="handleUpdate" type="number" min="0" max="100" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Попыток</label>
              <input v-model.number="editableAssessment.maxAttempts" @blur="handleUpdate" type="number" min="1" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
            <textarea v-model="editableAssessment.description" @blur="handleUpdate" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-3 gap-4 sm:col-span-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Лимит времени (мин)</label>
              <input v-model.number="editableAssessment.timeLimitMinutes" @blur="handleUpdate" type="number" min="1" placeholder="Без ограничения" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="editableAssessment.showCorrectAnswers" @change="handleUpdate" type="checkbox" class="rounded border-border" />
                Показывать правильные
              </label>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="editableAssessment.allowRetake" @change="handleUpdate" type="checkbox" class="rounded border-border" />
                Разрешить пересдачу
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Questions -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-lg font-semibold text-foreground">Вопросы ({{ assessment.questions?.length ?? 0 }})</h2>
          <button
            @click="showQuestionForm = true"
            class="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          >
            + Добавить вопрос
          </button>
        </div>

        <div v-if="!assessment.questions?.length" class="py-8 text-center text-text-muted">
          Нет вопросов. Добавьте первый вопрос.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(q, idx) in assessment.questions"
            :key="q.id"
            class="rounded-lg border border-border p-4"
          >
            <!-- View mode -->
            <div v-if="editingQuestionId !== q.id" class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-text-muted">#{{ idx + 1 }}</span>
                  <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
                    {{ typeLabels[q.questionType] }}
                  </span>
                  <span class="text-xs text-text-muted">{{ q.points }} балл</span>
                </div>
                <p class="mt-2 text-foreground">{{ q.questionText }}</p>
                <div v-if="q.explanation" class="mt-1 text-sm text-text-muted">
                  Пояснение: {{ q.explanation }}
                </div>
                <div class="mt-3 space-y-1">
                  <div
                    v-for="opt in q.answerOptions"
                    :key="opt.id"
                    :class="['flex items-center gap-2 text-sm', opt.isCorrect ? 'font-medium text-success' : 'text-text-secondary']"
                  >
                    <span>{{ opt.isCorrect ? '✓' : '○' }}</span>
                    {{ opt.optionText }}
                  </div>
                </div>
              </div>
              <div class="ml-4 flex items-center gap-2">
                <button
                  @click="startEdit(q)"
                  class="rounded-md bg-accent px-3 py-1 text-xs font-medium text-primary-dark transition hover:bg-primary-light"
                >
                  Редактировать
                </button>
                <button
                  @click="handleDeleteQuestion(q.id)"
                  class="rounded-md bg-danger-light px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger-light"
                >
                  Удалить
                </button>
              </div>
            </div>

            <!-- Edit mode -->
            <div v-else class="space-y-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Текст вопроса</label>
                <textarea v-model="editQuestion.questionText" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-secondary">Тип</label>
                  <select v-model="editQuestion.questionType" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    <option value="single">Один ответ</option>
                    <option value="multiple">Несколько ответов</option>
                    <option value="text">Текстовый ответ</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-text-secondary">Баллов</label>
                  <input v-model.number="editQuestion.points" type="number" min="1" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Пояснение</label>
                <input v-model="editQuestion.explanation" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div v-if="editQuestion.questionType !== 'text'">
                <div class="mb-2 flex items-center justify-between">
                  <label class="text-sm font-medium text-text-secondary">Варианты ответа</label>
                  <button @click="addEditOption" class="text-xs font-medium text-primary hover:text-primary-dark">+ Добавить вариант</button>
                </div>
                <div class="space-y-2">
                  <div v-for="(opt, idx) in editQuestion.options" :key="idx" class="flex items-center gap-3">
                    <input v-model="opt.optionText" :placeholder="`Вариант ${idx + 1}`" class="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    <label class="flex items-center gap-1 text-sm text-text-secondary whitespace-nowrap">
                      <input v-model="opt.isCorrect" type="checkbox" class="rounded border-border" />
                      Верный
                    </label>
                    <button v-if="editQuestion.options.length > 1" @click="removeEditOption(idx)" class="text-text-muted hover:text-danger">✕</button>
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-3">
                <button @click="editingQuestionId = null" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background">Отмена</button>
                <button
                  @click="handleUpdateQuestion"
                  :disabled="!editQuestion.questionText || updateQuestionMutation.isPending.value"
                  class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
                >
                  {{ updateQuestionMutation.isPending.value ? "Сохранение..." : "Сохранить" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Question Modal -->
      <div
        v-if="showQuestionForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showQuestionForm = false"
      >
        <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
          <h2 class="mb-4 text-xl font-bold text-foreground">Добавить вопрос</h2>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Текст вопроса</label>
              <textarea v-model="newQuestion.questionText" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Тип</label>
                <select v-model="newQuestion.questionType" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="single">Один ответ</option>
                  <option value="multiple">Несколько ответов</option>
                  <option value="text">Текстовый ответ</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Баллов</label>
                <input v-model.number="newQuestion.points" type="number" min="1" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Пояснение</label>
              <input v-model="newQuestion.explanation" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>

            <!-- Options (only for single/multiple) -->
            <div v-if="newQuestion.questionType !== 'text'">
              <div class="mb-2 flex items-center justify-between">
                <label class="text-sm font-medium text-text-secondary">Варианты ответа</label>
                <button @click="addOption" class="text-xs font-medium text-primary hover:text-primary-dark">
                  + Добавить вариант
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(opt, idx) in newQuestion.options"
                  :key="idx"
                  class="flex items-center gap-3"
                >
                  <input
                    v-model="opt.optionText"
                    :placeholder="`Вариант ${idx + 1}`"
                    class="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <label class="flex items-center gap-1 text-sm text-text-secondary whitespace-nowrap">
                    <input v-model="opt.isCorrect" type="checkbox" class="rounded border-border" />
                    Верный
                  </label>
                  <button
                    v-if="newQuestion.options.length > 1"
                    @click="removeOption(idx)"
                    class="text-text-muted hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="showQuestionForm = false" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background">
              Отмена
            </button>
            <button
              @click="handleCreateQuestion"
              :disabled="!newQuestion.questionText || createQuestionMutation.isPending.value"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ createQuestionMutation.isPending.value ? "Создание..." : "Добавить" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
