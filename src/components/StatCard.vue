<script setup lang="ts">
import Icon from "@/components/Icon.vue";

const props = defineProps<{
  icon: string;
  label: string;
  value: string | number;
  color?: "primary" | "success" | "warning" | "info" | "navy";
  testId?: string;
}>();

const colorMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  navy: "bg-navy/10 text-navy",
};
</script>

<template>
  <div class="rounded-xl border border-border bg-surface p-5 shadow-sm" :data-testid="testId">
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        :class="colorMap[color ?? 'primary']"
      >
        <Icon :name="icon" class="h-5 w-5" />
      </div>
      <div class="min-w-0">
        <div class="text-2xl font-bold text-text-primary">{{ value }}</div>
        <div class="text-sm text-text-muted">{{ label }}</div>
      </div>
    </div>
  </div>
</template>
