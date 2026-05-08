# Backend Plan: DreamDocs Academy

> **Агент**: backend/fullstack developer  
> **Скилл**: `writing-plans` — микро-задачи по 2-5 мин  
> **Источник спецификации**: `01-TZ.md` (разделы 2, 3, 4, 6, 7, 8)

---

## Phase 0: Init (25 мин)

### Задача 0.1: package.json
**Файл**: `package.json` — create/update  
**Что делать**: `"type": "module"`, scripts: dev, build, start, db:generate, db:migrate, db:push. Зависимости из ТЗ §1.  
**DoD**: `npm install` проходит без ошибок.

### Задача 0.2: tsconfig.json
**Файл**: `tsconfig.json` — create  
**Что делать**: `"strict": true`, aliases: `@/`, `@db/`, `@contracts/`, `@api/`.  
**DoD**: `npx tsc --noEmit` не ругается на конфиг.

### Задача 0.3: vite.config.ts
**Файл**: `vite.config.ts` — create  
**Что делать**: `@hono/vite-dev-server` (entry: api/boot.ts), `@vitejs/plugin-vue`, aliases, port 3000, outDir dist/public.  
**DoD**: `npm run dev` запускается на порту 3000.

### Задача 0.4: tailwind + postcss
**Файлы**: `tailwind.config.js`, `postcss.config.js`, `src/index.css` — create  
**Что делать**: Colors: primary #00A8E8, background #F4F6F8, card #FFFFFF, text-primary #1A202C, text-secondary #4A5568, text-muted #718096, border #E2E8F0, success #22C55E, danger #E53E3E, dark-header #2D3748. Tailwind directives в index.css.  
**DoD**: `src/index.css` импортируется без ошибок.

### Задача 0.5: env + dotenv
**Файлы**: `.env`, `.env.example`, `api/lib/env.ts` — create  
**Что делать**: `.env` по ТЗ §7. `api/lib/env.ts`: Zod schema (DATABASE_URL url, APP_SECRET min32, S3_REGION, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL, APP_ID, APP_SECRET, OWNER_UNION_ID). `EnvSchema.parse(process.env)`. Fail fast.  
**DoD**: При отсутствующей переменной — процесс падает с понятной ошибкой.

### Задача 0.6: drizzle.config.ts
**Файл**: `drizzle.config.ts` — create  
**Что делать**: schema db/schema.ts, out db/migrations, dialect mysql, dbCredentials url.  
**DoD**: `npm run db:generate` не падает.

---

## Phase 1: Database (40 мин)

### Задача 1.1: schema — users
**Файл**: `db/schema.ts` — create, table `users`  
**DoD**: Поля + индексы email, unionId, role.

### Задача 1.2: schema — courses
**Файл**: `db/schema.ts` — append, table `courses`  
**DoD**: Поля + индексы slug, targetRole, isPublished.

### Задача 1.3: schema — modules
**Файл**: `db/schema.ts` — append, table `modules`  
**DoD**: Поля + индексы courseId, (courseId, number). onDelete cascade на courseId.

### Задача 1.4: schema — lessons + LessonContentSchema
**Файл**: `db/schema.ts` — append, table `lessons`  
**Что делать**: `export const LessonContentSchema = z.object({ html: z.string().max(50000).optional(), s3HtmlKey: z.string().optional(), s3CssKey: z.string().optional(), posterUrl: z.string().optional() }).refine(d => !(d.html && d.s3HtmlKey)).refine(d => d.html || d.s3HtmlKey)`. content: json("content").$type<z.infer<typeof LessonContentSchema>>().  
**DoD**: Поля + индексы moduleId, (moduleId, number). onDelete cascade.

### Задача 1.5: schema — tests, questions, progress, testAttempts, certificates
**Файл**: `db/schema.ts` — append  
**DoD**: Все таблицы с индексами. progress: unique (userId, lessonId).

### Задача 1.6: relations
**Файл**: `db/relations.ts` — create  
**Что делать**: courses → modules (1:N), modules → lessons (1:N).  
**DoD**: Drizzle relations определены.

### Задача 1.7: contracts
**Файлы**: `contracts/types.ts`, `contracts/constants.ts`, `contracts/errors.ts` — create  
**Что делать**: types.ts — re-export из db/schema + `type LessonContent = z.infer<typeof LessonContentSchema>` + `type CourseWithModules = ...`. constants.ts — AUTH_COOKIE, OWNER_UNION_ID, error messages. errors.ts — TRPCError code → message mapping.  
**DoD**: Типы импортируются без `any`.

### Задача 1.8: migrate script
**Файл**: `db/migrate.ts` — create  
**Что делать**: Programmatic migrate через drizzle-kit.  
**DoD**: `npm run db:migrate` применяет миграции.

### Задача 1.9: generate migration
**Команда**: `npm run db:generate`  
**DoD**: SQL-файл создаётся в `db/migrations/` без ошибок.

---

## Phase 2: Backend Core (40 мин)

### Задача 2.1: DB connection
**Файл**: `api/queries/connection.ts` — create  
**Что делать**: Drizzle singleton с mysql2. Использовать `env.DATABASE_URL`.  
**DoD**: `getDb()` возвращает клиента.

### Задача 2.2: Cookies
**Файл**: `api/lib/cookies.ts` — create  
**Что делать**: Опции кук: httpOnly, secure (prod), sameSite "strict", maxAge 7 дней (60*60*24*7).  
**DoD**: Константы экспортируются.

### Задача 2.3: Password hash
**Файл**: `api/local-auth.ts` — create section  
**Что делать**: `hashPassword(password)` — bcryptjs hash. `verifyPassword(password, hash)` — bcryptjs compare.  
**DoD**: Хеширует и верифицирует.

### Задача 2.4: JWT
**Файл**: `api/local-auth.ts` — append  
**Что делать**: `createToken(payload)` — jose SignJWT, HS256, exp 7d. `verifyToken(token)` — jose jwtVerify. Секрет из `env.APP_SECRET`.  
**DoD**: Создаёт и верифицирует токен.

### Задача 2.5: Cookie auth
**Файл**: `api/local-auth.ts` — append  
**Что делать**: `setAuthCookie(resHeaders, token)` — Set-Cookie. `clearAuthCookie(resHeaders)`. `getUserFromCookie(req)` — читает cookie, verifyToken, достаёт user из БД.  
**DoD**: Cookie ставится и читается.

### Задача 2.6: Context
**Файл**: `api/context.ts` — create  
**Что делать**: `createContext({req, resHeaders})` → `{user, req, resHeaders, db}`. user = await getUserFromCookie(req).  
**DoD**: Context типизирован.

### Задача 2.7: Middleware
**Файл**: `api/middleware.ts` — create  
**Что делать**: `publicProcedure` = tRPC procedure. `authedProcedure` = public.use(({ctx, next}) => { if(!ctx.user) throw TRPCError(UNAUTHORIZED); return next({ctx: {...ctx, user: ctx.user}}); }). `adminProcedure` = authed.use (role admin/superadmin). `superAdminProcedure` = authed.use (role superadmin).  
**DoD**: Все 4 middleware работают.

### Задача 2.8: Boot
**Файл**: `api/boot.ts` — create  
**Что делать**: Hono app. tRPC adapter на `/api/trpc`. Health check GET `/health` → 200. Serve static `dist/public` в production (via `api/lib/vite.ts`). Graceful shutdown (SIGINT/SIGTERM).  
**DoD**: `npm run dev` → `/health` 200. `npm run build && npm run start` → статика отдаётся.

---

## Phase 3: Public API (50 мин)

### Задача 3.1: Auth router
**Файл**: `api/auth-router.ts` — create  
**Что делать**: Zod схемы: RegisterSchema, LoginSchema, CreateUserSchema. register: проверить unique email → hash → create user → createToken → setAuthCookie + вернуть token для localStorage. login: find by email → verifyPassword → createToken → setAuthCookie. me: return ctx.user. logout: clearAuthCookie. createUser: admin only.  
**DoD**: Register → login → me возвращает user.

### Задача 3.2: Course router
**Файл**: `api/course-router.ts` — create  
**Что делать**: list: select from courses, where targetRole. getBySlug / getById: find + with relations (modules → lessons).  
**DoD**: `course.getBySlug` возвращает nested модули и уроки.

### Задача 3.3: Lesson router
**Файл**: `api/lesson-router.ts` — create  
**Что делать**: getById, getByModule, getContext (lesson + module + course + nextLesson по number).  
**DoD**: `lesson.getContext` возвращает nextLesson.

### Задача 3.4: Progress router
**Файл**: `api/progress-router.ts` — create  
**Что делать**: getByCourse: select where userId + courseId. completeLesson: upsert (userId, lessonId) → isCompleted=true, completedAt=now().  
**DoD**: `progress.completeLesson` создаёт запись.

### Задача 3.5: Test router
**Файл**: `api/test-router.ts` — create  
**Что делать**: getById / getByLesson: with questions. submit: проверить answers, считать score, проверить maxAttempts (count attempts), создать testAttempt.  
**DoD**: Submit возвращает score и attemptNumber.

### Задача 3.6: Certificate router
**Файл**: `api/certificate-router.ts` — create  
**Что делать**: getByCourse: select where userId + courseId. issue: проверить все уроки пройдены (progress) + финальный тест пройден (testAttempts isPassed) → создать certificate с номером `CERT-{userId}-{courseId}-{timestamp}`.  
**DoD**: Certificate создаётся только при выполнении условий.

### Задача 3.7: Upload router
**Файл**: `api/upload-router.ts` — create  
**Что делать**: Zod: filename, contentType (whitelist), folder (enum). S3 presigned PUT URL. Проверка размера (можно через presigned параметры). key = `${folder}/${nanoid()}-${filename}`.  
**DoD**: Presigned URL работает для HTML и CSS.

### Задача 3.8: Root router
**Файл**: `api/router.ts` — create  
**Что делать**: `router({ auth, course, lesson, progress, test, certificate, upload, admin })`. `mergeRouters` для admin.  
**DoD**: Все sub-роутеры подключены.

---

## Phase 4: Admin API (45 мин)

### Задача 4.1: Admin structure
**Файл**: `api/admin/index.ts` — create  
**Что делать**: Импорт course, module, lesson, user роутеров. Объединение в adminRouter.  
**DoD**: `trpc.admin.course.listAll` доступен.

### Задача 4.2: Admin course router
**Файл**: `api/admin/course-router.ts` — create  
**Что делать**: listAll, create (проверка unique slug → 409), update, delete (cascade).  
**DoD**: CRUD курсов работает.

### Задача 4.3: Admin module router
**Файл**: `api/admin/module-router.ts` — create  
**Что делать**: create, update, delete, reorder (transaction: обновить number всех модулей курса).  
**DoD**: Reorder атомарный.

### Задача 4.4: Admin lesson router
**Файл**: `api/admin/lesson-router.ts` — create  
**Что делать**: create, update, delete, reorder (transaction), uploadHtml (validate LessonContentSchema).  
**DoD**: uploadHtml переключает inline ↔ S3.

### Задача 4.5: Admin user router
**Файл**: `api/admin/user-router.ts` — create  
**Что делать**: getDashboardStats (COUNT users, courses, certificates, AVG score). listUsers (limit/offset/search). updateUserRole (superadmin only).  
**DoD**: Статистика возвращается.

---

## Phase 5: Seed + Polish (20 мин)

### Задача 5.1: Seed script
**Файл**: `db/seed.ts` — create  
**Что делать**: 1 admin, 2 курса, 3 модуля, 6 уроков (2 html: 1 inline, 1 S3-заглушка), 1 тест с 3 вопросами.  
**DoD**: `npx tsx db/seed.ts` наполняет БД.

### Задача 5.2: Graceful shutdown
**Файл**: `api/boot.ts` — update  
**Что делать**: process.on(SIGINT/SIGTERM) → close server → exit.  
**DoD**: Ctrl+C завершает процесс корректно.

### Задача 5.3: Build check
**Команда**: `npm run build`  
**DoD**: Нет ошибок TypeScript. `dist/public` и `dist/boot.js` созданы.

---

## 🛡️ Backend Rules

1. TypeScript strict. Никаких `any`.
2. Все inputs — Zod. Все ошибки — `TRPCError({ code, message })`.
3. Транзакции через Drizzle `db.transaction()`.
4. FK с `onDelete: "cascade"` где логично.
5. Index на каждом FK и часто искомом поле.
6. Env валидация — fail fast.
7. Graceful shutdown.
