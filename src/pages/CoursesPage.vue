<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import { useRouter } from "vue-router";

const router = useRouter();

const { data, isLoading } = useQuery({
  queryKey: ["courses", "list"],
  queryFn: () => trpc.course.list.query(),
});

const targetLabels: Record<string, string> = {
  all: "Все",
  employee: "Сотрудники",
  partner: "Партнёры",
  integrator: "Интеграторы",
};

const targetBadges: Record<string, string> = {
  all: "bg-muted text-text-secondary",
  employee: "bg-info-light text-info",
  partner: "bg-[#F3E8FF] text-[#9333EA]",
  integrator: "bg-warning-light text-warning",
};
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto max-w-6xl px-4 py-8">
      <h1 class="text-3xl font-bold text-foreground">Доступные программы</h1>
      <p class="mt-2 text-text-secondary">Выберите программу для начала обучения</p>

      <div v-if="isLoading" class="mt-8 text-center text-text-muted">Загрузка...</div>

      <div v-else-if="!data?.items?.length" class="mt-8 text-center text-text-muted">
        Нет доступных программ
      </div>

      <div v-else class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="program in data.items"
          :key="program.id"
          class="cursor-pointer rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-md"
          @click="router.push(`/course/${program.slug}`)"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="targetBadges[program.targetAudience] ?? 'bg-muted text-text-secondary'"
            >
              {{ targetLabels[program.targetAudience] ?? program.targetAudience }}
            </span>
            <span v-if="program.hasCertification" class="text-lg" title="С сертификатом">🎓</span>
          </div>
          <h3 class="mt-3 text-lg font-semibold text-foreground">{{ program.title }}</h3>
          <p v-if="program.description" class="mt-1 text-sm text-text-secondary line-clamp-2">
            {{ program.description }}
          </p>
          <div class="mt-4 flex items-center text-sm font-medium text-primary">
            Перейти →
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
