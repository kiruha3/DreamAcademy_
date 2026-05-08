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
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto max-w-5xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-slate-500">Загрузка...</div>
      <div v-else-if="!data" class="text-center text-slate-500">Модуль не найден</div>
      <div v-else class="space-y-6">
        <!-- Breadcrumbs -->
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <RouterLink to="/courses" class="hover:text-indigo-600">Программы</RouterLink>
          <span>/</span>
          <RouterLink
            :to="`/course/${data.program?.slug}`"
            class="hover:text-indigo-600"
          >
            {{ data.program?.title }}
          </RouterLink>
          <span>/</span>
          <span class="text-slate-900">{{ data.module?.title }}</span>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-900">{{ data.module?.title }}</h1>
          <span
            v-if="isCompleted"
            class="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
          >
            ✓ Пройдено
          </span>
        </div>

        <!-- Content -->
        <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <!-- HTML ZIP / PDF -->
          <iframe
            v-if="content?.contentType === 'html_zip' || content?.contentType === 'pdf'"
            :src="getContentUrl()"
            class="w-full"
            style="height: 70vh"
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
          <div v-else class="flex h-64 items-center justify-center text-slate-500">
            Нет контента для этого модуля
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between">
          <button
            v-if="data.prevModule && !data.prevModule.isLocked"
            @click="router.push(`/module/${data.prevModule.id}`)"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            ← Предыдущий модуль
          </button>
          <button
            v-else-if="data.prevModule"
            disabled
            class="cursor-not-allowed rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-400"
          >
            🔒 Предыдущий модуль
          </button>
          <div v-else />

          <div class="flex items-center gap-3">
            <button
              v-if="!isCompleted"
              @click="handleComplete"
              :disabled="completeMutation.isPending.value"
              class="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ completeMutation.isPending.value ? "Сохранение..." : "Завершить модуль" }}
            </button>
            <button
              v-else
              @click="goNext"
              class="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              {{ data.nextModule ? "Следующий модуль →" : data.assessment ? "Перейти к тесту →" : "К программе →" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
