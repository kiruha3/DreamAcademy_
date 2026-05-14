<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";

const router = useRouter();
const auth = useAuthStore();

const activeTab = ref<"login" | "invitation">("login");

// Login form
const email = ref("");
const password = ref("");
const loginError = ref("");
const isSubmitting = ref(false);

// Invitation form
const inviteToken = ref("");
const inviteName = ref("");
const invitePassword = ref("");
const inviteConfirm = ref("");
const inviteError = ref("");
const isInviting = ref(false);

async function handleLogin() {
  loginError.value = "";
  if (!email.value || !password.value) {
    loginError.value = "Заполните email и пароль";
    return;
  }

  isSubmitting.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push("/");
  } catch (e: any) {
    loginError.value = e?.message || "Неверный email или пароль";
  } finally {
    isSubmitting.value = false;
  }
}

async function handleInvitation() {
  inviteError.value = "";

  if (!inviteToken.value.trim()) {
    inviteError.value = "Введите токен приглашения";
    return;
  }
  if (!inviteName.value.trim()) {
    inviteError.value = "Введите имя";
    return;
  }
  if (invitePassword.value.length < 8) {
    inviteError.value = "Пароль должен содержать минимум 8 символов";
    return;
  }
  if (invitePassword.value !== inviteConfirm.value) {
    inviteError.value = "Пароли не совпадают";
    return;
  }

  isInviting.value = true;
  try {
    const result = await trpc.auth.acceptInvitation.mutate({
      token: inviteToken.value,
      name: inviteName.value,
      password: invitePassword.value,
    });

    if (result.token) {
      localStorage.setItem("dreamdocs_auth", result.token);
    }

    // Refresh user state
    await auth.fetchUser();
    router.push("/");
  } catch (e: any) {
    inviteError.value = e?.message || "Не удалось активировать аккаунт";
  } finally {
    isInviting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-foreground">DreamAcademy</h1>
        <p class="mt-2 text-sm text-text-muted">Войдите или активируйте приглашение</p>
      </div>

      <!-- Tabs -->
      <div class="mb-6 flex rounded-lg bg-muted p-1">
        <button
          @click="activeTab = 'login'"
          :class="[
            'flex-1 rounded-md py-2 text-sm font-medium transition',
            activeTab === 'login'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-text-muted hover:text-text-secondary',
          ]"
        >
          Войти
        </button>
        <button
          @click="activeTab = 'invitation'"
          :class="[
            'flex-1 rounded-md py-2 text-sm font-medium transition',
            activeTab === 'invitation'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-text-muted hover:text-text-secondary',
          ]"
        >
          Приглашение
        </button>
      </div>

      <!-- Login form -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="mb-1 block text-sm font-medium text-text-secondary">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="you@example.com"
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

        <div v-if="loginError" class="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
          {{ loginError }}
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? "Вход..." : "Войти" }}
        </button>
      </form>

      <!-- Invitation form -->
      <form v-else @submit.prevent="handleInvitation" class="space-y-4">
        <div>
          <label for="token" class="mb-1 block text-sm font-medium text-text-secondary">Токен приглашения</label>
          <input
            id="token"
            v-model="inviteToken"
            type="text"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="Вставьте токен из письма"
          />
        </div>

        <div>
          <label for="invite-name" class="mb-1 block text-sm font-medium text-text-secondary">Имя</label>
          <input
            id="invite-name"
            v-model="inviteName"
            type="text"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="Иван Иванов"
          />
        </div>

        <div>
          <label for="invite-password" class="mb-1 block text-sm font-medium text-text-secondary">Пароль</label>
          <input
            id="invite-password"
            v-model="invitePassword"
            type="password"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label for="invite-confirm" class="mb-1 block text-sm font-medium text-text-secondary">Подтвердите пароль</label>
          <input
            id="invite-confirm"
            v-model="inviteConfirm"
            type="password"
            required
            class="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
            placeholder="••••••••"
          />
        </div>

        <div v-if="inviteError" class="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">
          {{ inviteError }}
        </div>

        <button
          type="submit"
          :disabled="isInviting"
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isInviting ? "Активация..." : "Активировать" }}
        </button>
      </form>

      <p v-if="activeTab === 'login'" class="mt-4 text-center text-xs text-text-muted">
        Нет аккаунта? Обратитесь к администратору для получения приглашения.
      </p>
    </div>
  </div>
</template>
