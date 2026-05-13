<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import ProgramCard from "@/components/ProgramCard.vue";

const { data, isLoading } = useQuery({
  queryKey: ["courses", "list"],
  queryFn: () => trpc.course.list.query(),
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <section class="bg-navy pb-10 pt-8">
      <div class="mx-auto max-w-6xl px-4">
        <div class="flex items-center gap-2 text-sm text-white/50">
          <RouterLink to="/" class="hover:text-white">Главная</RouterLink>
          <span>/</span>
          <span class="text-white/70">Курсы</span>
        </div>
        <h1 class="mt-4 text-3xl font-bold text-white">Курсы обучения</h1>
        <p class="mt-2 text-white/60">
          Выберите программу для начала или продолжения обучения
        </p>
      </div>
    </section>

    <!-- Programs list -->
    <section class="pb-12 pt-6">
      <div class="mx-auto max-w-6xl px-4">
        <div v-if="isLoading" class="text-center text-text-muted">Загрузка...</div>

        <div v-else-if="!data?.items?.length" class="text-center text-text-muted">
          Нет доступных программ
        </div>

        <div v-else class="space-y-4">
          <ProgramCard
            v-for="program in data.items"
            :key="program.id"
            :program="program"
            variant="horizontal"
          />
        </div>
      </div>
    </section>
  </div>
</template>
