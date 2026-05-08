<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import Header from "@/components/Header.vue";

const auth = useAuthStore();

onMounted(async () => {
  await auth.fetchUser();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Header />
    <main>
      <RouterView />
    </main>
  </div>
</template>
