# 📋 Task Tracker — DreamDocs Academy (сборка с нуля)

> **Скилл**: `task_tracker` + `project_planner`  
> **Формат**: Todo → In Progress → Done  
> **Приоритеты**: 🔴 High / 🟡 Medium / 🟢 Low

---

## 🔴 High Priority — Must Have

### Epic 0: Инициализация проекта
- [ ] **B.0.1** package.json + type module + scripts
- [ ] **B.0.2** tsconfig.json strict + aliases
- [ ] **B.0.3** vite.config.ts + devServer + aliases
- [ ] **B.0.4** tailwind.config.js + postcss + colors
- [ ] **B.0.5** .env + .env.example
- [ ] **B.0.6** api/lib/env.ts — Zod валидация env
- [ ] **B.0.7** drizzle.config.ts
- [ ] **B.0.8** index.html + src/main.ts заглушка
- [ ] **B.0.9** Проверка: `npm run dev` на порту 3000

### Epic 1: База данных
- [ ] **B.1.1** db/schema.ts — users table + indexes
- [ ] **B.1.2** db/schema.ts — courses table + indexes
- [ ] **B.1.3** db/schema.ts — modules table + indexes + cascade
- [ ] **B.1.4** db/schema.ts — lessons table + LessonContentSchema + indexes
- [ ] **B.1.5** db/schema.ts — tests, questions, progress, testAttempts, certificates
- [ ] **B.1.6** db/relations.ts — Drizzle relations
- [ ] **B.1.7** contracts/types.ts + constants.ts + errors.ts
- [ ] **B.1.8** db/migrate.ts — programmatic migrate
- [ ] **B.1.9** `npm run db:generate` — проверка

### Epic 2: Backend Core
- [ ] **B.2.1** api/queries/connection.ts — Drizzle singleton
- [ ] **B.2.2** api/lib/cookies.ts — cookie options
- [ ] **B.2.3** api/local-auth.ts — hashPassword + verifyPassword
- [ ] **B.2.4** api/local-auth.ts — createToken + verifyToken (jose)
- [ ] **B.2.5** api/local-auth.ts — getUserFromCookie + set/clear
- [ ] **B.2.6** api/context.ts — createContext
- [ ] **B.2.7** api/middleware.ts — public, authed, admin, superadmin
- [ ] **B.2.8** api/boot.ts — Hono + tRPC + health check + graceful shutdown

### Epic 3: Public API
- [ ] **B.3.1** api/auth-router.ts — register + login + me + logout
- [ ] **B.3.2** api/auth-router.ts — createUser (admin)
- [ ] **B.3.3** api/course-router.ts — list + getBySlug + getById (nested)
- [ ] **B.3.4** api/lesson-router.ts — getById + getByModule + getContext
- [ ] **B.3.5** api/progress-router.ts — getByCourse + completeLesson
- [ ] **B.3.6** api/test-router.ts — getById + getByLesson + submit
- [ ] **B.3.7** api/certificate-router.ts — getByCourse + issue
- [ ] **B.3.8** api/upload-router.ts — getPresignedUrl + limits + whitelist
- [ ] **B.3.9** api/router.ts — merge all routers

### Epic 4: Admin API
- [ ] **B.4.1** api/admin/index.ts — merge admin routers
- [ ] **B.4.2** api/admin/course-router.ts — CRUD + unique slug check
- [ ] **B.4.3** api/admin/module-router.ts — CRUD + reorder (transaction)
- [ ] **B.4.4** api/admin/lesson-router.ts — CRUD + reorder + uploadHtml
- [ ] **B.4.5** api/admin/user-router.ts — stats + listUsers + updateRole

### Epic 5: Frontend Infrastructure
- [ ] **F.5.1** src/main.ts — Vue app + plugins
- [ ] **F.5.2** src/router/index.ts — hash mode + routes + guards
- [ ] **F.5.3** src/lib/trpc.ts — vanilla client + superjson + headers
- [ ] **F.5.4** src/stores/auth.ts — Pinia + offline fallback
- [ ] **F.5.5** src/components/ui/Button.vue — CVA variants
- [ ] **F.5.6** src/components/ui/Input.vue + Textarea.vue + Select.vue
- [ ] **F.5.7** src/components/ui/Badge.vue + Skeleton.vue + Progress.vue
- [ ] **F.5.8** src/components/ui/Table.vue + TableHead/Row/Cell.vue
- [ ] **F.5.9** src/components/ui/Dialog.vue + Tabs.vue + Accordion.vue
- [ ] **F.5.10** src/components/Header.vue + Footer.vue + AuthLayout.vue

### Epic 6: Public Pages
- [ ] **F.6.1** src/pages/HomePage.vue — лендинг
- [ ] **F.6.2** src/pages/LoginPage.vue — табы + валидация + toast
- [ ] **F.6.3** src/pages/CoursesPage.vue — список + фильтр + skeleton
- [ ] **F.6.4** src/pages/CoursePage.vue — детали + аккордеон + блокировка модулей
- [ ] **F.6.5** src/pages/LessonPage.vue — HTML inline + iframe + завершить
- [ ] **F.6.6** src/pages/TestPage.vue — прохождение + результат
- [ ] **F.6.7** src/pages/ProfilePage.vue — профиль + прогресс + сертификаты
- [ ] **F.6.8** src/pages/CertificatePage.vue — просмотр
- [ ] **F.6.9** src/pages/NotFoundPage.vue

### Epic 7: Admin Builder
- [ ] **F.7.1** src/pages/AdminPage.vue — дашборд статистики
- [ ] **F.7.2** src/pages/AdminCoursesPage.vue — таблица + поиск + пагинация + удаление
- [ ] **F.7.3** src/pages/CourseBuilderPage.vue — форма create/edit + валидация slug
- [ ] **F.7.4** src/pages/ModuleBuilderPage.vue — список + drag-and-drop reorder + форма
- [ ] **F.7.5** src/pages/LessonBuilderPage.vue — список + reorder + форма
- [ ] **F.7.6** src/pages/LessonBuilderPage.vue — HTML inline tab
- [ ] **F.7.7** src/pages/LessonBuilderPage.vue — HTML upload tab (presigned → PUT → uploadHtml)
- [ ] **F.7.8** src/pages/LessonBuilderPage.vue — iframe preview (srcdoc / src)

---

## 🟡 Medium Priority — Should Have

### Backend Polish
- [ ] **B.M.1** db/seed.ts — seed данные (1 admin, 2 курса, 3 модуля, 6 уроков, 1 тест)
- [ ] **B.M.2** Rate limiting на auth endpoints (защита от брутфорса)
- [ ] **B.M.3** Health check для БД (`/health/db`)
- [ ] **B.M.4** `npm run build` проходит без ошибок
- [ ] **B.M.5** `npm run start` production сервер работает

### Frontend Polish
- [ ] **F.M.1** vue-sonner toast на всех mutations (success/error)
- [ ] **F.M.2** Cache invalidation после всех admin mutations
- [ ] **F.M.3** Optimistic update для progress.completeLesson
- [ ] **F.M.4** Debounce 300ms на поиск в AdminCoursesPage
- [ ] **F.M.5** Image upload через S3 в CourseBuilderPage

### Integration
- [ ] **I.M.1** E2E: регистрация → курс → урок → завершить → тест → сертификат
- [ ] **I.M.2** E2E: admin создаёт курс → модуль → html-урок (inline) → user видит
- [ ] **I.M.3** E2E: admin загружает HTML+CSS на S3 → user видит в iframe

---

## 🟢 Low Priority — Could Have

- [ ] **L.1** DOMPurify для v-html (дополнительная безопасность)
- [ ] **L.2** PDF generation для сертификатов (pdf-lib)
- [ ] **L.3** README.md с инструкциями по запуску
- [ ] **L.4** Docker + docker-compose для dev окружения
- [ ] **L.5** E2E тесты (Playwright) — базовый happy path

---

## 📊 Статистика

| Категория | Количество |
|-----------|------------|
| Всего задач | 63 |
| High (Must) | 50 |
| Medium (Should) | 12 |
| Low (Could) | 5 |

---

## 📅 Roadmap

```
День 1: Backend
├── Утро:   Epic 0 (Init) + Epic 1 (DB)
├── День:   Epic 2 (Core) + Epic 3 (Public API)
└── Вечер:  Epic 4 (Admin API) + Seed

День 2: Frontend Infra + Public Pages
├── Утро:   Epic 5 (Infra)
├── День:   Epic 6 часть 1 (Home, Login, Courses, Course)
└── Вечер:  Epic 6 часть 2 (Lesson, Test, Profile, Certificate)

День 3: Admin Builder
├── Утро:   Epic 7 часть 1 (AdminPage, AdminCourses, CourseBuilder)
├── День:   Epic 7 часть 2 (ModuleBuilder, LessonBuilder)
└── Вечер:  Medium приоритет (toast, cache, optimistic)

День 4: Интеграция
├── Утро:   E2E тестирование flow
├── День:   Bug fixes + Build check
└── Вечер:  README + Deploy
```

---

## ⚠️ Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| MySQL не поднят | Средняя | Высокое | SQLite fallback для dev |
| S3 ключи не рабочие | Средняя | Среднее | Mock upload для dev |
| Перегрузка context window агента | Высокая | Высокое | Работаем по эпикам, не всё сразу |
| Vue 3 reactivity edge cases | Низкая | Среднее | Pinia + computed |

---

**Как пользоваться**: После каждой выполненной задачи отмечай `[x]`. Работай строго по порядку внутри эпика. Не прыгай между эпиками.
