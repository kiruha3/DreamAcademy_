<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

function handleCTA() {
  if (auth.user) {
    router.push("/courses");
  } else {
    router.push("/login");
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Hero -->
    <section class="bg-surface pb-20 pt-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h1 class="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          DreamDocs Academy
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
          Учебная платформа для обучения работе с DreamDocs.
          Программы, курсы, модули, тесты и сертификаты — всё в одном месте.
        </p>
        <div class="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            @click="handleCTA"
            class="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-text-inverse shadow-sm transition hover:bg-primary-dark"
          >
            {{ auth.user ? "Продолжить обучение" : "Начать обучение" }}
          </button>
          <RouterLink
            to="/login"
            v-if="!auth.user"
            class="rounded-xl border border-border bg-surface px-8 py-3.5 text-base font-semibold text-text-secondary transition hover:bg-background"
          >
            Войти
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Audience cards -->
    <section class="py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="mb-12 text-center text-3xl font-bold text-foreground">
          Для кого платформа
        </h2>
        <div class="grid gap-8 sm:grid-cols-3">
          <!-- Employee -->
          <div class="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-info-light text-2xl">
              👨‍💼
            </div>
            <h3 class="mb-2 text-xl font-semibold text-foreground">Сотрудники</h3>
            <p class="text-text-secondary">
              Освойте продукт DreamDocs: интерфейс, настройка, сценарии применения и ограничения.
            </p>
          </div>

          <!-- Partner -->
          <div class="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-light text-2xl">
              🤝
            </div>
            <h3 class="mb-2 text-xl font-semibold text-foreground">Партнёры</h3>
            <p class="text-text-secondary">
              Поймите ценность продукта, сценарии внедрения и ограничения для ваших клиентов.
            </p>
          </div>

          <!-- Integrator -->
          <div class="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E8FF] text-2xl">
              🔧
            </div>
            <h3 class="mb-2 text-xl font-semibold text-foreground">Интеграторы</h3>
            <p class="text-text-secondary">
              Научитесь внедрять, настраивать и интегрировать DreamDocs через API.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Structure -->
    <section class="bg-surface py-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h2 class="mb-8 text-3xl font-bold text-foreground">Структура обучения</h2>
        <div class="flex flex-wrap items-center justify-center gap-3 text-text-secondary">
          <span class="rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary-dark">Программа</span>
          <span class="text-text-muted">→</span>
          <span class="rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary-dark">Курс</span>
          <span class="text-text-muted">→</span>
          <span class="rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary-dark">Модуль</span>
          <span class="text-text-muted">→</span>
          <span class="rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary-dark">Тест</span>
          <span class="text-text-muted">→</span>
          <span class="rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary-dark">Сертификат</span>
        </div>
        <p class="mt-6 text-text-muted">
          Каждая программа состоит из курсов, курсы — из модулей, а после прохождения всех модулей и тестов
          вы получаете сертификат.
        </p>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="py-16">
      <div class="mx-auto max-w-2xl px-4 text-center">
        <h2 class="text-2xl font-bold text-foreground">Готовы начать?</h2>
        <p class="mt-3 text-text-secondary">
          Получите приглашение от администратора и начните обучение уже сегодня.
        </p>
        <button
          v-if="!auth.user"
          @click="router.push('/login')"
          class="mt-6 rounded-xl bg-primary px-8 py-3 text-base font-semibold text-text-inverse transition hover:bg-primary-dark"
        >
          Войти в систему
        </button>
      </div>
    </section>
  </div>
</template>
