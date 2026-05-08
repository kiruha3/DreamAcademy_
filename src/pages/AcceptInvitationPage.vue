<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";

const route = useRoute();
const router = useRouter();

const token = ref("");
const name = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const isSubmitting = ref(false);
const isValidating = ref(true);
const isValid = ref(false);

onMounted(async () => {
  const t = route.query.token as string;
  if (!t) {
    error.value = "Отсутствует токен приглашения";
    isValidating.value = false;
    return;
  }
  token.value = t;
  // We don't have a validate endpoint, so we just assume it's valid
  // The accept mutation will fail if invalid
  isValid.value = true;
  isValidating.value = false;
});

async function handleSubmit() {
  error.value = "";

  if (!name.value.trim()) {
    error.value = "Введите имя";
    return;
  }
  if (password.value.length < 8) {
    error.value = "Пароль должен содержать минимум 8 символов";
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = "Пароли не совпадают";
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await trpc.auth.acceptInvitation.mutate({
      token: token.value,
      name: name.value,
      password: password.value,
    });

    if (result.token) {
      localStorage.setItem("dreamdocs_auth", result.token);
    }

    router.push("/login");
  } catch (e: any) {
    error.value = e?.message || "Не удалось активировать аккаунт";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-foreground">Активация аккаунта</h1>
        <p class="mt-2 text-sm text-text-muted">Создайте пароль для завершения регистрации</p>
      </div>

      <div v-if="isValidating" class="py-8 text-center text-text-muted">
        Проверка приглашения...
      </div>

      <div v-else-if="!isValid && error" class="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
        {{ error }}
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="name" class="mb-1 block text-sm font-medium text-text-secondary">Имя</label>
          <input
            id="name"
            v-model="name"
            type="text"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="Иван Иванов"
          />
        </div>

        <div>
          <label for="password" class="mb-1 block text-sm font-medium text-text-secondary">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label for="confirm" class="mb-1 block text-sm font-medium text-text-secondary">Подтвердите пароль</label>
          <input
            id="confirm"
            v-model="confirmPassword"
            type="password"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? "Создание..." : "Создать аккаунт" }}
        </button>
      </form>
    </div>
  </div>
</template>
