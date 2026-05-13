<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import Icon from "@/components/Icon.vue";
import FallbackCover from "@/components/FallbackCover.vue";
import ProgressBar from "@/components/ProgressBar.vue";

export interface ProgramCardData {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  targetAudience: string;
  hasCertification?: boolean;
  coverImageUrl?: string | null;
}

export interface ProgramProgress {
  progressPercent: number;
  status: "not_started" | "in_progress" | "completed";
  totalModules?: number;
  completedModules?: number;
}

const props = defineProps<{
  program: ProgramCardData;
  progress?: ProgramProgress;
  variant?: "horizontal" | "vertical";
}>();

const variant = computed(() => props.variant ?? "vertical");

const targetBadges: Record<string, { label: string; class: string }> = {
  all: { label: "Для всех", class: "bg-muted text-text-secondary" },
  employee: { label: "Сотрудники", class: "bg-info-light text-info" },
  partner: { label: "Партнёры", class: "bg-purple-100 text-purple-700" },
  integrator: { label: "Интеграторы", class: "bg-warning-light text-warning" },
};

const ctaConfig = computed(() => {
  if (!props.progress) {
    return { label: "Подробнее", variant: "secondary" as const };
  }
  switch (props.progress.status) {
    case "completed":
      return { label: "Смотреть сертификат", variant: "success" as const };
    case "in_progress":
      return { label: "Продолжить", variant: "primary" as const };
    default:
      return { label: "Начать", variant: "primary" as const };
  }
});

const ctaClass = computed(() => {
  const map = {
    primary:
      "bg-primary text-white hover:bg-primary-dark",
    secondary:
      "border border-border text-text-secondary hover:bg-background",
    success:
      "bg-success text-white hover:bg-[#16A34A]",
  };
  return map[ctaConfig.value.variant];
});
</script>

<template>
  <!-- Horizontal variant -->
  <div
    v-if="variant === 'horizontal'"
    class="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-start sm:gap-5"
  >
    <!-- Cover -->
    <div class="shrink-0 overflow-hidden rounded-lg sm:h-32 sm:w-48">
      <img
        v-if="program.coverImageUrl"
        :src="program.coverImageUrl"
        :alt="program.title"
        class="h-40 w-full object-cover sm:h-full"
      />
      <FallbackCover v-else :slug="program.slug" :title="program.title" class="h-40 sm:h-full" />
    </div>

    <!-- Content -->
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-medium"
          :class="targetBadges[program.targetAudience]?.class ?? targetBadges.all.class"
        >
          {{ targetBadges[program.targetAudience]?.label ?? targetBadges.all.label }}
        </span>
        <span v-if="program.hasCertification" class="flex items-center gap-1 text-xs text-text-muted">
          <Icon name="GraduationCap" class="h-3.5 w-3.5" />
          Сертификат
        </span>
      </div>

      <h3 class="text-lg font-semibold text-text-primary">{{ program.title }}</h3>
      <p v-if="program.description" class="line-clamp-2 text-sm text-text-secondary">
        {{ program.description }}
      </p>

      <div v-if="progress" class="mt-1 space-y-1.5">
        <div class="flex items-center justify-between text-xs text-text-muted">
          <span>Прогресс</span>
          <span>{{ progress.progressPercent }}%</span>
        </div>
        <ProgressBar :value="progress.progressPercent" size="sm" />
      </div>

      <div class="mt-auto pt-2">
        <RouterLink
          :to="`/course/${program.slug}`"
          class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="ctaClass"
        >
          {{ ctaConfig.label }}
          <Icon name="ArrowRight" class="h-4 w-4" />
        </RouterLink>
      </div>
    </div>
  </div>

  <!-- Vertical variant -->
  <div
    v-else
    class="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition hover:shadow-md"
  >
    <!-- Cover -->
    <div class="relative h-44 overflow-hidden">
      <img
        v-if="program.coverImageUrl"
        :src="program.coverImageUrl"
        :alt="program.title"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <FallbackCover v-else :slug="program.slug" :title="program.title" class="h-full" />

      <div class="absolute left-3 top-3">
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm"
          :class="targetBadges[program.targetAudience]?.class ?? targetBadges.all.class"
        >
          {{ targetBadges[program.targetAudience]?.label ?? targetBadges.all.label }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 flex-col gap-2 p-4">
      <h3 class="text-base font-semibold text-text-primary line-clamp-1">{{ program.title }}</h3>
      <p v-if="program.description" class="line-clamp-2 text-sm text-text-secondary">
        {{ program.description }}
      </p>

      <div v-if="progress" class="space-y-1.5">
        <div class="flex items-center justify-between text-xs text-text-muted">
          <span>Прогресс</span>
          <span>{{ progress.progressPercent }}%</span>
        </div>
        <ProgressBar :value="progress.progressPercent" size="sm" />
      </div>

      <div class="mt-auto pt-3">
        <RouterLink
          :to="`/course/${program.slug}`"
          class="flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="ctaClass"
        >
          {{ ctaConfig.label }}
          <Icon name="ArrowRight" class="h-4 w-4" />
        </RouterLink>
      </div>
    </div>
  </div>
</template>
