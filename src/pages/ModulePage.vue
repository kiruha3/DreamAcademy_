<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import { computed, ref, watch, onBeforeUnmount } from "vue";
import Icon from "@/components/Icon.vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const moduleId = computed(() => Number(route.params.id));

const { data, isLoading } = useQuery({
  queryKey: ["module", "context", moduleId],
  queryFn: () => trpc.module.getContext.query({ id: moduleId.value }),
});

const { data: moduleProgress } = useQuery({
  queryKey: ["progress", "module", moduleId],
  queryFn: () => trpc.progress.getByModule.query({ moduleId: moduleId.value }),
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

// ─── Top bar auto-hide logic ───
const showTopBar = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleHide() {
  hideTimer = setTimeout(() => {
    showTopBar.value = false;
  }, 100);
}

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

watch(moduleId, () => { localCompleted.value = false; });

watch(content, (c) => {
  if (c?.contentType === 'html_zip') {
    document.body.classList.add('overflow-hidden');
  } else {
    document.body.classList.remove('overflow-hidden');
  }
}, { immediate: true });

onBeforeUnmount(() => {
  document.body.classList.remove('overflow-hidden');
});

function getContentUrl() {
  if (!content.value) return "";
  const key = content.value.s3Key;
  if (!key) return "";
  if (key.startsWith("content/")) {
    return `/${key}`;
  }
  return `${s3PublicUrl}/${key}`;
}

function getRutubeEmbedUrl() {
  if (content.value?.contentType === "rutube" && content.value.rutubeVideoId) {
    return `https://rutube.ru/play/embed/${content.value.rutubeVideoId}`;
  }
  return "";
}

function handleComplete() {
  completeMutation.mutate({ moduleId: moduleId.value });
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
  <!-- HTML ZIP: immersive layout with floating top bar and bottom context -->
  <div v-if="content?.contentType === 'html_zip'" class="h-full flex flex-col overflow-hidden bg-background relative">
    <!-- Floating breadcrumbs — slides up over the app header, no extra strip -->
    <div
      class="absolute top-0 left-0 bg-transparent z-50 transition-all duration-100 ease-out"
      :class="showTopBar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
      @mouseenter="cancelHide(); showTopBar = true"
      @mouseleave="scheduleHide()"
    >
      <div class="bg-background/95 backdrop-blur-md border-b border-border px-4 py-2">
        <div class="flex items-center gap-2 text-sm text-text-muted">
          <RouterLink
            :to="`/course/${data.program?.slug}`"
            class="hover:text-primary flex items-center gap-1 transition"
          >
            <span><Icon name="ArrowLeft" /></span>
            <span class="truncate">{{ data.program?.title }}</span>
          </RouterLink>
          <span class="text-border">/</span>
          <span class="text-foreground font-medium truncate">{{ data.module?.title }}</span>
          <span
            v-if="isCompleted"
            class="rounded-full bg-success-light px-2 py-0.5 text-xs font-medium text-success shrink-0"
          >
            <Icon name="Check" /> Пройдено
          </span>
        </div>
      </div>
    </div>

    <!-- Hover detection zone over header -->
    <div
      class="absolute top-0 left-0 right-0 h-10 z-40"
      :class="showTopBar ? 'pointer-events-none' : 'pointer-events-auto'"
      @mouseenter="cancelHide(); showTopBar = true"
      @touchstart="showTopBar = !showTopBar"
    />

    <!-- iframe: fills all space, no border, no radius -->
    <iframe
      :src="getContentUrl()"
      class="flex-1 min-h-0 w-full"
      sandbox="allow-scripts"
    />

    <!-- Bottom panel: prev / module title / next or complete -->
    <div class="shrink-0 px-4 py-3 border-t border-border bg-background flex items-center gap-3">
      <!-- Left: previous -->
      <div class="flex-1 min-w-0 flex justify-start">
        <button
          v-if="data.prevModule && !data.prevModule.isLocked"
          @click="router.push(`/module/${data.prevModule.id}`)"
          class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-background"
        >
          <Icon name="ArrowLeft" /> Предыдущий
        </button>
        <button
          v-else-if="data.prevModule"
          disabled
          class="cursor-not-allowed rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted opacity-50"
        >
          <Icon name="Lock" />
        </button>
      </div>

      <!-- Center: module title (desktop only) -->
      <span class="hidden md:block text-sm text-text-muted truncate text-center">
        {{ data.module?.title }}
      </span>

      <!-- Right: complete or next -->
      <div class="flex-1 min-w-0 flex justify-end">
        <button
          v-if="!isCompleted"
          @click="handleComplete"
          :disabled="completeMutation.isPending.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
        >
          {{ completeMutation.isPending.value ? "Сохранение..." : "Завершить" }}
        </button>
        <button
          v-else
          @click="goNext"
          class="rounded-lg bg-success px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-[#16A34A]"
        >
          {{ data.nextModule ? "Следующий" : data.assessment ? "К тесту" : "К курсу" }} <Icon name="ArrowRight" />
        </button>
      </div>
    </div>
  </div>

  <!-- PDF / Rutube / No content / Loading: standard layout -->
  <div v-else class="min-h-screen bg-background">
    <div class="mx-auto max-w-5xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-text-muted">Загрузка...</div>
      <div v-else-if="!data" class="text-center text-text-muted">Модуль не найден</div>
      <div v-else class="space-y-6">
        <!-- Breadcrumbs -->
        <div class="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <RouterLink to="/courses" class="hover:text-primary">Программы</RouterLink>
          <span>/</span>
          <RouterLink :to="`/course/${data.program?.slug}`" class="hover:text-primary">
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
            <Icon name="Check" /> Пройдено
          </span>
        </div>

        <!-- Content -->
        <div class="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <iframe
            v-if="content?.contentType === 'pdf'"
            :src="getContentUrl()"
            class="h-[50vh] w-full sm:h-[70vh]"
          />
          <div v-else-if="content?.contentType === 'rutube'" class="aspect-video">
            <iframe
              :src="getRutubeEmbedUrl()"
              class="h-full w-full"
              frameborder="0"
              allowfullscreen
            />
          </div>
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
            <Icon name="ArrowLeft" /> Предыдущий модуль
          </button>
          <button
            v-else-if="data.prevModule"
            disabled
            class="w-full cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted sm:w-auto"
          >
            <Icon name="Lock" /> Предыдущий модуль
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
              {{ data.nextModule ? "Следующий модуль" : data.assessment ? "Перейти к тесту" : "К программе" }} <Icon name="ArrowRight" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
