<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import { computed } from "vue";

const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;

const { data: courseData, isLoading } = useQuery({
  queryKey: ["course", slug],
  queryFn: () => trpc.course.getBySlug.query({ slug }),
});

const programId = computed(() => courseData.value?.program.id);

const { data: progressData } = useQuery({
  queryKey: ["progress", programId],
  queryFn: () =>
    programId.value
      ? trpc.progress.getByProgram.query({ programId: programId.value })
      : Promise.resolve({ modules: [] }),
  enabled: () => !!programId.value,
});

const progressMap = computed(() => {
  const map = new Map<number, string>();
  for (const m of progressData.value?.modules ?? []) {
    map.set(m.moduleId, m.status);
  }
  return map;
});

const typeLabels: Record<string, string> = {
  common: "Общий",
  html_zip: "HTML",
  pdf: "PDF",
  rutube: "Видео",
};

function getModuleStatus(moduleId: number) {
  return progressMap.value.get(moduleId) ?? "not_started";
}

function getModuleBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getModuleBadgeText(status: string) {
  switch (status) {
    case "completed":
      return "Пройдено";
    case "in_progress":
      return "В процессе";
    default:
      return "Не начато";
  }
}

function getModuleActionText(status: string) {
  switch (status) {
    case "completed":
      return "Повторить";
    case "in_progress":
      return "Продолжить";
    default:
      return "Начать";
  }
}

function isModuleLocked(_courseModules: any[], targetModule: any) {
  return targetModule.isLocked === true;
}

function getContentTypeLabel(contents: any[]) {
  if (!contents?.length) return "—";
  const types = contents.map((c) => c.contentType);
  if (types.includes("html_zip")) return "HTML";
  if (types.includes("pdf")) return "PDF";
  if (types.includes("rutube")) return "Видео";
  return "—";
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto max-w-4xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-slate-500">Загрузка...</div>
      <div v-else-if="!courseData" class="text-center text-slate-500">Программа не найдена</div>
      <div v-else class="space-y-8">
        <!-- Breadcrumbs -->
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <RouterLink to="/courses" class="hover:text-indigo-600">Программы</RouterLink>
          <span>/</span>
          <span class="text-slate-900">{{ courseData.program.title }}</span>
        </div>

        <!-- Header -->
        <div>
          <h1 class="text-3xl font-bold text-slate-900">{{ courseData.program.title }}</h1>
          <p v-if="courseData.program.description" class="mt-2 text-slate-600">
            {{ courseData.program.description }}
          </p>
        </div>

        <!-- Courses & Modules -->
        <div class="space-y-6">
          <div
            v-for="course in courseData.courses"
            :key="course.id"
            class="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div class="px-6 py-4 border-b border-slate-100">
              <h2 class="text-lg font-semibold text-slate-900">{{ course.title }}</h2>
              <p v-if="course.description" class="mt-1 text-sm text-slate-500">
                {{ course.description }}
              </p>
            </div>

            <div class="divide-y divide-slate-100">
              <div
                v-for="module in course.modules"
                :key="module.id"
                class="flex items-center justify-between px-6 py-4"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-900">{{ module.title }}</span>
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="getModuleBadgeClass(getModuleStatus(module.id))"
                    >
                      {{ getModuleBadgeText(getModuleStatus(module.id)) }}
                    </span>
                  </div>
                  <div class="mt-1 text-sm text-slate-500">
                    {{ getContentTypeLabel(module.contents) }}
                    <span v-if="module.assessment">• Тест</span>
                  </div>
                </div>
                <button
                  v-if="!isModuleLocked(course.modules, module)"
                  @click="router.push(`/module/${module.id}`)"
                  class="ml-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  {{ getModuleActionText(getModuleStatus(module.id)) }}
                </button>
                <button
                  v-else
                  disabled
                  class="ml-4 cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  🔒 Заблокировано
                </button>
              </div>

              <!-- Course-level assessment -->
              <div
                v-if="course.assessment"
                class="flex items-center justify-between px-6 py-4 bg-amber-50/50"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-900">{{ course.assessment.title }}</span>
                    <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Финальный тест
                    </span>
                  </div>
                </div>
                <button
                  @click="router.push(`/assessment/${course.assessment.id}`)"
                  class="ml-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                >
                  Пройти тест
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
