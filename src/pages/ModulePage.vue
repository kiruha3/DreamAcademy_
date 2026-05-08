<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import { computed, ref } from "vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const moduleId = Number(route.params.id);

const { data, isLoading } = useQuery({
  queryKey: ["module", "context", moduleId],
  queryFn: () => trpc.module.getContext.query({ id: moduleId }),
});

const { data: moduleProgress } = useQuery({
  queryKey: ["progress", "module", moduleId],
  queryFn: () => trpc.progress.getByModule.query({ moduleId }),
});

const localCompleted = ref(false);

const completeMutation = useMutation({
  mutationFn: trpc.progress.completeModule.mutate,
  onSuccess: () => {
    localCompleted.value = true;
    if (data.value?.program?.id) {
      queryClient.invalidateQueries({
        queryKey: ["progress", data.value.program.id],
      });
    }
    queryClient.invalidateQueries({
      queryKey: ["progress", "module", moduleId],
    });
  },
  onError: (err) => {
    alert('Ошибка: ' + (err.message || 'Не удалось завершить модуль'));
  },
});

const isCompleted = computed(() => localCompleted.value || moduleProgress.value?.status === "completed");

const content = computed(() => data.value?.contents?.[0] ?? null);

const s3PublicUrl = import.meta.env.VITE_S3_PUBLIC_URL ?? "";

function getContentUrl() {
  if (!content.value) return "";
  const key = content.value.s3Key;
  if (!key) return "";
  // Local extracted content (backend ZIP extraction)
  if (key.startsWith("content/")) {
    return `/${key}`;
  }
  // S3-hosted content
  return `${s3PublicUrl}/${key}`;
}

function getRutubeEmbedUrl() {
  if (content.value?.contentType === "rutube" && content.value.rutubeVideoId) {
    return `https://rutube.ru/play/embed/${content.value.rutubeVideoId}`;
  }
  return "";
}

function handleComplete() {
  completeMutation.mutate({ moduleId });
}

function goNext() {
  if (data.value?.nextModule) {
    router.push(`/module/${data.value.nextModule.id}`);
  } else if (data.value?.assessment) {
    router.push(`/assessment/${data.value.assessment.id}`);
  } else {
    router.push(`/course/${data.value?.program?.slug}`);
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto max-w-5xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-text-muted">Загрузка...</div>
      <div v-else-if="!data" class="text-center text-text-muted">Модуль не найден</div>
      <div v-else class="space-y-6">
        <!-- Breadcrumbs -->
        <div class="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <RouterLink to="/courses" class="hover:text-primary">Программы</RouterLink>
          <span>/</span>
          <RouterLink
            :to="`/course/${data.program?.slug}`"
            class="hover:text-primary"
          >
            {{ data.program?.title }}
          </RouterLink>
          <span>/</span>
          <span class="text-foreground">{{ data.module?.title }}</span>
        </div>

        <!-- Header -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 class="text-2xl font-bold text-foreground">{{ data.module?.title }}</h1>
          <span
            v-if="isCompleted"
            class="rounded-full bg-success-light px-3 py-1 text-sm font-medium text-success"
          >
            ✓ Пройдено
          </span>
        </div>

        <!-- Content -->
        <div class="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <!-- HTML ZIP / PDF -->
          <iframe
            v-if="content?.contentType === 'html_zip' || content?.contentType === 'pdf'"
            :src="getContentUrl()"
            class="h-[50vh] w-full sm:h-[70vh]"
            :sandbox="content?.contentType === 'html_zip' ? 'allow-scripts' : undefined"
          />

          <!-- Rutube -->
          <div v-else-if="content?.contentType === 'rutube'" class="aspect-video">
            <iframe
              :src="getRutubeEmbedUrl()"
              class="h-full w-full"
              frameborder="0"
              allowfullscreen
            />
          </div>

          <!-- No content -->
          <div v-else class="flex h-64 items-center justify-center text-text-muted">
            Нет контента для этого модуля
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            v-if="data.prevModule && !data.prevModule.isLocked"
            @click="router.push(`/module/${data.prevModule.id}`)"
            class="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background sm:w-auto"
          >
            ← Предыдущий модуль
          </button>
          <button
            v-else-if="data.prevModule"
            disabled
            class="w-full cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted sm:w-auto"
          >
            🔒 Предыдущий модуль
          </button>
          <div v-else class="hidden sm:block" />

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              v-if="!isCompleted"
              @click="handleComplete"
              :disabled="completeMutation.isPending.value"
              class="w-full rounded-lg bg-primary px-6 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50 sm:w-auto"
            >
              {{ completeMutation.isPending.value ? "Сохранение..." : "Завершить модуль" }}
            </button>
            <button
              v-else
              @click="goNext"
              class="w-full rounded-lg bg-success px-6 py-2 text-sm font-medium text-text-inverse transition hover:bg-[#16A34A] sm:w-auto"
            >
              {{ data.nextModule ? "Следующий модуль →" : data.assessment ? "Перейти к тесту →" : "К программе →" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
