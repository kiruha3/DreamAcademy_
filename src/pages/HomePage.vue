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
  <div class="min-h-screen bg-slate-50">
    <!-- Hero -->
    <section class="bg-white pb-20 pt-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h1 class="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          DreamDocs Academy
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Учебная платформа для обучения работе с DreamDocs.
          Программы, курсы, модули, тесты и сертификаты — всё в одном месте.
        </p>
        <div class="mt-10 flex justify-center gap-4">
          <button
            @click="handleCTA"
            class="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {{ auth.user ? "Продолжить обучение" : "Начать обучение" }}
          </button>
          <RouterLink
            to="/login"
            v-if="!auth.user"
            class="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Войти
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Audience cards -->
    <section class="py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="mb-12 text-center text-3xl font-bold text-slate-900">
          Для кого платформа
        </h2>
        <div class="grid gap-8 sm:grid-cols-3">
          <!-- Employee -->
          <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
              👨‍💼
            </div>
            <h3 class="mb-2 text-xl font-semibold text-slate-900">Сотрудники</h3>
            <p class="text-slate-600">
              Освойте продукт DreamDocs: интерфейс, настройка, сценарии применения и ограничения.
            </p>
          </div>

          <!-- Partner -->
          <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
              🤝
            </div>
            <h3 class="mb-2 text-xl font-semibold text-slate-900">Партнёры</h3>
            <p class="text-slate-600">
              Поймите ценность продукта, сценарии внедрения и ограничения для ваших клиентов.
            </p>
          </div>

          <!-- Integrator -->
          <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
              🔧
            </div>
            <h3 class="mb-2 text-xl font-semibold text-slate-900">Интеграторы</h3>
            <p class="text-slate-600">
              Научитесь внедрять, настраивать и интегрировать DreamDocs через API.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Structure -->
    <section class="bg-white py-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h2 class="mb-8 text-3xl font-bold text-slate-900">Структура обучения</h2>
        <div class="flex flex-wrap items-center justify-center gap-3 text-slate-700">
          <span class="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">Программа</span>
          <span class="text-slate-400">→</span>
          <span class="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">Курс</span>
          <span class="text-slate-400">→</span>
          <span class="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">Модуль</span>
          <span class="text-slate-400">→</span>
          <span class="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">Тест</span>
          <span class="text-slate-400">→</span>
          <span class="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">Сертификат</span>
        </div>
        <p class="mt-6 text-slate-500">
          Каждая программа состоит из курсов, курсы — из модулей, а после прохождения всех модулей и тестов
          вы получаете сертификат.
        </p>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="py-16">
      <div class="mx-auto max-w-2xl px-4 text-center">
        <h2 class="text-2xl font-bold text-slate-900">Готовы начать?</h2>
        <p class="mt-3 text-slate-600">
          Получите приглашение от администратора и начните обучение уже сегодня.
        </p>
        <button
          v-if="!auth.user"
          @click="router.push('/login')"
          class="mt-6 rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
        >
          Войти в систему
        </button>
      </div>
    </section>
  </div>
</template>
