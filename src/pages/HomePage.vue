<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { trpc } from "@/lib/trpc";
import Icon from "@/components/Icon.vue";
import ProgramCard from "@/components/ProgramCard.vue";
import { computed } from "vue";

const auth = useAuthStore();
const router = useRouter();

const { data: programsData } = useQuery({
  queryKey: ["home", "programs"],
  queryFn: () => trpc.course.list.query(),
  retry: false,
});

const { data: dashboardData } = useQuery({
  queryKey: ["user", "dashboard"],
  queryFn: () => trpc.user.dashboard.query(),
  enabled: computed(() => !!auth.user),
  retry: false,
});

const progressByProgramId = computed(() => {
  const map = new Map<number, { progressPercent: number; status: "not_started" | "in_progress" | "completed" }>();
  for (const p of dashboardData.value?.programs ?? []) {
    map.set(p.program.id, { progressPercent: p.progressPercent, status: p.status });
  }
  return map;
});

function handleCTA() {
  if (auth.user) {
    router.push("/courses");
  } else {
    router.push("/login");
  }
}

const advantages = [
  {
    icon: "Rocket",
    title: "Быстрый онбординг",
    description:
      "Новые сотрудники и партнёры быстрее понимают продукт, интерфейс, сценарии и ограничения DreamDocs.",
  },
  {
    icon: "BookOpen",
    title: "Единые знания о продукте",
    description:
      "Все участники работают с одной базой материалов: программами, модулями, тестами и актуальными презентациями.",
  },
  {
    icon: "BarChart3",
    title: "Контроль прогресса",
    description:
      "Администраторы видят, кто начал обучение, кто застрял, кто сдал тесты и кто готов к сертификату.",
  },
  {
    icon: "Award",
    title: "Сертификация",
    description:
      "После прохождения программы пользователь получает PDF-сертификат с QR-кодом публичной проверки.",
  },
  {
    icon: "Users",
    title: "Ролевые программы",
    description:
      "Обучение можно разделять для сотрудников, партнёров и интеграторов, сохраняя общую базу и отдельные ветки.",
  },
  {
    icon: "Layers",
    title: "Масштабирование контента",
    description:
      "Курсы и модули можно загружать через ZIP/HTML, добавлять PDF-презентации и видео, а позже развивать платформу до полноценной LMS.",
  },
];

const steps = ["Программа", "Курс", "Модуль", "Тест", "Сертификат"];
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Hero -->
    <section class="relative bg-navy pb-20 pt-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h1
          class="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          DreamAcademy
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          Обучение работе с продуктом DreamAcademy: от базовых навыков до
          профессиональной сертификации.
        </p>
        <p class="mx-auto mt-3 max-w-2xl text-base text-white/50">
          Изучайте продукт, проходите программы, сдавайте тесты и получайте
          сертификаты, подтверждающие знание DreamAcademy.
        </p>
        <div class="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            @click="handleCTA"
            class="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            {{ auth.user ? "Мои программы" : "Войти в Academy" }}
          </button>
          <RouterLink
            to="/courses"
            v-if="auth.user"
            class="rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Продолжить обучение
          </RouterLink>
          <button
            v-else
            @click="router.push('/courses')"
            class="rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Посмотреть программы
          </button>
        </div>
      </div>
    </section>

    <!-- Advantages -->
    <section class="py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="mb-4 text-center text-3xl font-bold text-text-primary">
          Почему стоит пройти обучение
        </h2>
        <p class="mx-auto mb-12 max-w-2xl text-center text-text-secondary">
          Academy помогает быстрее разобраться в продукте, стандартизировать
          знания команды и подтвердить компетенции сертификатом.
        </p>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="a in advantages"
            :key="a.title"
            class="rounded-xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-md"
          >
            <div
              class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Icon :name="a.icon" class="h-5 w-5" />
            </div>
            <h3 class="mb-2 text-lg font-semibold text-text-primary">
              {{ a.title }}
            </h3>
            <p class="text-sm leading-relaxed text-text-secondary">
              {{ a.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Programs -->
    <section class="bg-surface py-16">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="mb-4 text-center text-3xl font-bold text-text-primary">
          {{ auth.user ? "Мои программы обучения" : "Доступные программы обучения" }}
        </h2>
        <p class="mx-auto mb-10 max-w-2xl text-center text-text-secondary">
          {{ auth.user
            ? "Продолжайте обучение с того места, где остановились."
            : "Ознакомьтесь с программами, доступными для изучения."
          }}
        </p>

        <div v-if="programsData?.items.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ProgramCard
            v-for="program in programsData.items"
            :key="program.id"
            :program="program"
            :progress="progressByProgramId.get(program.id)"
            variant="vertical"
          />
        </div>
        <div v-else class="text-center text-text-muted">
          {{ auth.user ? "Вам пока не назначены программы." : "Публичные программы скоро появятся." }}
        </div>
      </div>
    </section>

    <!-- Structure -->
    <section class="py-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h2 class="mb-8 text-3xl font-bold text-text-primary">
          Как устроено обучение
        </h2>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <template v-for="(step, i) in steps" :key="step">
            <span
              class="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              {{ step }}
            </span>
            <span v-if="i < steps.length - 1" class="text-text-muted">
              <Icon name="ArrowRight" class="h-4 w-4" />
            </span>
          </template>
        </div>
        <p class="mt-6 text-text-muted">
          Каждая программа состоит из курсов, курсы — из модулей, а после
          прохождения всех модулей и тестов вы получаете сертификат.
        </p>
      </div>
    </section>

    <!-- Certification -->
    <section class="bg-navy py-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <div class="mb-6 flex justify-center">
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary"
          >
            <Icon name="Award" class="h-8 w-8" />
          </div>
        </div>
        <h2 class="text-3xl font-bold text-white">Сертификация</h2>
        <p class="mx-auto mt-4 max-w-2xl text-white/70">
          После успешного прохождения программы и итоговой аттестации вы
          получаете персональный PDF-сертификат с QR-кодом для публичной
          проверки.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-6 text-white/50">
          <div class="flex items-center gap-2">
            <Icon name="FileCheck" class="h-5 w-5 text-primary" />
            <span class="text-sm">PDF с QR-кодом</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="Globe" class="h-5 w-5 text-primary" />
            <span class="text-sm">Публичная проверка</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="ShieldCheck" class="h-5 w-5 text-primary" />
            <span class="text-sm">Официальное подтверждение</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16">
      <div class="mx-auto max-w-2xl px-4 text-center">
        <h2 class="text-2xl font-bold text-text-primary">Готовы начать?</h2>
        <p class="mt-3 text-text-secondary">
          Получите приглашение от администратора и начните обучение уже сегодня.
        </p>
        <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            v-if="!auth.user"
            @click="router.push('/login')"
            class="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-dark"
          >
            Войти в Academy
          </button>
          <button
            v-else
            @click="router.push('/courses')"
            class="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary-dark"
          >
            Продолжить обучение
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
