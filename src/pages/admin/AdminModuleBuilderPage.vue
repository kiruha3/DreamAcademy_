<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const moduleId = Number(route.params.id);

const { data: moduleItem, isLoading } = useQuery({
  queryKey: ["admin", "module", moduleId],
  queryFn: () => trpc.admin.module.getById.query({ id: moduleId }),
});

const updateMutation = useMutation({
  mutationFn: trpc.admin.module.update.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "module", moduleId] });
  },
});

const contentMutation = useMutation({
  mutationFn: trpc.admin.moduleContent.upsert.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "module", moduleId] });
  },
});

const uploadMutation = useMutation({
  mutationFn: trpc.upload.getPresignedUrl.mutate,
});

const editableModule = computed(() => ({
  id: moduleId,
  title: moduleItem.value?.title ?? "",
  description: moduleItem.value?.description ?? "",
  moduleType: moduleItem.value?.moduleType ?? "common",
  isMandatory: moduleItem.value?.isMandatory ?? true,
  isLocked: moduleItem.value?.isLocked ?? false,
}));

const activeTab = ref<"html" | "pdf" | "rutube">("html");
const latestMvId = computed(() => moduleItem.value?.versions?.[0]?.id);

const existingContent = computed(() => {
  if (!moduleItem.value?.contents?.length) return null;
  return moduleItem.value.contents[0];
});

const rutubeUrl = ref(existingContent.value?.rutubeUrl ?? "");
const rutubeVideoId = computed(() => {
  const url = rutubeUrl.value;
  if (!url) return "";
  const match = url.match(/(?:rutube\.ru\/video\/|rutube\.ru\/play\/embed\/)([a-f0-9]+)/);
  return match?.[1] ?? "";
});

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

function handleUpdate() {
  updateMutation.mutate(editableModule.value);
}

async function handleFileUpload(event: Event, contentType: "html_zip" | "pdf") {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !latestMvId.value) return;

  isUploading.value = true;
  try {
    const { presignedUrl, publicUrl, key } = await uploadMutation.mutateAsync({
      filename: file.name,
      contentType: file.type || (contentType === "html_zip" ? "application/zip" : "application/pdf"),
      fileSize: file.size,
    });

    await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    await contentMutation.mutateAsync({
      moduleVersionId: latestMvId.value,
      contentType,
      s3Key: key,
      s3Checksum: "",
    });
  } finally {
    isUploading.value = false;
    if (input) input.value = "";
  }
}

async function handleRutubeSave() {
  if (!latestMvId.value) return;
  await contentMutation.mutateAsync({
    moduleVersionId: latestMvId.value,
    contentType: "rutube",
    rutubeUrl: rutubeUrl.value,
    rutubeVideoId: rutubeVideoId.value,
  });
}

const typeLabels: Record<string, string> = {
  common: "Общий",
  employee: "Сотрудники",
  partner: "Партнёры",
  integrator: "Интеграторы",
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="py-12 text-center text-slate-500">Загрузка...</div>
    <div v-else-if="!moduleItem" class="py-12 text-center text-slate-500">Модуль не найден</div>
    <div v-else class="mx-auto max-w-5xl space-y-8">
      <div class="flex items-center gap-2 text-sm text-slate-500">
        <button @click="router.push(`/admin/courses/${moduleItem.courseVersion?.courseId}`)" class="hover:text-indigo-600">
          ← Назад к курсу
        </button>
      </div>

      <h1 class="text-2xl font-bold text-slate-900">{{ moduleItem.title }}</h1>

      <!-- Module Form -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Информация о модуле</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Название</label>
            <input v-model="editableModule.title" @blur="handleUpdate" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Тип</label>
            <select v-model="editableModule.moduleType" @change="handleUpdate" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="common">Общий</option>
              <option value="employee">Сотрудники</option>
              <option value="partner">Партнёры</option>
              <option value="integrator">Интеграторы</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-medium text-slate-700">Описание</label>
            <textarea v-model="editableModule.description" @blur="handleUpdate" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"></textarea>
          </div>
          <div class="flex gap-6 sm:col-span-2">
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="editableModule.isMandatory" @change="handleUpdate" type="checkbox" class="rounded border-slate-300" />
              Обязательный
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="editableModule.isLocked" @change="handleUpdate" type="checkbox" class="rounded border-slate-300" />
              Заблокирован
            </label>
          </div>
        </div>
      </div>

      <!-- Content Tabs -->
      <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex border-b border-slate-200">
          <button
            @click="activeTab = 'html'"
            :class="['px-6 py-3 text-sm font-medium transition', activeTab === 'html' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-600 hover:text-slate-900']"
          >
            HTML ZIP
          </button>
          <button
            @click="activeTab = 'pdf'"
            :class="['px-6 py-3 text-sm font-medium transition', activeTab === 'pdf' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-600 hover:text-slate-900']"
          >
            PDF
          </button>
          <button
            @click="activeTab = 'rutube'"
            :class="['px-6 py-3 text-sm font-medium transition', activeTab === 'rutube' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-600 hover:text-slate-900']"
          >
            Rutube
          </button>
        </div>

        <div class="p-6">
          <!-- HTML ZIP -->
          <div v-if="activeTab === 'html'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-slate-900">Загрузка HTML ZIP</h3>
              <span v-if="existingContent?.contentType === 'html_zip'" class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Загружено
              </span>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept=".zip"
              @change="handleFileUpload($event, 'html_zip')"
              class="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p class="text-xs text-slate-500">Максимальный размер: 50 МБ. Архив должен содержать index.html в корне.</p>
            <div v-if="isUploading" class="text-sm text-indigo-600">Загрузка...</div>
          </div>

          <!-- PDF -->
          <div v-if="activeTab === 'pdf'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-slate-900">Загрузка PDF</h3>
              <span v-if="existingContent?.contentType === 'pdf'" class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Загружено
              </span>
            </div>
            <input
              type="file"
              accept=".pdf"
              @change="handleFileUpload($event, 'pdf')"
              class="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p class="text-xs text-slate-500">Максимальный размер: 10 МБ.</p>
            <div v-if="isUploading" class="text-sm text-indigo-600">Загрузка...</div>
          </div>

          <!-- Rutube -->
          <div v-if="activeTab === 'rutube'" class="space-y-4">
            <h3 class="font-medium text-slate-900">Ссылка на Rutube</h3>
            <div class="flex gap-3">
              <input
                v-model="rutubeUrl"
                placeholder="https://rutube.ru/video/..."
                class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                @click="handleRutubeSave"
                :disabled="!rutubeUrl || contentMutation.isPending.value"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
            <p class="text-xs text-slate-500">Вставьте прямую ссылку на видео Rutube.</p>

            <!-- Preview -->
            <div v-if="rutubeVideoId" class="mt-4">
              <h4 class="mb-2 text-sm font-medium text-slate-700">Предпросмотр</h4>
              <iframe
                :src="`https://rutube.ru/play/embed/${rutubeVideoId}`"
                width="100%"
                height="400"
                frameborder="0"
                allowfullscreen
                class="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
