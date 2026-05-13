<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  slug?: string;
  title?: string;
}>();

// Generate deterministic gradient colors from slug
const gradientColors = computed(() => {
  const seed = props.slug || props.title || "default";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40) % 360;
  const s = 50 + Math.abs((hash >> 8) % 30);
  const l1 = 45 + Math.abs((hash >> 16) % 15);
  const l2 = l1 - 10;

  return {
    from: `hsl(${h1} ${s}% ${l1}%)`,
    to: `hsl(${h2} ${s}% ${l2}%)`,
  };
});
</script>

<template>
  <div
    class="flex h-full w-full items-center justify-center rounded-lg"
    :style="{
      background: `linear-gradient(135deg, ${gradientColors.from}, ${gradientColors.to})`,
    }"
  >
    <div class="flex flex-col items-center gap-2 p-4 text-white/90">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
      <span v-if="title" class="max-w-[120px] truncate text-xs font-medium text-center">
        {{ title }}
      </span>
    </div>
  </div>
</template>
