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
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto max-w-3xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-slate-500">Загрузка...</div>
      <div v-else-if="!assessmentData" class="text-center text-slate-500">Тест не найден</div>
      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">{{ assessment?.title }}</h1>
            <p v-if="assessment?.description" class="mt-1 text-slate-600">
              {{ assessment.description }}
            </p>
          </div>
          <div v-if="timeLeft > 0" class="rounded-lg bg-slate-100 px-4 py-2 font-mono text-lg">
            {{ formatTime(timeLeft) }}
          </div>
        </div>

        <!-- Start screen -->
        <div
          v-if="!attemptId && !showResult"
          class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        >
          <p class="text-slate-600">
            Вопросов: {{ questions.length }} • Проходной балл:
            {{ assessment?.passingScore }}% • Попыток: {{ assessment?.maxAttempts }}
          </p>
          <p v-if="assessment?.timeLimitMinutes" class="mt-1 text-slate-600">
            Лимит времени: {{ assessment.timeLimitMinutes }} мин
          </p>
          <button
            @click="handleStart"
            :disabled="startMutation.isPending.value"
            class="mt-6 rounded-lg bg-indigo-600 px-8 py-3 text-base font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ startMutation.isPending.value ? "Загрузка..." : "Начать тест" }}
          </button>
        </div>

        <!-- Questions -->
        <div v-else-if="attemptId && !showResult" class="space-y-6">
          <div
            v-for="(q, idx) in questions"
            :key="q.id"
            class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-slate-400">Вопрос {{ idx + 1 }}</span>
              <span class="text-xs text-slate-500">{{ q.points }} балл</span>
            </div>
            <p class="mt-2 text-lg font-medium text-slate-900">{{ q.questionText }}</p>

            <div class="mt-4 space-y-2">
              <label
                v-for="opt in q.options"
                :key="opt.id"
                class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
                :class="{
                  'border-indigo-300 bg-indigo-50': answers[q.id]?.includes(opt.id),
                }"
              >
                <input
                  :type="q.questionType === 'single' ? 'radio' : 'checkbox'"
                  :name="`question-${q.id}`"
                  :checked="answers[q.id]?.includes(opt.id)"
                  @change="toggleOption(q.id, opt.id, q.questionType)"
                  class="h-4 w-4 text-indigo-600"
                />
                <span class="text-slate-700">{{ opt.optionText }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="handleSubmit"
              :disabled="submitMutation.isPending.value"
              class="rounded-lg bg-indigo-600 px-8 py-3 text-base font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ submitMutation.isPending.value ? "Отправка..." : "Завершить тест" }}
            </button>
          </div>
        </div>

        <!-- Result -->
        <div v-else-if="showResult && resultData" class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div
            class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl"
            :class="isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
          >
            {{ isPassed ? "✓" : "✕" }}
          </div>
          <h2 class="text-2xl font-bold" :class="isPassed ? 'text-green-700' : 'text-red-700'">
            {{ isPassed ? "Тест пройден!" : "Тест не пройден" }}
          </h2>
          <p class="mt-2 text-lg text-slate-600">
            Результат: {{ resultData.score }}% ({{ resultData.earnedPoints }} / {{ resultData.maxScore }} баллов)
          </p>
          <p class="text-sm text-slate-500">
            Проходной балл: {{ assessment?.passingScore }}%
          </p>

          <div v-if="assessment?.allowRetake" class="mt-6">
            <button
              @click="handleRetake"
              class="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Пересдать
            </button>
          </div>

          <div class="mt-6">
            <button
              @click="router.push('/courses')"
              class="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              К программам
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
