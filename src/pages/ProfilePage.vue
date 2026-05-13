<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import Icon from "@/components/Icon.vue";
import StatCard from "@/components/StatCard.vue";
import ProgramCard from "@/components/ProgramCard.vue";

const auth = useAuthStore();
const router = useRouter();

const { data: dashboard, isLoading } = useQuery({
  queryKey: ["user", "dashboard"],
  queryFn: () => trpc.user.dashboard.query(),
});

const roleLabels: Record<string, string> = {
  user: "Пользователь",
  employee: "Сотрудник",
  partner: "Партнёр",
  integrator: "Интегратор",
  admin: "Админ",
  superadmin: "Суперадмин",
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU");
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Welcome block -->
    <section class="bg-navy pb-10 pt-8">
      <div class="mx-auto max-w-6xl px-4">
        <div class="flex items-center gap-4">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary"
          >
            {{ auth.user?.name?.charAt(0).toUpperCase() ?? "?" }}
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">
              Добро пожаловать, {{ auth.user?.name }}!
            </h1>
            <p class="mt-1 text-sm text-white/60">
              {{ auth.user?.email }}
            </p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {{ roleLabels[auth.user?.role ?? "user"] }}
              </span>
              <span
                v-if="auth.isAdmin"
                class="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/70"
              >
                Админ-панель
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="-mt-6 pb-8">
      <div class="mx-auto max-w-6xl px-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="BookOpen"
            label="Программ"
            :value="dashboard?.stats.programsCount ?? 0"
            color="primary"
            test-id="stat-programs"
          />
          <StatCard
            icon="CheckCircle"
            label="Уроков пройдено"
            :value="dashboard?.stats.completedModules ?? 0"
            color="success"
            test-id="stat-lessons"
          />
          <StatCard
            icon="Award"
            label="Сертификатов"
            :value="dashboard?.stats.certificatesCount ?? 0"
            color="warning"
            test-id="stat-certificates"
          />
          <StatCard
            icon="Activity"
            label="Общий прогресс"
            :value="`${dashboard?.stats.averageProgress ?? 0}%`"
            color="info"
            test-id="stat-progress"
          />
        </div>
      </div>
    </section>

    <!-- Main content -->
    <section class="pb-12">
      <div class="mx-auto max-w-6xl px-4">
        <div class="grid gap-6 lg:grid-cols-3">
          <!-- Left: My programs -->
          <div class="lg:col-span-2">
            <h2 class="mb-4 text-xl font-bold text-text-primary">
              Мои программы
            </h2>

            <div v-if="isLoading" class="text-text-muted">Загрузка...</div>
            <div
              v-else-if="!dashboard?.programs?.length"
              class="rounded-xl border border-border bg-surface p-8 text-center text-text-muted"
            >
              <Icon name="BookOpen" class="mx-auto mb-3 h-10 w-10 text-text-muted/50" />
              <p>Вам пока не назначены программы обучения.</p>
              <p class="mt-1 text-sm">Обратитесь к администратору Academy.</p>
            </div>
            <div v-else class="space-y-4">
              <ProgramCard
                v-for="p in dashboard.programs"
                :key="p.program.id"
                :program="p.program"
                :progress="{
                  progressPercent: p.progressPercent,
                  status: p.status,
                }"
                variant="horizontal"
              />
            </div>
          </div>

          <!-- Right: Sidebar -->
          <div class="space-y-6 lg:col-span-1">
            <!-- Quick actions -->
            <div class="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                Быстрые действия
              </h3>
              <div class="space-y-2">
                <RouterLink
                  to="/courses"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-background"
                >
                  <Icon name="BookOpen" class="h-4 w-4 text-primary" />
                  Все программы
                </RouterLink>
                <RouterLink
                  v-if="auth.isAdmin"
                  to="/admin"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-background"
                >
                  <Icon name="LayoutDashboard" class="h-4 w-4 text-primary" />
                  Админ-панель
                </RouterLink>
                <RouterLink
                  to="/profile"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-background"
                >
                  <Icon name="Users" class="h-4 w-4 text-primary" />
                  Профиль
                </RouterLink>
              </div>
            </div>

            <!-- Certificates -->
            <div class="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                Мои сертификаты
              </h3>
              <div v-if="!dashboard?.certificates?.length" class="text-sm text-text-muted">
                <p>Пока нет сертификатов</p>
                <p class="mt-1 text-xs">Завершите курс, чтобы получить сертификат</p>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="cert in dashboard.certificates"
                  :key="cert.id"
                  class="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-text-primary">
                      {{ cert.programTitle }}
                    </div>
                    <div class="text-xs text-text-muted">
                      {{ formatDate(cert.issuedAt) }}
                    </div>
                  </div>
                  <RouterLink
                    :to="`/certificate/${cert.certificateNumber}`"
                    class="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    Открыть
                  </RouterLink>
                </div>
              </div>
            </div>

            <!-- Overall stats -->
            <div class="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                Общая статистика
              </h3>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-text-secondary">Уроков пройдено</span>
                  <span class="font-medium text-text-primary">
                    {{ dashboard?.stats.completedModules ?? 0 }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Средний прогресс</span>
                  <span class="font-medium text-text-primary">
                    {{ dashboard?.stats.averageProgress ?? 0 }}%
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Сертификатов</span>
                  <span class="font-medium text-text-primary">
                    {{ dashboard?.stats.certificatesCount ?? 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
