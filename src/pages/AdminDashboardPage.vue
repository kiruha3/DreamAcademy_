<script setup lang="ts">
import AdminLayout from "@/components/AdminLayout.vue";
</script>

<template>
  <AdminLayout>
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-slate-900">Дашборд</h1>
      <p class="text-slate-600">Добро пожаловать в панель управления DreamDocs Academy.</p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          to="/admin/programs"
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div class="text-3xl mb-2">📚</div>
          <h3 class="font-semibold text-slate-900">Программы</h3>
          <p class="text-sm text-slate-500 mt-1">Управление учебными программами</p>
        </RouterLink>
      </div>
    </div>
  </AdminLayout>
</template>
