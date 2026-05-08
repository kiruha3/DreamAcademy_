# Frontend Plan: DreamDocs Academy

> **Агент**: frontend/fullstack developer  
> **Скилл**: `writing-plans` — микро-задачи по 2-5 мин  
> **Источник спецификации**: `01-TZ.md` (разделы 2, 5, 6)
> **Backend API**: готов, описан в `02-BACKEND.md`

---

## Phase 5: Infrastructure (35 мин)

### Задача 5.1: main.ts
**Файл**: `src/main.ts` — create  
**Что делать**: `createApp(App)`, `use(router)`, `use(pinia)`, `use(VueQueryPlugin)`. Импорт `src/index.css`.  
**DoD**: Приложение монтируется в `#app`.

### Задача 5.2: Vue Router
**Файл**: `src/router/index.ts` — create  
**Что делать**: `createRouter({ history: createWebHashHistory(), routes })`. Все routes из ТЗ §5.1. Guards: `beforeEach` проверяет meta.requiresAuth / guestOnly / requiresAdmin. Auth state из Pinia store.  
**DoD**: `/courses` без auth → редирект `/login`. `/login` при auth → редирект `/courses`.

### Задача 5.3: tRPC Client
**Файл**: `src/lib/trpc.ts` — create  
**Что делать**: `createTRPCProxyClient<AppRouter>` с `httpBatchLink`. URL: `/api/trpc`. Transformer: superjson. Headers: `Authorization: Bearer ${localStorage.getItem("dreamdocs_auth")}`.  
**DoD**: Типы tRPC пробрасываются на фронт (AppRouter типизирован).

### Задача 5.4: Pinia Auth Store
**Файл**: `src/stores/auth.ts` — create  
**Что делать**: State: `user`, `isLoading`, `isAdmin`. Actions: `fetchUser()` — `trpc.auth.me.query()`, `login(credentials)` — `trpc.auth.login.mutate()` → `localStorage.setItem("dreamdocs_auth", token)` → `window.location.reload()`, `logout()` — `localStorage.removeItem("dreamdocs_auth")` + `trpc.auth.logout.query()` → reload, `register()` — аналогично login. Getter: `isAdmin` — user.role === 'admin' || 'superadmin'.  
**DoD**: Login → reload → me возвращает user.

### Задача 5.5: UI Button
**Файл**: `src/components/ui/Button.vue` — create  
**Что делать**: `class-variance-authority`. Variants: default (bg-primary text-white), outline (border), ghost (transparent), destructive (bg-danger), link. Props: variant, size (sm/default/lg).  
**DoD**: Рендерится 5 вариантов.

### Задача 5.6: UI Inputs
**Файлы**: `src/components/ui/Input.vue`, `Textarea.vue`, `Select.vue` — create  
**DoD**: Принимают v-model, отображаются корректно.

### Задача 5.7: UI Feedback
**Файлы**: `src/components/ui/Badge.vue`, `Skeleton.vue`, `Progress.vue` — create  
**DoD**: Badge: 4 variants. Skeleton: w/h props. Progress: value/max.

### Задача 5.8: UI Table
**Файлы**: `src/components/ui/Table.vue`, `TableHead.vue`, `TableRow.vue`, `TableCell.vue` — create  
**DoD**: Table рендерит slot content.

### Задача 5.9: UI Overlays
**Файлы**: `src/components/ui/Dialog.vue`, `Tabs.vue`, `Accordion.vue` — create  
**Что делать**: radix-vue primitives. Dialog: trigger + content. Tabs: list + trigger + content. Accordion: collapsible items.  
**DoD**: Открываются/закрываются без ошибок.

### Задача 5.10: Layout
**Файлы**: `src/components/Header.vue`, `Footer.vue`, `AuthLayout.vue` — create  
**Что делать**: Header: logo, навигация (Home, Courses, Profile, Admin), auth state (login/logout). Footer: простой. AuthLayout: sidebar + main content area для /admin.  
**DoD**: Header показывает правильные ссылки в зависимости от auth.

---

## Phase 6: Public Pages (55 мин)

### Задача 6.1: HomePage
**Файл**: `src/pages/HomePage.vue` — create  
**Что делать**: Лендинг: заголовок, описание платформы, CTA кнопка "К курсам" → `/courses`.  
**DoD**: Страница открывается по `/`.

### Задача 6.2: LoginPage
**Файл**: `src/pages/LoginPage.vue` — create  
**Что делать**: Табы (radix-vue Tabs): Вход / Регистрация. Формы с валидацией (Zod-lite на фронте: email format, password min 6). TanStack Query mutations. Ошибки — toast через `vue-sonner`. После успеха: localStorage token + reload.  
**DoD**: Можно зарегистрироваться и залогиниться.

### Задача 6.3: CoursesPage
**Файл**: `src/pages/CoursesPage.vue` — create  
**Что делать**: `trpc.course.list.useQuery({ role: user?.role })`. Карточки (grid): image, title, subtitle, level, duration. Skeleton loading. Фильтр по targetRole (скрывать курсы не для роли пользователя, если role !== 'user').  
**DoD**: Список курсов отображается с карточками.

### Задача 6.4: CoursePage
**Файл**: `src/pages/CoursePage.vue` — create  
**Что делать**: `trpc.course.getBySlug.useQuery($route.params.slug)`. Заголовок, описание, изображение. Аккордеон модулей (radix-vue Accordion). В каждом модуле: список уроков. Прогресс: отмечать пройденные. **Блокировка**: модуль 1 всегда открыт. Модуль N открыт только если все уроки модуля N-1 имеют `isCompleted=true` в progress. Исключение: `module.isLocked === true` → принудительно закрыт.  
**DoD**: Модули показывают статус locked/unlocked.

### Задача 6.5: LessonPage
**Файл**: `src/pages/LessonPage.vue` — create  
**Что делать**: `trpc.lesson.getContext.useQuery($route.params.lessonId)`. Заголовок урока. Контент:
- Если `lessonType === "html"` и `content.html` → `v-html="content.html"` (доверенный контент из админки).
- Если `lessonType === "html"` и `content.s3HtmlKey` → `<iframe :src="s3Url + content.s3HtmlKey" sandbox="allow-same-origin" class="w-full min-h-[600px]" />`. Если `content.s3CssKey` → `<link rel="stylesheet" :href="s3Url + content.s3CssKey" />`.
- Другие типы → placeholder.
Навигация: "← Предыдущий урок", "Следующий урок →". Кнопка "Отметить как завершённый" → `trpc.progress.completeLesson.useMutation()` с `onSuccess` invalidate `lesson.getContext` и `course.getBySlug`. **Optimistic update**: сразу менять UI до ответа сервера.  
**DoD**: HTML-уроки отображаются (inline и S3). Прогресс сохраняется.

### Задача 6.6: TestPage
**Файл**: `src/pages/TestPage.vue` — create  
**Что делать**: `trpc.test.getById.useQuery($route.params.testId)`. Отображение вопросов: radio (single) или checkbox (multiple). Кнопка "Отправить" → `trpc.test.submit.useMutation()`. Проверка maxAttempts (если превышено — показать сообщение). Результат: score, passed/failed.  
**DoD**: Тест проходится, результат показывается.

### Задача 6.7: ProfilePage
**Файл**: `src/pages/ProfilePage.vue` — create  
**Что делать**: Данные пользователя (name, email, role). Список курсов с прогрессом (пройдено / всего уроков). Список сертификатов.  
**DoD**: Профиль отображает прогресс и сертификаты.

### Задача 6.8: CertificatePage
**Файл**: `src/pages/CertificatePage.vue` — create  
**Что делать**: `trpc.certificate.getByCourse.useQuery()` или по id. Показать certificateNumber, courseTitle, issuedAt.  
**DoD**: Сертификат отображается.

### Задача 6.9: NotFoundPage
**Файл**: `src/pages/NotFoundPage.vue` — create  
**DoD**: 404 отображается на несуществующих маршрутах.

---

## Phase 7: Admin Builder (50 мин)

### Задача 7.1: AdminPage
**Файл**: `src/pages/AdminPage.vue` — create  
**Что делать**: Дашборд: карточки статистики (`trpc.admin.user.getDashboardStats.useQuery()`). Таблица последних 10 пользователей. Ссылка "Управление курсами" → `/admin/courses`.  
**DoD**: Статистика загружается, ссылка работает.

### Задача 7.2: AdminCoursesPage
**Файл**: `src/pages/AdminCoursesPage.vue` — create  
**Что делать**: `trpc.admin.course.listAll.useQuery()`. Таблица: ID, Title, Slug, Target Role, Published, Modules count. Поиск по title/slug (debounce 300ms). Пагинация (опционально). Кнопки: Создать курс → `/admin/courses/new`, Редактировать → `/admin/courses/:id`, Удалить → `confirm()` → `deleteMutation` с invalidate `listAll`.  
**DoD**: CRUD курсов через UI.

### Задача 7.3: CourseBuilderPage
**Файл**: `src/pages/CourseBuilderPage.vue` — create  
**Что делать**: Форма: Title* (required), Slug* (regex `^[a-z0-9-]+$`, live validation), Subtitle, Description (textarea), Level (select), Duration, Image (URL + preview), TargetRole (select), IsPublished (toggle). Режим: если `$route.params.id === 'new'` → create mutation, иначе → prefetch + update mutation. После успеха: toast (vue-sonner) + кнопка "Перейти к модулям" → `/admin/modules/${courseId}`.  
**DoD**: Курс создаётся и редактируется.

### Задача 7.4: ModuleBuilderPage
**Файл**: `src/pages/ModuleBuilderPage.vue` — create  
**Что делать**: Заголовок с courseTitle (`trpc.course.getById.useQuery($route.params.courseId)`). Список модулей — **drag-and-drop reorder** через `@vueuse/components` `useSortable` (или кнопки ↑↓ как MVP). Форма добавления: Number (авто = max+1), Title* (required), Description (textarea), ModuleType (select), IsLocked (toggle). Для каждого модуля: кнопка "Уроки" → `/admin/lessons/:moduleId`, Edit (inline или dialog), Delete → confirm. Reorder mutation с invalidate.  
**DoD**: Модули создаются, редактируются, reorder работает.

### Задача 7.5: LessonBuilderPage — список и форма
**Файл**: `src/pages/LessonBuilderPage.vue` — create  
**Что делать**: Заголовок с moduleTitle. Список уроков — reorder (как модули). Форма добавления: Number (авто), Title* (required), LessonType (select: article/screencast/presentation/test/html), Duration. Для каждого урока: Edit, Delete.  
**DoD**: Уроки создаются и удаляются.

### Задача 7.6: LessonBuilderPage — HTML секция
**Файл**: `src/pages/LessonBuilderPage.vue` — update  
**Что делать**: HTML-секция видна только если `lessonType === "html"`. Табы (radix-vue Tabs):
- **Tab Inline HTML**: textarea (`v-model="htmlContent"`). Кнопка Save → `trpc.admin.lesson.update.mutate({ id, content: { html: htmlContent } })`.
- **Tab Upload Files**: `<input type="file" accept=".html,.css" multiple>`. При выборе: для каждого файла `upload.getPresignedUrl.query({ filename, contentType, folder: "lessons" })` → `fetch(presignedUrl, { method: "PUT", body: file })` → получаем key. После всех загрузок: `trpc.admin.lesson.uploadHtml.mutate({ lessonId, s3HtmlKey, s3CssKey })`.  
**DoD**: Inline HTML сохраняется. Файлы загружаются на S3 и привязываются к уроку.

### Задача 7.7: LessonBuilderPage — Preview
**Файл**: `src/pages/LessonBuilderPage.vue` — update  
**Что делать**: Iframe preview под формой:
- Если `content.html` → `srcdoc="content.html"`
- Если `content.s3HtmlKey` → `:src="s3Url + content.s3HtmlKey"`
- Sandbox: `allow-same-origin` (без скриптов).  
**DoD**: Превью обновляется после сохранения.

---

## Phase 8: Integration + Polish (25 мин)

### Задача 8.1: Toast everywhere
**Файл**: `src/main.ts` + mutations  
**Что делать**: `vue-sonner` toast на успех и ошибку во всех mutations. `import { toast } from 'vue-sonner'`.  
**DoD**: Любая mutation показывает toast.

### Задача 8.2: Cache invalidation
**Все mutation pages** — update  
**Что делать**: После каждой admin mutation: `queryClient.invalidateQueries({ queryKey: ['admin', 'course', 'listAll'] })` (и аналогично для modules/lessons). После `completeLesson`: invalidate `course.getBySlug` и `lesson.getContext`.  
**DoD**: Данные обновляются без F5.

### Задача 8.3: Build check
**Команда**: `npm run build`  
**DoD**: Нет ошибок TypeScript. `dist/public` собран.

---

## 🛡️ Frontend Rules

1. `<script setup lang="ts">` only. Никаких Options API.
2. Никаких `any`. Strict TypeScript.
3. TanStack Query: `useQuery` / `useMutation` напрямую. Никаких custom wrappers.
4. После mutation — `invalidateQueries`.
5. Optimistic updates где возможно (progress.completeLesson).
6. Tailwind only. Никаких inline styles.
7. `v-html` только для контента из админки (доверенный источник).
8. Debounce на поиск (300ms).
