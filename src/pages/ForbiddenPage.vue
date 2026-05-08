<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-red-500 mb-4">403</h1>
      <p class="text-xl text-slate-700 mb-2">Доступ запрещён</p>
      <p class="text-slate-500 mb-6">У вас недостаточно прав для просмотра этой страницы.</p>
      <RouterLink
        to="/"
        class="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Вернуться на главную
      </RouterLink>
    </div>
  </div>
</template>
