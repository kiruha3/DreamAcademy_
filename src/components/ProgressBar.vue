<script setup lang="ts">
const props = defineProps<{
  value: number;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning";
}>();

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const colorClasses = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
};

const clamped = Math.max(0, Math.min(100, props.value));
</script>

<template>
  <div class="w-full overflow-hidden rounded-full bg-muted">
    <div
      class="rounded-full transition-all duration-500 ease-out"
      :class="[sizeClasses[size ?? 'md'], colorClasses[color ?? 'primary']]"
      :style="{ width: `${clamped}%` }"
    />
  </div>
</template>
