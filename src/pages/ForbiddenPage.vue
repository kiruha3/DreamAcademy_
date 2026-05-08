<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="text-center">
      <h1 class="text-5xl font-bold text-danger mb-4 sm:text-6xl">403</h1>
      <p class="text-lg text-text-secondary mb-2 sm:text-xl">Доступ запрещён</p>
      <p class="text-text-muted mb-6">У вас недостаточно прав для просмотра этой страницы.</p>
      <RouterLink
        to="/"
        class="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-text-inverse transition hover:bg-primary-dark"
      >
        Вернуться на главную
      </RouterLink>
    </div>
  </div>
</template>
