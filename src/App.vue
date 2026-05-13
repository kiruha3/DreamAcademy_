<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { Toaster } from "vue-sonner";
import { useAuthStore } from "@/stores/auth";
import Header from "@/components/Header.vue";

const auth = useAuthStore();

onMounted(async () => {
  await auth.fetchUser();
});
</script>

<template>
  <div class="h-[100dvh] flex flex-col bg-background">
    <Header />
    <main class="flex-1 min-h-0 overflow-y-auto">
      <RouterView />
    </main>
    <Toaster position="top-right" :rich-colors="true" />
  </div>
</template>
