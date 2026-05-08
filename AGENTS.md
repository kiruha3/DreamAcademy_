# AGENTS.md — DreamDocs Academy

> Этот файл предназначен для AI-агентов, работающих с проектом.
> Описывает фактическое состояние проекта, а не планируемое.
> Все выводы сделаны на основе файлов, присутствующих в рабочей директории.

---

## 1. Обзор проекта

**Название:** DreamDocs Academy (рабочее название — DreamAcademy)
**Тип:** Учебная платформа (LMS) для обучения пользователей продукту DreamDocs
**Статус:** Фаза планирования и спецификации — исходный код ещё не создан
**Язык контента и интерфейса (MVP):** Русский
**Планируемый домен:** academy.dreamdocs.ru

**Назначение:**
- Обучение сотрудников работе с продуктом DreamDocs
- Онбординг партнёров (понимание продукта, сценариев, ограничений)
- Подготовка интеграторов (внедрение, настройка, работа с API)

**Ключевые ограничения MVP:**
- Пользователей создаёт только один суперадмин (нет свободной регистрации)
- Обучение строится по цепочке: Программа → Курс → Модуль → Мини-тест → Итоговая аттестация → Сертификат
- Контент модулей: HTML ZIP, PDF-презентации, Rutube-видео
- Сертификаты: PDF с QR-кодом, автоматическая и ручная выдача
- Импорт программ через ZIP-пакет

---

## 2. Технологический стек

> Стек зафиксирован в спецификации, но физически не развёрнут — нет `package.json`, `node_modules` и исходных файлов.

### Backend
| Технология | Версия / Назначение |
|---|---|
| Node.js | 20+ |
| Hono | HTTP-фреймворк |
| tRPC | 11 — типизированный API |
| Drizzle ORM | 0.45 — работа с БД |
| MySQL | 8 — основная СУБД |
| Zod | 4 — валидация схем |
| jose | 6 — JWT (HS256, 7 дней) |
| bcryptjs | хеширование паролей |
| AWS S3 SDK | хранение файлов (HTML, CSS, PDF, изображения) |
| superjson | сериализация для tRPC |
| nanoid | генерация ключей для S3 |

### Frontend
| Технология | Версия / Назначение |
|---|---|
| Vue | 3.5 |
| TypeScript | strict mode |
| Vite | 7 — сборка и dev-сервер |
| Vue Router | 4 (hash mode) |
| Pinia | 3 — state management |
| TanStack Query Vue | 5 — серверное состояние |
| Tailwind CSS | 3.4 — стилизация |
| radix-vue | примитивы (Dialog, Tabs, Accordion) |
| class-variance-authority | варианты компонентов (Button) |
| vue-sonner | toast-уведомления |

### Сборка
- Dev: `vite dev server` + Hono dev server на порту 3000
- Build: Vite собирает `src/` → `dist/public`, esbuild собирает `api/` → `dist/boot.js`
- Start: `node dist/boot.js`

---

## 3. Структура проекта (планируемая)

```
project-root/
├── .kimi/                    # Конфигурация агента Kimi и библиотека скиллов
│   ├── agent.yaml            # Основная конфигурация агента
│   ├── coder.yaml            # Конфигурация подагента для программирования
│   ├── SKILL.md              # Стандарты качества работы агента
│   ├── system_prompt.md      # Системный промпт с авто-выбором скиллов
│   ├── QUALITY_CHECKLIST.md  # Чек-лист перед сдачей
│   ├── TESTING_GUIDE.md      # Инструкция по тестированию
│   ├── self_review.md        # Процесс самопроверки
│   └── skills/               # ~40 скиллов для разных задач
│
├── build-from-scratch/       # Планы реализации (спецификация)
│   ├── 01-TZ.md              # Сжатое ТЗ со стеком, БД, API, фронтендом
│   ├── 02-BACKEND.md         # План бэкенда по микро-задачам (2–5 мин)
│   ├── 03-FRONTEND.md        # План фронтенда по микро-задачам
│   └── 04-TASKS.md           # Трекер задач с приоритетами и роадмапом
│
├── tzDAc.md                  # Полное техническое задание (~800 KB, 20K+ строк)
│
├── api/                      # Бэкенд (ещё не создан)
│   ├── boot.ts               # Точка входа Hono + tRPC adapter + health check
│   ├── context.ts            # Создание tRPC-контекста
│   ├── middleware.ts         # publicProcedure, authedProcedure, adminProcedure, superAdminProcedure
│   ├── router.ts             # Корневой роутер
│   ├── local-auth.ts         # bcrypt, JWT, cookie auth
│   ├── auth-router.ts        # Регистрация, вход, me, logout
│   ├── course-router.ts      # Публичные эндпоинты курсов
│   ├── lesson-router.ts      # Уроки, контекст, навигация
│   ├── progress-router.ts    # Прогресс прохождения
│   ├── test-router.ts        # Тесты и попытки
│   ├── certificate-router.ts # Сертификаты
│   ├── upload-router.ts      # Presigned URL для S3
│   ├── admin/
│   │   ├── index.ts          # Объединение админских роутеров
│   │   ├── course-router.ts  # CRUD курсов
│   │   ├── module-router.ts  # CRUD модулей + reorder
│   │   ├── lesson-router.ts  # CRUD уроков + uploadHtml
│   │   └── user-router.ts    # Статистика, список пользователей, смена роли
│   ├── lib/
│   │   ├── env.ts            # Zod-валидация переменных окружения
│   │   ├── cookies.ts        # Опции HTTP-only cookie
│   │   ├── s3.ts             # Клиент S3
│   │   └── vite.ts           # Обслуживание статики в продакшене
│   └── queries/
│       └── connection.ts     # Singleton подключения Drizzle → MySQL
│
├── db/                       # База данных (ещё не создана)
│   ├── schema.ts             # Описание всех таблиц Drizzle
│   ├── relations.ts          # Drizzle relations (courses→modules→lessons)
│   ├── migrate.ts            # Программный запуск миграций
│   ├── seed.ts               # Seed-данные (1 админ, 2 курса, 3 модуля, 6 уроков, 1 тест)
│   └── migrations/           # Сгенерированные SQL-миграции
│
├── contracts/                # Общий код фронтенд/бэкенд
│   ├── constants.ts          # AUTH_COOKIE, OWNER_UNION_ID, сообщения об ошибках
│   ├── errors.ts             # Маппинг TRPCError code → message
│   └── types.ts              # Re-export из db/schema + LessonContent + CourseWithModules
│
├── src/                      # Фронтенд (ещё не создан)
│   ├── main.ts               # createApp(App) + router + pinia + VueQueryPlugin
│   ├── App.vue               # Корневой компонент
│   ├── index.css             # Tailwind directives
│   ├── const.ts              # Константы фронтенда
│   ├── router/index.ts       # Hash-роутер + guards (requiresAuth, guestOnly, requiresAdmin)
│   ├── stores/auth.ts        # Pinia: user, isLoading, isAdmin, fetchUser, login, logout
│   ├── composables/          # Vue-composables
│   ├── lib/
│   │   ├── trpc.ts           # Vanilla tRPC client + superjson + Bearer header
│   │   ├── clientAuth.ts     # Утилиты клиентской авторизации
│   │   └── courseData.ts     # Демо-данные для offline fallback
│   ├── components/
│   │   ├── ui/               # Базовые UI-компоненты (Button, Input, Dialog, Tabs, ...)
│   │   ├── Header.vue
│   │   ├── Footer.vue
│   │   └── AuthLayout.vue    # Layout для админки
│   └── pages/
│       ├── HomePage.vue
│       ├── LoginPage.vue
│       ├── CoursesPage.vue
│       ├── CoursePage.vue
│       ├── LessonPage.vue
│       ├── TestPage.vue
│       ├── ProfilePage.vue
│       ├── CertificatePage.vue
│       ├── AdminPage.vue
│       ├── AdminCoursesPage.vue
│       ├── CourseBuilderPage.vue
│       ├── ModuleBuilderPage.vue
│       ├── LessonBuilderPage.vue
│       └── NotFoundPage.vue
│
├── package.json              # Планируется: type: module, scripts dev/build/start/db:*
├── tsconfig.json             # Планируется: strict, алиасы @/, @db/, @contracts/, @api/
├── vite.config.ts            # Планируется: @hono/vite-dev-server, @vitejs/plugin-vue, порт 3000
├── drizzle.config.ts         # Планируется: schema, out, dialect mysql
├── tailwind.config.js        # Планируется: кастомная цветовая палитра
├── postcss.config.js         # Планируется: tailwindcss, autoprefixer
├── .env                      # Планируется: DATABASE_URL, APP_SECRET, S3_*, и др.
└── .env.example              # Планируется: шаблон переменных окружения
```

---

## 4. Текущее состояние файлов

**Фактически существующие файлы:**
- `tzDAc.md` — полное ТЗ (803 KB)
- `build-from-scratch/01-TZ.md` — краткое ТЗ со стеком и структурой
- `build-from-scratch/02-BACKEND.md` — план бэкенда (микро-задачи)
- `build-from-scratch/03-FRONTEND.md` — план фронтенда (микро-задачи)
- `build-from-scratch/04-TASKS.md` — трекер задач с приоритетами
- `.kimi/*` — конфигурация агента и библиотека скиллов

**Отсутствующие файлы (необходимо создать при сборке):**
- `package.json`, `package-lock.json`, `node_modules/`
- `tsconfig.json`, `vite.config.ts`, `drizzle.config.ts`
- `tailwind.config.js`, `postcss.config.js`
- `.env`, `.env.example`
- Весь каталог `api/`
- Весь каталог `db/`
- Весь каталог `contracts/`
- Весь каталог `src/`

---

## 5. База данных (спецификация)

### Таблицы
| Таблица | Назначение |
|---|---|
| `users` | Пользователи системы (роли: user, employee, partner, integrator, admin, superadmin) |
| `courses` | Курсы (slug, title, targetRole, isPublished) |
| `modules` | Модули внутри курса (number, title, moduleType, isLocked) |
| `lessons` | Уроки внутри модулей (number, title, lessonType, content JSON) |
| `tests` | Тесты (passingScore, maxAttempts, isFinal) |
| `questions` | Вопросы тестов (questionType, options JSON) |
| `progress` | Прогресс пользователей по урокам |
| `testAttempts` | Попытки прохождения тестов |
| `certificates` | Выданные сертификаты (уникальный номер) |

### Связи
- `courses` → `modules` (1:N, onDelete cascade)
- `modules` → `lessons` (1:N, onDelete cascade)

### Роли пользователей
- `superadmin` — единственный главный администратор, создаётся только через backend
- `admin` — архитектурно предусмотрен, но не используется в MVP
- `employee` — сотрудник
- `partner` — партнёр (проходной балл 85%)
- `integrator` — интегратор (проходной балл 85%)

---

## 6. API и Middleware (спецификация)

### Процедуры tRPC
- `publicProcedure` — без проверки авторизации
- `authedProcedure` — требует `ctx.user`
- `adminProcedure` — `authed` + роль admin/superadmin
- `superAdminProcedure` — `authed` + роль superadmin

### Основные роутеры
| Роутер | Доступ | Ключевые методы |
|---|---|---|
| `auth` | public | `register`, `login`, `me`, `logout`, `createUser` (admin) |
| `course` | authed | `list`, `getBySlug`, `getById` (nested modules + lessons) |
| `lesson` | authed | `getById`, `getByModule`, `getContext` (lesson + module + course + nextLesson) |
| `progress` | authed | `getByCourse`, `completeLesson` |
| `test` | authed | `getById`, `getByLesson`, `submit` (score, isPassed, attemptNumber) |
| `certificate` | authed | `getByCourse`, `issue` (проверка: все уроки + финальный тест пройдены) |
| `upload` | authed | `getPresignedUrl` (whitelist contentType, лимиты размера) |
| `admin.course` | admin | `listAll`, `create`, `update`, `delete` (cascade) |
| `admin.module` | admin | `create`, `update`, `delete`, `reorder` (транзакция) |
| `admin.lesson` | admin | `create`, `update`, `delete`, `reorder`, `uploadHtml` |
| `admin.user` | superadmin | `getDashboardStats`, `listUsers`, `updateUserRole` |

---

## 7. Аутентификация

- JWT (jose, HS256, 7 дней) хранится в HTTP-only cookie
- Fallback: `localStorage` ключ `dreamdocs_auth`
- Пароли хешируются через bcryptjs
- Cookie опции: `httpOnly`, `secure` (в продакшене), `sameSite: "strict"`, `maxAge: 60*60*24*7`

---

## 8. Переменные окружения (спецификация)

Обязательные переменные (Zod-валидация в `api/lib/env.ts`, fail fast):
- `APP_ID`
- `APP_SECRET` (min 32 символа)
- `DATABASE_URL`
- `OWNER_UNION_ID`
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_URL`

Опционально:
- `KIMI_AUTH_URL`
- `KIMI_OPEN_URL`

---

## 9. Конвенции разработки

### Backend
1. TypeScript `strict`. Никаких `any`.
2. Все входные данные валидируются через Zod.
3. Все ошибки API — через `TRPCError({ code, message })`.
4. Транзакции БД через `db.transaction()`.
5. Внешние ключи с `onDelete: "cascade"` где логично.
6. Индекс на каждом FK и часто искомом поле.
7. Валидация env — fail fast (процесс падает с понятной ошибкой).
8. Graceful shutdown по SIGINT/SIGTERM.

### Frontend
1. Только `<script setup lang="ts">`. Никакого Options API.
2. Никаких `any`. Strict TypeScript.
3. TanStack Query: `useQuery` / `useMutation` напрямую, без кастомных обёрток.
4. После каждой mutation — `invalidateQueries`.
5. Optimistic updates где возможно (например, `progress.completeLesson`).
6. Только Tailwind. Никаких inline-стилей.
7. `v-html` только для контента из админки (доверенный источник).
8. Debounce на поиск 300 мс.

### Общие
- Русский язык — основной язык документации, комментариев и интерфейса.
- Кодировка всех файлов — UTF-8 (с BOM при необходимости).

---

## 10. Команды сборки и запуска (планируемые)

```bash
# Установка зависимостей
npm install

# Разработка (Vite dev server + Hono на порту 3000)
npm run dev

# Сборка (фронтенд → dist/public, бэкенд → dist/boot.js)
npm run build

# Запуск в продакшене
npm run start

# База данных
npm run db:generate   # генерация миграций через drizzle-kit
npm run db:migrate    # применение миграций
npm run db:push       # push схемы в БД

# Seed
npx tsx db/seed.ts
```

---

## 11. Тестирование

### Чек-лист перед сдачей работы
1. Файл физически существует, размер > 0 байт, дата создания свежая
2. Кодировка UTF-8: открывается в Python с `encoding='utf-8'`, нет кракозябр
3. Содержимое не является только шаблоном — есть реальные данные
4. Логи чистые: нет ERROR / CRITICAL
5. Автоматизация запускается без ошибок, создаёт выходные файлы

### Интеграционные сценарии (E2E)
- Регистрация → курс → урок → завершить → тест → сертификат
- Админ создаёт курс → модуль → HTML-урок (inline) → пользователь видит
- Админ загружает HTML+CSS на S3 → пользователь видит в iframe

### Красные флаги (нельзя сдавать)
- В логах есть ERROR / CRITICAL
- Файл пустой или 1 KB (только шаблон)
- Кракозябры вместо текста
- Скрипт падает при запуске
- Нет обработки исключений

---

## 12. Безопасность

- Backend является единственным источником истины для доступа, прогресса, тестов и сертификатов.
- Результаты тестов нельзя хранить только во frontend.
- Сертификат нельзя выдавать на основании неподтверждённого клиентского события.
- Published-версии программ, курсов, модулей и тестов нельзя изменять без создания новой версии.
- HTML ZIP открывается в sandboxed iframe.
- Защита от path traversal при работе с ZIP-архивами.
- Результаты HTML-тестов принимаются только при активной backend-попытке.
- Все критичные действия логируются (аудит).

---

## 13. Конфигурация агента Kimi

Проект использует Kimi Code CLI с богатой библиотекой скиллов.

### Основные конфиги
- `.kimi/agent.yaml` — корневая конфигурация агента, определяет подагентов
- `.kimi/coder.yaml` — конфигурация подагента для программирования
- `.kimi/system_prompt.md` — системный промпт с авто-выбором скиллов

### Ключевые скиллы (расположены в `.kimi/skills/`)
| Скилл | Назначение |
|---|---|
| `writing-plans` | Детальное планирование реализации по микро-задачам |
| `brainstorming` | Уточнение требований перед разработкой |
| `test-driven-development` | Разработка через тесты (RED-GREEN-REFACTOR) |
| `design-system` | UI/UX дизайн-системы |
| `code_reviewer` | Систематизированное ревью кода |
| `project_planner` | Декомпозиция, приоритизация, таймлайн |
| `task_tracker` | Управление задачами и прогрессом |
| `skill_router` | Авто-определение контекста задачи |
| `firecrawl-web` | Веб-скрапинг и поиск |

### Правила работы агента (из `.kimi/SKILL.md` и `.kimi/system_prompt.md`)
- Не сдавать работу без проверки.
- Проверять кодировку UTF-8.
- Проверять логи на отсутствие ERROR.
- Использовать подходящие скиллы автоматически, без явного запроса пользователя.
- Всегда отвечать на русском языке.

---

## 14. Roadmap (из `build-from-scratch/04-TASKS.md`)

| День | Фокус |
|---|---|
| День 1 | Бэкенд: инициализация, БД, ядро, публичное API, админ API, seed |
| День 2 | Фронтенд: инфраструктура, публичные страницы |
| День 3 | Админ-панель: дашборд, конструктор курсов/модулей/уроков |
| День 4 | Интеграция: E2E-тестирование, исправление ошибок, сборка, деплой |

---

## 15. Как начать работу

1. Прочитать `build-from-scratch/01-TZ.md` для понимания стека и структуры.
2. При необходимости углубиться в детали — `tzDAc.md` (полное ТЗ).
3. Следовать планам в `02-BACKEND.md` и `03-FRONTEND.md` (задачи по 2–5 минут).
4. Обновлять прогресс в `04-TASKS.md`.
5. Соблюдать конвенции из раздела 9 настоящего файла.
6. Перед сдачей — пройти чек-лист из раздела 11.

---

## 16. Правила работы агента при выполнении задач

> **Критерий готовности:** задача считается завершённой только если реализация сделана, тесты/линтер/сборка проходят, а изменения перепроверены вручную по логике задачи.

### Обязательный порядок действий

1. **Изучи код и существующие паттерны**
   - Прочитай все релевантные файлы перед изменениями.
   - Не делай предположений о структуре — проверь фактическое состояние.

2. **Используй подагентов для исследования кодовой базы**
   - **Для массового поиска, обхода структуры или анализа паттернов запускай `explore`-подагентов**.
   - Не трать основной контекст на десятки вызовов `grep`/`glob`/`ReadFile`.
   - Делегируй исследование: сформулируй задачу для explore-агента, получи сводку с файлами и фрагментами.
   - Работай с результатом подагента: на его основе планируй и реализуй изменения.

3. **Составь короткий план**
   - Опиши, что и где будет изменено (файлы, строки, логика).
   - Согласуй план с пользователем, если задача нетривиальная.

4. **Реализуй минимально необходимыми изменениями**
   - Не переписывай лишнее.
   - Следуй существующему стилю кода и архитектуре.

5. **Запусти все релевантные проверки**
   - Тесты (`npm test`, `vitest`, `jest` и т.д.).
   - Линтер (`eslint`, `tsc --noEmit`, `drizzle-kit check` и т.д.).
   - Форматтер (`prettier --check` или эквивалент).
   - Сборка (`npm run build`).

6. **Не останавливайся после первой ошибки**
   - Если проверка падает — читай ошибку, исправляй, запускай снова.
   - Повторяй цикл до получения зелёного результата или объективного блокера.
   - Объективный блокер должен быть задокументирован и явно указан в отчёте.

7. **Не подменяй и не ослабляй**
   - Не удаляй и не откатывай чужие изменения без явного разрешения.
   - Не подменяй тесты и не ослабляй проверки ради прохождения.
   - Не комментируй падающие тесты вместо исправления.

### Отчёт по завершении

По окончании работы обязательно дай краткий отчёт:

- **Что изменено:** перечень файлов и ключевых правок.
- **Какие команды запускались:** полный список проверок.
- **Какие проверки прошли:** зелёные результаты.
- **Что не удалось проверить и почему:** объективные блокеры (если есть).

### Красные флаги (нельзя сдавать)

- ❌ Работа сдана без запуска тестов/линтера/сборки.
- ❌ В логах есть ERROR / CRITICAL / FAILED.
- ❌ Файл пустой или содержит только шаблон/заглушку.
- ❌ Кракозябры вместо текста (не UTF-8).
- ❌ Скрипт падает при запуске.
- ❌ Тесты закомментированы или удалены вместо исправления.
- ❌ Чужие изменения откачены без согласования.
- ❌ Отчёт отсутствует или неполный.

**Если вижу эти сигналы — исправляю, не сдаю!**
