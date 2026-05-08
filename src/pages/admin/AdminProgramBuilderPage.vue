<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout.vue";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const programId = Number(route.params.id);

const { data: program, isLoading } = useQuery({
  queryKey: ["admin", "program", programId],
  queryFn: () => trpc.admin.program.getById.query({ id: programId }),
});

const coursesQuery = useQuery({
  queryKey: ["admin", "courses", "list", programId],
  queryFn: () => {
    const pvId = program.value?.versions?.[0]?.id;
    if (!pvId) return Promise.resolve({ items: [] });
    return trpc.admin.course.list.query({ programVersionId: pvId });
  },
  enabled: computed(() => !!program.value?.versions?.[0]?.id),
});

const updateMutation = useMutation({
  mutationFn: trpc.admin.program.update.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "program", programId] });
  },
});

const createCourseMutation = useMutation({
  mutationFn: trpc.admin.course.create.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list", programId] });
    showCourseForm.value = false;
    newCourse.value = { slug: "", title: "", description: "", targetRole: "all", isMandatory: true };
  },
});

const reorderMutation = useMutation({
  mutationFn: trpc.admin.course.reorder.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list", programId] });
  },
});

const deleteCourseMutation = useMutation({
  mutationFn: trpc.admin.course.delete.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "courses", "list", programId] });
  },
});

const publishMutation = useMutation({
  mutationFn: ({ id, versionId }: { id: number; versionId: number }) =>
    trpc.admin.program.publish.mutate({ id, versionId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "program", programId] });
    queryClient.invalidateQueries({ queryKey: ["admin", "programs", "list"] });
  },
});

const newVersionMutation = useMutation({
  mutationFn: () => trpc.admin.program.createNewVersion.mutate({ id: programId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "program", programId] });
    queryClient.invalidateQueries({ queryKey: ["admin", "programs", "list"] });
  },
});

const showCourseForm = ref(false);
const newCourse = ref({
  slug: "",
  title: "",
  description: "",
  targetRole: "all" as "all" | "employee" | "partner" | "integrator",
  isMandatory: true,
});

const editableProgram = computed(() => ({
  id: programId,
  slug: program.value?.slug ?? "",
  code: program.value?.code ?? "",
  title: program.value?.title ?? "",
  description: program.value?.description ?? "",
  targetAudience: program.value?.targetAudience ?? "all",
  hasCertification: program.value?.hasCertification ?? false,
}));

const latestVersion = computed(() => program.value?.versions?.[0]);
const isDraft = computed(() => latestVersion.value?.status === "draft");

function handleUpdate() {
  updateMutation.mutate(editableProgram.value);
}

function handleCreateCourse() {
  const pvId = latestVersion.value?.id;
  if (!pvId) return;
  createCourseMutation.mutate({
    programVersionId: pvId,
    ...newCourse.value,
  });
}

function moveCourse(index: number, direction: number) {
  const items = coursesQuery.data.value?.items ?? [];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;

  const orderedIds = items.map((c) => c.id);
  const [moved] = orderedIds.splice(index, 1);
  orderedIds.splice(newIndex, 0, moved);

  const pvId = latestVersion.value?.id;
  if (!pvId) return;
  reorderMutation.mutate({ programVersionId: pvId, orderedIds });
}

function handleDeleteCourse(id: number) {
  if (confirm("Удалить курс?")) {
    deleteCourseMutation.mutate({ id });
  }
}

function handlePublish() {
  if (!latestVersion.value) return;
  if (!confirm("Опубликовать программу? После публикации черновик нельзя будет редактировать.")) return;
  publishMutation.mutate({ id: programId, versionId: latestVersion.value.id });
}

function handleNewVersion() {
  if (!confirm("Создать новую версию на основе текущей?")) return;
  newVersionMutation.mutate();
}

const targetLabels: Record<string, string> = {
  all: "Все",
  employee: "Сотрудники",
  partner: "Партнёры",
  integrator: "Интеграторы",
};

const statusLabels: Record<string, { text: string; class: string }> = {
  draft: { text: "Черновик", class: "bg-warning-light text-warning" },
  published: { text: "Опубликована", class: "bg-success-light text-success" },
  archived: { text: "Архив", class: "bg-muted text-text-secondary" },
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="py-12 text-center text-text-muted">Загрузка...</div>
    <div v-else-if="!program" class="py-12 text-center text-text-muted">Программа не найдена</div>
    <div v-else class="mx-auto max-w-5xl space-y-8">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold text-foreground">{{ program.title }}</h1>
          <div class="mt-2 flex items-center gap-3">
            <span :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', statusLabels[latestVersion?.status ?? 'draft'].class]">
              {{ statusLabels[latestVersion?.status ?? 'draft'].text }}
            </span>
            <span class="text-sm text-text-muted">Версия {{ latestVersion?.versionNumber ?? 1 }}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            v-if="isDraft"
            @click="handlePublish"
            :disabled="publishMutation.isPending.value"
            class="rounded-lg bg-success px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-[#16A34A] disabled:opacity-50"
          >
            Опубликовать
          </button>
          <button
            @click="handleNewVersion"
            :disabled="newVersionMutation.isPending.value"
            class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background disabled:opacity-50"
          >
            Новая версия
          </button>
        </div>
      </div>

      <!-- Program Form -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-foreground">Информация о программе</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
            <input v-model="editableProgram.title" @blur="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Slug</label>
              <input v-model="editableProgram.slug" @blur="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Код</label>
              <input v-model="editableProgram.code" @blur="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
            <textarea v-model="editableProgram.description" @blur="handleUpdate" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:col-span-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Аудитория</label>
              <select v-model="editableProgram.targetAudience" @change="handleUpdate" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="all">Все</option>
                <option value="employee">Сотрудники</option>
                <option value="partner">Партнёры</option>
                <option value="integrator">Интеграторы</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-text-secondary">
                <input v-model="editableProgram.hasCertification" @change="handleUpdate" type="checkbox" class="rounded border-border" />
                Есть сертификация
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Courses -->
      <div class="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-lg font-semibold text-foreground">Курсы</h2>
          <button
            v-if="isDraft"
            @click="showCourseForm = true"
            class="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          >
            + Добавить курс
          </button>
        </div>

        <div v-if="!coursesQuery.data.value?.items?.length" class="py-8 text-center text-text-muted">
          Нет курсов. Добавьте первый курс.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(course, index) in coursesQuery.data.value?.items"
            :key="course.id"
            class="flex flex-col gap-3 rounded-lg border border-border p-4 transition hover:border-primary-light sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <span class="text-sm font-medium text-text-muted">#{{ course.sortOrder }}</span>
                <h3 class="font-medium text-foreground">{{ course.title }}</h3>
                <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-text-secondary">
                  {{ targetLabels[course.targetRole] }}
                </span>
                <span v-if="course.isMandatory" class="rounded-full bg-danger-light px-2 py-0.5 text-xs text-danger">
                  Обязательный
                </span>
              </div>
              <div v-if="course.description" class="mt-1 text-sm text-text-muted">
                {{ course.description }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="moveCourse(index, -1)"
                :disabled="index === 0"
                class="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:bg-background disabled:opacity-30"
              >
                ↑
              </button>
              <button
                @click="moveCourse(index, 1)"
                :disabled="index === (coursesQuery.data.value?.items?.length ?? 0) - 1"
                class="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition hover:bg-background disabled:opacity-30"
              >
                ↓
              </button>
              <button
                @click="router.push(`/admin/courses/${course.id}`)"
                class="rounded-md bg-accent px-3 py-1 text-xs font-medium text-primary-dark transition hover:bg-primary-light"
              >
                Редактировать
              </button>
              <button
                @click="handleDeleteCourse(course.id)"
                class="rounded-md bg-danger-light px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger-light"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Course Modal -->
      <div
        v-if="showCourseForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showCourseForm = false"
      >
        <div class="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
          <h2 class="mb-4 text-xl font-bold text-foreground">Добавить курс</h2>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Название</label>
              <input v-model="newCourse.title" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Slug</label>
              <input v-model="newCourse.slug" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text-secondary">Описание</label>
              <textarea v-model="newCourse.description" rows="2" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">Ролевая ветка</label>
                <select v-model="newCourse.targetRole" class="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="all">Все</option>
                  <option value="employee">Сотрудники</option>
                  <option value="partner">Партнёры</option>
                  <option value="integrator">Интеграторы</option>
                </select>
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 text-sm text-text-secondary">
                  <input v-model="newCourse.isMandatory" type="checkbox" class="rounded border-border" />
                  Обязательный
                </label>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button @click="showCourseForm = false" class="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-background">
              Отмена
            </button>
            <button
              @click="handleCreateCourse"
              :disabled="!newCourse.title || !newCourse.slug || createCourseMutation.isPending.value"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ createCourseMutation.isPending.value ? "Создание..." : "Добавить" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
