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
      return "bg-success-light text-success";
    case "in_progress":
      return "bg-warning-light text-warning";
    default:
      return "bg-muted text-text-secondary";
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
  <div class="min-h-screen bg-background">
    <div class="mx-auto max-w-4xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-text-muted">Загрузка...</div>
      <div v-else-if="!courseData" class="text-center text-text-muted">Программа не найдена</div>
      <div v-else class="space-y-8">
        <!-- Breadcrumbs -->
        <div class="flex items-center gap-2 text-sm text-text-muted">
          <RouterLink to="/courses" class="hover:text-primary">Программы</RouterLink>
          <span>/</span>
          <span class="text-foreground">{{ courseData.program.title }}</span>
        </div>

        <!-- Header -->
        <div>
          <h1 class="text-3xl font-bold text-foreground">{{ courseData.program.title }}</h1>
          <p v-if="courseData.program.description" class="mt-2 text-text-secondary">
            {{ courseData.program.description }}
          </p>
        </div>

        <!-- Courses & Modules -->
        <div class="space-y-6">
          <div
            v-for="course in courseData.courses"
            :key="course.id"
            class="rounded-xl border border-border bg-surface shadow-sm"
          >
            <div class="px-6 py-4 border-b border-border">
              <h2 class="text-lg font-semibold text-foreground">{{ course.title }}</h2>
              <p v-if="course.description" class="mt-1 text-sm text-text-muted">
                {{ course.description }}
              </p>
            </div>

            <div class="divide-y divide-border">
              <div
                v-for="module in course.modules"
                :key="module.id"
                class="flex items-center justify-between px-6 py-4"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-foreground">{{ module.title }}</span>
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="getModuleBadgeClass(getModuleStatus(module.id))"
                    >
                      {{ getModuleBadgeText(getModuleStatus(module.id)) }}
                    </span>
                  </div>
                  <div class="mt-1 text-sm text-text-muted">
                    {{ getContentTypeLabel(module.contents) }}
                    <span v-if="module.assessment">• Тест</span>
                  </div>
                </div>
                <button
                  v-if="!isModuleLocked(course.modules, module)"
                  @click="router.push(`/module/${module.id}`)"
                  class="ml-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
                >
                  {{ getModuleActionText(getModuleStatus(module.id)) }}
                </button>
                <button
                  v-else
                  disabled
                  class="ml-4 cursor-not-allowed rounded-lg bg-border px-4 py-2 text-sm font-medium text-text-secondary"
                >
                  🔒 Заблокировано
                </button>
              </div>

              <!-- Course-level assessment -->
              <div
                v-if="course.assessment"
                class="flex items-center justify-between px-6 py-4 bg-warning-light/50"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-foreground">{{ course.assessment.title }}</span>
                    <span class="rounded-full bg-warning-light px-2 py-0.5 text-xs font-medium text-warning">
                      Финальный тест
                    </span>
                  </div>
                </div>
                <button
                  @click="router.push(`/assessment/${course.assessment.id}`)"
                  class="ml-4 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-[#D97706]"
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
