<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";

const auth = useAuthStore();

const { data: certificatesData } = useQuery({
  queryKey: ["certificates", "my"],
  queryFn: () => trpc.certificate.getMyCertificates.query(),
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
    <div class="mx-auto max-w-4xl px-4 py-8">
      <h1 class="text-3xl font-bold text-foreground">Профиль</h1>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <!-- Profile card -->
        <div class="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-1">
          <div class="flex flex-col items-center text-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-3xl font-bold text-primary">
              {{ auth.user?.name?.charAt(0).toUpperCase() ?? "?" }}
            </div>
            <h2 class="mt-4 text-lg font-semibold text-foreground">{{ auth.user?.name }}</h2>
            <p class="text-sm text-text-muted">{{ auth.user?.email }}</p>
            <span class="mt-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-secondary">
              {{ roleLabels[auth.user?.role ?? "user"] }}
            </span>
          </div>
        </div>

        <!-- Certificates -->
        <div class="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
          <h3 class="text-lg font-semibold text-foreground">Сертификаты</h3>
          <div v-if="!certificatesData?.items?.length" class="mt-4 text-sm text-text-muted">
            У вас пока нет сертификатов
          </div>
          <div v-else class="mt-4 space-y-3">
            <div
              v-for="cert in certificatesData.items"
              :key="cert.id"
              class="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <div class="font-medium text-foreground">{{ cert.programVersion?.program?.title }}</div>
                <div class="text-sm text-text-muted">
                  № {{ cert.certificateNumber }} • {{ formatDate(cert.issuedAt) }}
                </div>
              </div>
              <RouterLink
                :to="`/certificate/${cert.certificateNumber}`"
                class="rounded-md bg-accent px-3 py-1 text-xs font-medium text-primary hover:bg-primary-light"
              >
                Открыть
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
