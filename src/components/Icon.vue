<script setup lang="ts">
import { computed } from "vue";
import {
  Menu,
  X,
  Users,
  LayoutDashboard,
  BookOpen,
  Mail,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Printer,
  Lock,
  GraduationCap,
  UserTie,
  Wrench,
  Handshake,
  Check,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Circle,
  Trash2,
  Settings,
  Briefcase,
} from "./icons";

const props = defineProps<{
  name: string;
  size?: number;
  class?: string;
}>();

const icons: Record<string, any> = {
  Menu,
  X,
  Users,
  LayoutDashboard,
  BookOpen,
  Mail,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Printer,
  Lock,
  GraduationCap,
  UserTie,
  Wrench,
  Handshake,
  Check,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Circle,
  Trash2,
  Settings,
  Briefcase,
};

const iconComponent = computed(() => icons[props.name] || null);
</script>

<template>
  <component
    :is="iconComponent"
    v-if="iconComponent"
    :size="size || 16"
    :class="class"
  />
  <span v-else class="text-danger">?</span>
</template>
