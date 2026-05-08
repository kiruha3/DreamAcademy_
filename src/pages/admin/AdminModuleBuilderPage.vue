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

const assessmentsQuery = useQuery({
  queryKey: ["admin", "assessments", "module", moduleId],
  queryFn: () => {
    const mvId = moduleItem.value?.versions?.[0]?.id;
    if (!mvId) return Promise.resolve({ items: [] });
    return trpc.admin.assessment.list.query({ moduleVersionId: mvId });
  },
  enabled: computed(() => !!moduleItem.value?.versions?.[0]?.id),
});

const createAssessmentMutation = useMutation({
  mutationFn: trpc.admin.assessment.create.mutate,
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessments", "module", moduleId] });
    showAssessmentForm.value = false;
    resetAssessmentForm();
    router.push(`/admin/assessments/${data.id}`);
  },
});

const deleteAssessmentMutation = useMutation({
  mutationFn: trpc.admin.assessment.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "assessments", "module", moduleId] });
  },
});

const editableModule = computed(() => ({
  id: moduleId,
  title: moduleItem.value?.title ?? "",
  description: moduleItem.value?.description ?? "",
  moduleType: moduleItem.value?.moduleType ?? "common",
  isMandatory: moduleItem.value?.isMandatory ?? true,
  isLocked: moduleItem.value?.isLocked ?? false,
}));

const showAssessmentForm = ref(false);
const newAssessment = ref({
  title: "",
  description: "",
  assessmentType: "mini_test" as "mini_test" | "final" | "certification",
  passingScore: 80,
  maxAttempts: 2,
  timeLimitMinutes: undefined as number | undefined,
  showCorrectAnswers: true,
  allowRetake: false,
});

function handleCreateAssessment() {
  const mvId = moduleItem.value?.versions?.[0]?.id;
  if (!mvId) return;
  createAssessmentMutation.mutate({
    moduleVersionId: mvId,
    ...newAssessment.value,
    timeLimitMinutes: newAssessment.value.timeLimitMinutes || undefined,
  });
}

function resetAssessmentForm() {
  newAssessment.value = {
    title: "",
    description: "",
    assessmentType: "mini_test",
    passingScore: 80,
    maxAttempts: 2,
    timeLimitMinutes: undefined,
    showCorrectAnswers: true,
    allowRetake: false,
  };
}

function handleDeleteAssessment(id: number) {
  if (confirm("Удалить тест?")) {
    deleteAssessmentMutation.mutate({ id });
  }
}

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
    if (contentType === "html_zip") {
      // Upload ZIP directly to backend for extraction
      const formData = new FormData();
      formData.append("file", file);
      formData.append("moduleVersionId", String(latestMvId.value));

      const token = localStorage.getItem("dreamdocs_auth");
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/upload-html-zip", {
        method: "POST",
        body: formData,
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload ZIP");
      }

      // Content record already created by backend
      queryClient.invalidateQueries({ queryKey: ["admin", "module", moduleId] });
    } else {
      // PDF uses S3 presigned URL
      const { presignedUrl, publicUrl, key } = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type || "application/pdf",
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
    }
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

      <!-- Assessments -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">Тесты модуля</h2>
          <button
            @click="showAssessmentForm = true"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + Добавить тест
          </button>
        </div>

        <div v-if="!assessmentsQuery.data.value?.items?.length" class="py-8 text-center text-slate-500">
          Нет тестов. Добавьте первый тест.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="a in assessmentsQuery.data.value?.items"
            :key="a.id"
            class="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-indigo-200"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="font-medium text-slate-900">{{ a.title }}</h3>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {{ a.assessmentType === 'mini_test' ? 'Мини-тест' : a.assessmentType === 'final' ? 'Финальный' : 'Сертификация' }}
                </span>
                <span v-if="a.versions?.[0]?.status === 'published'" class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  Опубликован
                </span>
                <span v-else class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  Черновик
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="router.push(`/admin/assessments/${a.id}`)"
                class="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
              >
                Редактировать
              </button>
              <button
                @click="handleDeleteAssessment(a.id)"
                class="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Удалить
              </button>
            </div>
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

      <!-- Add Assessment Modal -->
      <div
        v-if="showAssessmentForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showAssessmentForm = false"
      >
        <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-xl font-bold text-slate-900">Добавить тест</h2>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Название</label>
              <input v-model="newAssessment.title" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Описание</label>
              <textarea v-model="newAssessment.description" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Тип</label>
                <select v-model="newAssessment.assessmentType" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none">
                  <option value="mini_test">Мини-тест</option>
                  <option value="final">Финальный</option>
                  <option value="certification">Сертификация</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Проходной балл (%)</label>
                <input v-model.number="newAssessment.passingScore" type="number" min="0" max="100" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Попыток</label>
                <input v-model.number="newAssessment.maxAttempts" type="number" min="1" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Лимит времени (мин)</label>
                <input v-model.number="newAssessment.timeLimitMinutes" type="number" min="1" placeholder="Без ограничения" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>
            <div class="flex gap-6">
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="newAssessment.showCorrectAnswers" type="checkbox" class="rounded border-slate-300" />
                Показывать правильные
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="newAssessment.allowRetake" type="checkbox" class="rounded border-slate-300" />
                Разрешить пересдачу
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="showAssessmentForm = false" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Отмена
            </button>
            <button
              @click="handleCreateAssessment"
              :disabled="!newAssessment.title || createAssessmentMutation.isPending.value"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ createAssessmentMutation.isPending.value ? "Создание..." : "Добавить" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
