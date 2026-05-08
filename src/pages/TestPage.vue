<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import { ref, computed, onUnmounted, watch } from "vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const assessmentId = Number(route.params.id);

const { data: assessmentData, isLoading } = useQuery({
  queryKey: ["assessment", assessmentId],
  queryFn: () => trpc.assessment.getById.query({ id: assessmentId }),
});

const attemptId = ref<number | null>(null);
const answers = ref<Record<number, number[]>>({});
const timeLeft = ref(0);
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null);
const showResult = ref(false);
const resultData = ref<any>(null);

const assessment = computed(() => assessmentData.value?.assessment);
const questions = computed(() => assessmentData.value?.questions ?? []);

function startTimer(minutes: number) {
  timeLeft.value = minutes * 60;
  timerInterval.value = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      if (timerInterval.value) clearInterval(timerInterval.value);
      handleSubmit();
    }
  }, 1000);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const startMutation = useMutation({
  mutationFn: trpc.assessment.startAttempt.mutate,
  onSuccess: (data) => {
    attemptId.value = data.attemptId;
    if (assessment.value?.timeLimitMinutes) {
      startTimer(assessment.value.timeLimitMinutes);
    }
  },
});

const submitMutation = useMutation({
  mutationFn: trpc.assessment.submit.mutate,
  onSuccess: (data) => {
    showResult.value = true;
    resultData.value = data;
    if (timerInterval.value) clearInterval(timerInterval.value);
  },
});

const resultQuery = useQuery({
  queryKey: ["assessment", "result", attemptId.value],
  queryFn: () =>
    attemptId.value
      ? trpc.assessment.getResult.query({ attemptId: attemptId.value })
      : Promise.resolve(null),
  enabled: () => showResult.value && !!attemptId.value,
});

function handleStart() {
  startMutation.mutate({ assessmentId });
}

function handleSubmit() {
  if (!attemptId.value) return;
  const formattedAnswers = Object.entries(answers.value).map(
    ([questionId, selectedOptionIds]) => ({
      questionId: Number(questionId),
      selectedOptionIds,
    })
  );
  submitMutation.mutate({ attemptId: attemptId.value, answers: formattedAnswers });
}

function toggleOption(questionId: number, optionId: number, questionType: string) {
  if (!answers.value[questionId]) {
    answers.value[questionId] = [];
  }
  const idx = answers.value[questionId].indexOf(optionId);
  if (questionType === "single") {
    answers.value[questionId] = [optionId];
  } else {
    if (idx > -1) {
      answers.value[questionId].splice(idx, 1);
    } else {
      answers.value[questionId].push(optionId);
    }
  }
}

function handleRetake() {
  showResult.value = false;
  resultData.value = null;
  answers.value = {};
  attemptId.value = null;
  startMutation.mutate({ assessmentId });
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
  e.returnValue = "Вы проходите тест. Если вы покинете страницу, попытка будет засчитана.";
}

watch(
  () => ({ hasAttempt: !!attemptId.value, finished: showResult.value }),
  ({ hasAttempt, finished }) => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    if (hasAttempt && !finished) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (timerInterval.value) clearInterval(timerInterval.value);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

const isPassed = computed(() => resultData.value?.isPassed);
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto max-w-3xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-text-muted">Загрузка...</div>
      <div v-else-if="!assessmentData" class="text-center text-text-muted">Тест не найден</div>
      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-foreground">{{ assessment?.title }}</h1>
            <p v-if="assessment?.description" class="mt-1 text-text-secondary">
              {{ assessment.description }}
            </p>
          </div>
          <div v-if="timeLeft > 0" class="rounded-lg bg-muted px-4 py-2 font-mono text-lg">
            {{ formatTime(timeLeft) }}
          </div>
        </div>

        <!-- Start screen -->
        <div
          v-if="!attemptId && !showResult"
          class="rounded-xl border border-border bg-surface p-8 text-center shadow-sm"
        >
          <p class="text-text-secondary">
            Вопросов: {{ questions.length }} • Проходной балл:
            {{ assessment?.passingScore }}% • Попыток: {{ assessment?.maxAttempts }}
          </p>
          <p v-if="assessment?.timeLimitMinutes" class="mt-1 text-text-secondary">
            Лимит времени: {{ assessment.timeLimitMinutes }} мин
          </p>
          <button
            @click="handleStart"
            :disabled="startMutation.isPending.value"
            class="mt-6 rounded-lg bg-primary px-8 py-3 text-base font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
          >
            {{ startMutation.isPending.value ? "Загрузка..." : "Начать тест" }}
          </button>
        </div>

        <!-- Questions -->
        <div v-else-if="attemptId && !showResult" class="space-y-6">
          <div
            v-for="(q, idx) in questions"
            :key="q.id"
            class="rounded-xl border border-border bg-surface p-6 shadow-sm"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-text-muted">Вопрос {{ idx + 1 }}</span>
              <span class="text-xs text-text-muted">{{ q.points }} балл</span>
            </div>
            <p class="mt-2 text-lg font-medium text-foreground">{{ q.questionText }}</p>

            <div class="mt-4 space-y-2">
              <label
                v-for="opt in q.options"
                :key="opt.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition hover:bg-background"
                :class="{
                  'border-primary bg-accent': answers[q.id]?.includes(opt.id),
                }"
              >
                <input
                  :type="q.questionType === 'single' ? 'radio' : 'checkbox'"
                  :name="`question-${q.id}`"
                  :checked="answers[q.id]?.includes(opt.id)"
                  @change="toggleOption(q.id, opt.id, q.questionType)"
                  class="h-4 w-4 text-primary"
                />
                <span class="text-text-secondary">{{ opt.optionText }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="handleSubmit"
              :disabled="submitMutation.isPending.value"
              class="rounded-lg bg-primary px-8 py-3 text-base font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ submitMutation.isPending.value ? "Отправка..." : "Завершить тест" }}
            </button>
          </div>
        </div>

        <!-- Result -->
        <div v-else-if="showResult && resultData" class="rounded-xl border border-border bg-surface p-8 shadow-sm text-center">
          <div
            class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl"
            :class="isPassed ? 'bg-success-light text-success' : 'bg-danger-light text-danger'"
          >
            {{ isPassed ? "✓" : "✕" }}
          </div>
          <h2 class="text-2xl font-bold" :class="isPassed ? 'text-success' : 'text-danger'">
            {{ isPassed ? "Тест пройден!" : "Тест не пройден" }}
          </h2>
          <p class="mt-2 text-lg text-text-secondary">
            Результат: {{ resultData.score }}% ({{ resultData.earnedPoints }} / {{ resultData.maxScore }} баллов)
          </p>
          <p class="text-sm text-text-muted">
            Проходной балл: {{ assessment?.passingScore }}%
          </p>

          <div v-if="assessment?.allowRetake" class="mt-6">
            <button
              @click="handleRetake"
              class="rounded-lg border border-border px-6 py-2 text-sm font-medium text-text-secondary transition hover:bg-background"
            >
              Пересдать
            </button>
          </div>

          <div class="mt-6">
            <button
              @click="router.push('/courses')"
              class="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
            >
              К программам
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
