<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { useRoute } from "vue-router";
import { trpc } from "@/lib/trpc";

const route = useRoute();
const number = route.params.number as string;

const { data: cert, isLoading } = useQuery({
  queryKey: ["certificate", number],
  queryFn: () => trpc.certificate.getByNumber.query({ number }),
});

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
</script>

<template>
  <div class="min-h-screen bg-muted">
    <div class="mx-auto max-w-4xl px-4 py-8">
      <div v-if="isLoading" class="text-center text-text-muted">Загрузка...</div>
      <div v-else-if="!cert" class="text-center text-text-muted">Сертификат не найден</div>
      <div v-else class="space-y-6">
        <!-- Certificate -->
        <div
          class="relative overflow-hidden rounded-2xl border-8 border-double border-border bg-surface p-12 text-center shadow-lg"
        >
          <div class="absolute inset-0 opacity-5">
            <div class="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')]" />
          </div>

          <div class="relative">
            <div class="text-lg font-medium uppercase tracking-widest text-warning">
              DreamDocs Academy
            </div>
            <h1 class="mt-4 text-4xl font-bold text-foreground">Сертификат</h1>
            <p class="mt-2 text-lg text-text-secondary">
              Настоящим подтверждается, что
            </p>
            <p class="mt-4 text-3xl font-bold text-primary-dark">
              {{ cert.user?.name }}
            </p>
            <p class="mt-4 text-lg text-text-secondary">
              успешно завершил(а) программу
            </p>
            <p class="mt-2 text-2xl font-semibold text-foreground">
              {{ cert.programVersion?.program?.title }}
            </p>
            <div class="mt-8 flex items-center justify-center gap-8">
              <div class="text-left">
                <div class="text-sm text-text-muted">Дата выдачи</div>
                <div class="text-lg font-medium text-foreground">{{ formatDate(cert.issuedAt) }}</div>
              </div>
              <div class="text-left">
                <div class="text-sm text-text-muted">Регистрационный номер</div>
                <div class="text-lg font-medium text-foreground">{{ cert.certificateNumber }}</div>
              </div>
            </div>

            <!-- QR Placeholder -->
            <div class="mt-8 inline-block rounded-lg border border-border bg-surface p-2">
              <div class="flex h-24 w-24 items-center justify-center text-xs text-text-muted">
                QR код<br />{{ cert.verificationToken?.slice(0, 8) }}
              </div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button
            onclick="window.print()"
            class="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-dark"
          >
            🖨️ Печать
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
