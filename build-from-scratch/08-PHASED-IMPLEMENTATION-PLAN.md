# Phased Implementation Plan: DreamDocs Academy
# Реализация по этапам — инкрементальная доставка

> Основан на: `tzDAc.md` (30K+ строк), `07-IMPLEMENTATION-PLAN.md`
> Принцип: Каждая фаза — рабочий инкремент. Нельзя переходить к следующей без завершения предыдущей.

---

## Содержание

1. [Phase 0: Foundation — фундамент](#phase-0-foundation)
2. [Phase 1: Auth & Users — аутентификация и пользователи](#phase-1-auth--users)
3. [Phase 2: Content Builder — контент для админа](#phase-2-content-builder)
4. [Phase 3: Learning — прохождение и прогресс](#phase-3-learning)
5. [Phase 4: Certificates — сертификаты](#phase-4-certificates)
6. [Phase 5: Services — аудит, уведомления, email, rutube, импорт](#phase-5-services)
7. [Phase 6: Superadmin & Reports — настройки и отчеты](#phase-6-superadmin--reports)
8. [Phase 7: Polish & Deploy — полировка, E2E, деплой](#phase-7-polish--deploy)

---

## Phase 0: Foundation

> **Цель:** Проект собирается, база данных создаётся, сервер запускается, статика отдаётся.
> **Скиллы:** `writing-plans`, `test-driven-development`, `code_reviewer`

### 0.1 Инициализация проекта
- [ ] `package.json` — зависимости, скрипты
- [ ] `tsconfig.json` — strict, алиасы
- [ ] `vite.config.ts` — Hono dev server + Vue, порт 3000
- [ ] `drizzle.config.ts` — MySQL, миграции
- [ ] `tailwind.config.js` + `postcss.config.js` + `src/index.css` — цвета из ТЗ
- [ ] `.env.example` — все переменные
- [ ] `api/lib/env.ts` — Zod-валидация, fail fast
- [ ] `api/lib/cookies.ts` — опции HTTP-only cookie
- [ ] `api/lib/s3.ts` — AWS S3 клиент
- [ ] `api/lib/vite.ts` — отдача статики в production

### 0.2 Схема базы данных (все 26 таблиц)

#### Группа A: Пользователи и доступ
- [ ] `users` — пользователи (роли, статус)
- [ ] `invitations` — приглашения (токен, срок действия)
- [ ] `user_program_enrollments` — назначение программ

#### Группа B: Программы и версионирование
- [ ] `programs` — программы (целевая аудитория, сертификация)
- [ ] `program_versions` — версии программ (draft/published/archived)
- [ ] `courses` — курсы (ролевая ветка, обязательность)
- [ ] `course_versions` — версии курсов
- [ ] `modules` — модули (тип контента, блокировка)
- [ ] `module_versions` — версии модулей
- [ ] `module_contents` — контент модуля (HTML/PDF/Rutube)

#### Группа C: Тестирование
- [ ] `assessments` — тесты (мини-тест, итоговый, аттестация)
- [ ] `assessment_versions` — версии тестов
- [ ] `assessment_attempts` — попытки (статус, балл, ответы)
- [ ] `questions` + `answer_options` — архитектура native builder

#### Группа D: Прогресс и сертификаты
- [ ] `program_progress` — прогресс по программе
- [ ] `course_progress` — прогресс по курсу
- [ ] `module_progress` — прогресс по модулю
- [ ] `certificate_templates` — PDF-шаблоны (координаты полей)
- [ ] `certificates` — сертификаты (номер, PDF, QR, токен верификации)

#### Группа E: Сервисные таблицы
- [ ] `import_jobs` — импорт ZIP (статус, отчет)
- [ ] `notifications` — уведомления (тип, статус, метаданные)
- [ ] `audit_logs` — аудит (действие, субъект, до/после)
- [ ] `settings` — ключ-значение (категория, шифрование)
- [ ] `email_settings` — SMTP (хост, порт, логин, пароль зашифрован)
- [ ] `rutube_checks` — проверка доступности Rutube
- [ ] `report_exports` — асинхронный экспорт отчетов

### 0.3 Связи, миграции, контракты, seed
- [ ] `db/relations.ts` — все Drizzle relations (1:N)
- [ ] `contracts/types.ts` — интерфейсы + re-export из схемы
- [ ] `contracts/constants.ts` — AUTH_COOKIE, OWNER_UNION_ID, ошибки
- [ ] `contracts/errors.ts` — TRPCError -> message mapping
- [ ] `db/migrate.ts` — программный запуск миграций
- [ ] Генерация первой миграции `npm run db:generate`
- [ ] `db/seed.ts` — тестовые данные (superadmin, admin, программы, курсы, модули, тесты)
- [ ] Проверка `npm run db:push`

### 0.4 Ядро: подключение к БД, миддлвэр, boot, shutdown
- [ ] `api/queries/connection.ts` — Drizzle singleton с MySQL
- [ ] `api/lib/hash.ts` — bcryptjs (hash / verify)
- [ ] `api/lib/jwt.ts` — jose (create / verify, HS256, 7 дней)
- [ ] `api/lib/auth.ts` — cookie auth (set / clear / getUserFromCookie)
- [ ] `api/context.ts` — tRPC контекст (user, req, resHeaders, db)
- [ ] `api/middleware.ts` — 4 процедуры (public / authed / admin / superAdmin)
- [ ] `api/boot.ts` — Hono + tRPC adapter + health check + static + graceful shutdown
- [ ] `api/router.ts` — корневой роутер

### Критерий готовности Phase 0
- [ ] `npm install` проходит без ошибок
- [ ] `npm run db:generate` создает SQL-миграции
- [ ] `npm run db:migrate` применяет миграции в БД
- [ ] `npx tsx db/seed.ts` наполняет БД тестовыми данными
- [ ] `npm run dev` запускается на :3000
- [ ] GET `/health` возвращает 200
- [ ] `npx tsc --noEmit` — нет ошибок TypeScript
- [ ] Все 26 таблиц физически созданы в БД

---

## Phase 1: Auth & Users

> **Цель:** Суперадмин и админ могут создавать пользователей, отправлять приглашения, пользователи могут активировать аккаунт и входить.
> **Скиллы:** `writing-plans`, `test-driven-development`

### 1.1 Auth Router (public)
- [ ] Zod схемы: LoginSchema, RegisterSchema (disabled in MVP)
- [ ] `auth.login` — поиск по email, verifyPassword, createToken, setAuthCookie
- [ ] `auth.me` — возвращает ctx.user (или null)
- [ ] `auth.logout` — очистка cookie и localStorage
- [ ] `auth.acceptInvitation` — проверка токена, установка пароля, активация
- [ ] `auth.requestPasswordReset` — генерация reset token, отправка email
- [ ] `auth.resetPassword` — проверка reset token, обновление пароля

### 1.2 User Router (authed)
- [ ] `user.me` — расширенный (программы, прогресс)
- [ ] `user.updateProfile` — имя, avatar
- [ ] `user.changePassword` — старый + новый пароль
- [ ] `user.myPrograms` — назначенные программы с прогрессом
- [ ] `user.myCertificates` — свои сертификаты
- [ ] `user.myNotifications` — уведомления, unread count

### 1.3 Admin User Management
- [ ] `admin.users.list` — таблица пользователей (поиск, фильтры, пагинация)
- [ ] `admin.users.getById` — карточка пользователя с прогрессом
- [ ] `admin.users.create` — создание пользователя (имя, email, роль)
- [ ] `admin.users.block` / `admin.users.unblock`
- [ ] `admin.users.assignProgram` — назначение программы (только published)
- [ ] `admin.users.revokeProgram` — отзыв назначения

### 1.4 Invitation Management
- [ ] `admin.invitations.list` — список приглашений
- [ ] `admin.invitations.send` — создание токена + отправка email
- [ ] `admin.invitations.resend` — повторная отправка (новый токен, сброс срока)
- [ ] `admin.invitations.revoke` — отзыв приглашения

### 1.5 Frontend: Auth — публичные страницы
- [ ] `LandingPage.vue` — Hero, 3 карточки аудиторий, структура, CTA
- [ ] `LoginPage.vue` — вкладки: «Войти» / «Приглашение»
- [ ] `AcceptInvitationPage.vue` — проверка токена, форма пароля
- [ ] `NotFoundPage.vue` / `ForbiddenPage.vue`

### Критерий готовности Phase 1
- [ ] Superadmin может создать пользователя через UI
- [ ] Пользователь получает email-приглашение
- [ ] Приглашение содержит одноразовую ссылку с токеном
- [ ] Пользователь может активировать аккаунт и задать пароль
- [ ] Вход по email + паролю работает
- [ ] Различие по ролям: user / admin / superadmin
- [ ] Неавторизованный -> /login, авторизованный -> /dashboard
- [ ] JWT в HTTP-only cookie, fallback в localStorage

---
## Phase 2: Content Builder

> **Цель:** Admin/Superadmin может создавать программы, курсы, модули, тесты, загружать контент, публиковать версии.
> **Скиллы:** `writing-plans`, `design-system`

### 2.1 Program Builder (admin)
- [ ] `admin.programs.list` — таблица с фильтрами, поиском, пагинацией
- [ ] `admin.programs.getById` — программа + курсы + последняя версия
- [ ] `admin.programs.create` — создание (уникальный slug, авто создается draft v1)
- [ ] `admin.programs.update` — редактирование draft-версии
- [ ] `admin.programs.createNewVersion` — копирование published -> draft vN+1 (курсы, модули, тесты)
- [ ] `admin.programs.publish` — валидация + публикация
- [ ] `admin.programs.archive` — архивирование
- [ ] `admin.programs.delete` — удаление только draft

### 2.2 Course Builder (admin)
- [ ] `admin.courses.list` — по программе
- [ ] `admin.courses.create` — внутри программы, auto sort_order
- [ ] `admin.courses.update` — название, описание, ролевая ветка, обязательность
- [ ] `admin.courses.reorder` — транзакция перестановки
- [ ] `admin.courses.delete` — каскадное удаление модулей

### 2.3 Module Builder (admin)
- [ ] `admin.modules.list` — по курсу
- [ ] `admin.modules.create` — внутри курса, auto sort_order
- [ ] `admin.modules.update` — название, тип, обязательность, блокировка
- [ ] `admin.modules.reorder` — транзакция
- [ ] `admin.modules.delete`
- [ ] `admin.modules.uploadHtmlZip` — валидация (индекс.html), S3, checksum, защита от path traversal + zip bomb
- [ ] `admin.modules.uploadPdf` — валидация PDF, S3
- [ ] `admin.modules.setRutubeUrl` — валидация URL, извлечение video_id

### 2.4 Assessment Builder (admin)
- [ ] `admin.assessments.list` — фильтры по типу и родителю
- [ ] `admin.assessments.create` — мини-тест / итоговый / аттестация
- [ ] `admin.assessments.update` — проходной балл, попытки, обратная связь, таймер
- [ ] `admin.assessments.uploadHtmlZip` — HTML ZIP для теста
- [ ] `admin.assessments.publish` — snapshot assessment_version
- [ ] `admin.assessments.delete` — only draft

### 2.5 Upload Service
- [ ] `upload.getPresignedUrl` — S3 presigned PUT URL
- [ ] Валидация contentType (белый список)
- [ ] Лимиты размера (HTML 5MB, PDF 10MB, ZIP 50MB)
- [ ] Кей формат: `{folder}/{nanoid()}-{filename}`

### 2.6 Frontend: Admin Content Builder
- [ ] `AdminProgramsPage.vue` — таблица программ (фильтры, поиск, пагинация)
- [ ] `AdminProgramBuilderPage.vue` — форма программы + список курсов (reorder)
- [ ] `AdminProgramPublishPage.vue` — валидация + подтверждение
- [ ] `AdminCreateVersionModal.vue` — создание новой версии
- [ ] `AdminCoursesPage.vue` — таблица курсов
- [ ] `AdminCourseBuilderPage.vue` — форма курса + модули (reorder) + итоговый тест
- [ ] `AdminModulesPage.vue` — таблица модулей
- [ ] `AdminModuleBuilderPage.vue` — форма модуля + контент (табы HTML/PDF/Rutube) + upload + preview iframe
- [ ] `AdminAssessmentsPage.vue` — таблица тестов
- [ ] `AdminAssessmentBuilderPage.vue` — форма теста + HTML upload + preview
- [ ] `SortableList.vue` — drag-and-drop или кнопки ↑↓ для reorder

### Критерий готовности Phase 2
- [ ] Admin может создать программа -> курсы -> модули -> тесты
- [ ] Может загрузить HTML ZIP, PDF, указать Rutube URL
- [ ] Может переставить курсы и модули в порядке
- [ ] Published-версия неизменяема (draft-only edit)
- [ ] Может создать новую версию из published
- [ ] Валидация от path traversal + zip bomb
- [ ] S3 presigned URL генерируется

---

## Phase 3: Learning

> **Цель:** Пользователь видит назначенные программы, проходит курсы/модули/тесты, прогресс сохраняется.
> **Скиллы:** `writing-plans`, `design-system`

### 3.1 User Public API (authed)
- [ ] `user.programs.list` — программы пользователя (только published, назначенные)
- [ ] `user.programs.getById` — детали + курсы + прогресс
- [ ] `user.courses.getById` — детали + модули + прогресс
- [ ] `user.modules.getById` — детали + контент + прогресс

### 3.2 Progress Tracking
- [ ] `user.programs.open` — открытие программы (создает program_progress)
- [ ] `user.courses.open` — открытие курса
- [ ] `user.modules.open` — открытие модуля
- [ ] `user.modules.complete` — отметка о завершении
- [ ] Авто-открытие следующего курса/модуля при завершении
- [ ] Блокировка модулей: обязательные должны быть пройдены

### 3.3 Progress Calculation
- [ ] `calculateModuleProgress()` — % завершенных модулей
- [ ] `calculateCourseProgress()` — среднее по модулям
- [ ] `calculateProgramProgress()` — среднее по курсам
- [ ] Каскадное обновление при completeModule

### 3.4 Assessment (Tests)
- [ ] `user.assessments.getById` — тест (без правильных ответов)
- [ ] `user.assessments.start` — создает assessment_attempt (статус in_progress)
- [ ] `user.assessments.submit` — проверка ответов, расчет балла, проверка попыток
- [ ] `user.assessments.results` — ответы + правильные + объяснения
- [ ] Таймер (авто-завершение по истечении)
- [ ] Запрет перезагрузки страницы во время теста

### 3.5 Frontend: Learning Experience
- [ ] `ProgramsPage.vue` — карточки программ + прогресс бар
- [ ] `ProgramDetailPage.vue` — список курсов с состоянием
- [ ] `CourseDetailPage.vue` — список модулей, блокировки
- [ ] `ModulePage.vue` — контент (ифрейм / PDF viewer / Rutube embed)
- [ ] `AssessmentPage.vue` — форма теста (вопросы, таймер, submit)
- [ ] `AssessmentResultsPage.vue` — результаты, правильные ответы
- [ ] `UserDashboardPage.vue` — мои программы, прогресс, сертификаты
- [ ] `Sidebar.vue` — навигация по программе/курсу

### Критерий готовности Phase 3
- [ ] Пользователь видит только назначенные published-программы
- [ ] Открытие программы показывает курсы
- [ ] Открытие модуля отображает контент
- [ ] Завершение модуля сохраняет прогресс
- [ ] Прогресс пересчитывается каскадно
- [ ] Тест запускается, проверяется, результат сохраняется
- [ ] Запрет перезагрузки во время теста
- [ ] Блокировка обязательных модулей работает

---
## Phase 4: Certificates

> **Цель:** Пользователь получает сертификат после завершения всех модулей + итогового теста. PDF генерируется с QR и уникальным номером. Публичная верификация без авторизации.
> **Скиллы:** `writing-plans`, `design-system`

### 4.1 Certificate Templates (admin)
- [ ] `admin.certificateTemplates.list` — список шаблонов
- [ ] `admin.certificateTemplates.create` — загрузка PDF-шаблона + координаты полей
- [ ] `admin.certificateTemplates.update` — перемещение/размер полей (имя, программа, дата, балл, QR)
- [ ] `admin.certificateTemplates.setDefault` — по умолчанию
- [ ] `admin.certificateTemplates.delete`
- [ ] Визуальный preview шаблона с наложенными полями

### 4.2 Certificate Generation & Issuance
- [ ] `user.certificates.request` — проверка: все обязательные модули + итоговый тест пройден
- [ ] Генерация уникального номера: DD-{PROGRAM_CODE}-{YEAR}-{SEQUENCE}
- [ ] Генерация QR (ссылка на верификацию)
- [ ] PDF overlay: шаблон + динамические данные
- [ ] Сохранение PDF на S3
- [ ] `user.certificates.list` — список сертификатов
- [ ] `user.certificates.getById` — скачивание PDF
- [ ] `admin.certificates.list` — все сертификаты (фильтры, поиск)
- [ ] `admin.certificates.issueManual` — ручная выдача (обход проверок)
- [ ] `admin.certificates.revoke` — отзыв (с причиной)

### 4.3 Public Verification
- [ ] `public.verifyCertificate` — по токену возвращает данные (без авторизации)
- [ ] `VerifyCertificatePage.vue` — публичная страница верификации

### 4.4 Frontend
- [ ] `CertificatesPage.vue` — список сертификатов пользователя + скачивание
- [ ] `AdminCertificateTemplatesPage.vue` — управление шаблонами
- [ ] `AdminCertificateTemplateBuilder.vue` — загрузка PDF + настройка полей
- [ ] `AdminCertificatesPage.vue` — выданные сертификаты + ручная выдача

### Критерий готовности Phase 4
- [ ] Пользователь получает сертификат после завершения программы
- [ ] PDF содержит имя, программу, дату, балл, QR
- [ ] Уникальный номер в формате DD-{CODE}-{YEAR}-{SEQ}
- [ ] QR ведет на публичную страницу верификации
- [ ] Верификация работает без авторизации
- [ ] Admin может выдать/отзывать сертификат ручную

---

## Phase 5: Services

> **Цель:** Фоновые сервисы: аудит всех действий, уведомления, email-рассылки, проверка Rutube, импорт ZIP-пакетов.
> **Скиллы:** `writing-plans`, `test-driven-development`

### 5.1 Audit Service
- [ ] `audit.log()` — единый метод логирования
- [ ] События: user_created, program_published, certificate_issued, zip_import, assessment_submitted, settings_updated, unauthorized_access_attempt
- [ ] Поля: actor_id, target_type, target_id, action, before_json, after_json, ip, user_agent
- [ ] `admin.audit.list` — фильтры (дата, actor, action), сортировка, пагинация
- [ ] Запрет редактирования/удаления аудита через UI

### 5.2 Notification Service
- [ ] `notification.create()` — единый метод
- [ ] Типы: program_assigned, module_completed, assessment_reminder, certificate_issued, invitation_received
- [ ] `user.notifications.list` — список с пагинацией
- [ ] `user.notifications.markAsRead` — по id или все
- [ ] `user.notifications.delete` — мягкое удаление
- [ ] Badge unread count в шапке

### 5.3 Email Service
- [ ] Интеграция nodemailer/SMTP из настроек
- [ ] Шаблоны: invitation, password_reset, certificate_issued, program_assigned
- [ ] `email.send()` — очередь (асинхронная отправка)
- [ ] Запись ошибок отправки

### 5.4 Rutube Check Service
- [ ] Фоновая задача (cron или периодический запуск)
- [ ] Проверка доступности видео по API Rutube
- [ ] Уведомление admin при ошибке
- [ ] Запись результата в rutube_checks

### 5.5 ZIP Import Service
- [ ] `admin.import.upload` — прием ZIP и валидация
- [ ] Обязательный manifest.json (версия, программа, курсы, модули)
- [ ] Валидация структуры папок
- [ ] Защита от path traversal
- [ ] Защита от zip bomb (макс. размер, кол-во файлов)
- [ ] Блокировка опасных расширений (.exe, .sh)
- [ ] Распаковка и загрузка на S3
- [ ] Создание DRAFT-программы (не авто-публикация)
- [ ] Запись отчета импорта

### 5.6 Frontend
- [ ] `AdminAuditPage.vue` — журнал (фильтры, даты, пагинация)
- [ ] `AdminNotificationsPage.vue` — список уведомлений
- [ ] `AdminImportPage.vue` — загрузка ZIP + прогресс + отчет

### Критерий готовности Phase 5
- [ ] Аудит записывает все критичные действия
- [ ] Уведомления приходят в реальном времени
- [ ] Email-рассылка работает (SMTP настроен)
- [ ] Rutube проверяется периодически
- [ ] ZIP импортирует программу как DRAFT
- [ ] Импорт защищен от path traversal и zip bomb

---
## Phase 6: Superadmin & Reports

> **Цель:** Суперадмин управляет настройками платформы, SMTP, безопасностью. Генерация отчетов по прогрессу, сертификатам, активности.
> **Скиллы:** `writing-plans`, `code_reviewer`

### 6.1 Settings Management (superadmin only)
- [ ] `settings.get` — получение по категории (общие, безопасность, email)
- [ ] `settings.set` — обновление с валидацией
- [ ] `settings.getPublic` — открытые настройки (название платформы, лого)
- [ ] Категории: general, security, email, appearance
- [ ] Шифрование чувствительных значений (SMTP password)

### 6.2 Email Settings (superadmin only)
- [ ] `emailSettings.get` — хост, порт, логин, от кого, имя отправителя
- [ ] `emailSettings.set` — с валидацией порта
- [ ] `emailSettings.test` — отправка тестового email на указанный адрес
- [ ] Пароль хранится в зашифрованном виде

### 6.3 Security Settings
- [ ] Настройка срока JWT
- [ ] Настройка максимального размера загрузки
- [ ] Настройка разрешенных content-type
- [ ] Включение/отключение регистрации (в MVP всегда выключена)

### 6.4 Report Generation
- [ ] `admin.reports.programProgress` — по программе: пользователи, прогресс, сертификаты
- [ ] `admin.reports.courseProgress` — по курсу
- [ ] `admin.reports.userActivity` — активность пользователей (последний вход, прогресс)
- [ ] `admin.reports.assessmentResults` — результаты тестов
- [ ] `admin.reports.export` — асинхронная генерация XLSX/CSV
- [ ] `admin.reports.getExportStatus` — статус генерации
- [ ] `admin.reports.downloadExport` — скачивание файла

### 6.5 Dashboard & Stats
- [ ] `admin.stats.overview` — общие цифры (пользователи, программы, сертификаты)
- [ ] `admin.stats.recentActivity` — последние действия
- [ ] `admin.stats.enrollmentTrends` — график назначений

### 6.6 Frontend
- [ ] `AdminSettingsPage.vue` — табы: General / Security / Email / Appearance
- [ ] `AdminEmailSettings.vue` — SMTP форма + тестовая отправка
- [ ] `AdminReportsPage.vue` — выбор отчета, фильтры, генерация
- [ ] `AdminDashboardPage.vue` — карточки с цифрами, графики

### Критерий готовности Phase 6
- [ ] Только superadmin имеет доступ к настройкам
- [ ] SMTP-настройки сохраняются и тестируются
- [ ] Отчеты генерируются асинхронно
- [ ] Экспорт в XLSX работает
- [ ] Дашборд отображает актуальные цифры

---

## Phase 7: Polish & Deploy

> **Цель:** Проект готов к продакшену: E2E-тесты проходят, оптимизация, Docker, CI/CD.
> **Скиллы:** `test-driven-development`, `code_reviewer`

### 7.1 E2E Testing
- [ ] Сценарий: Приглашение -> активация -> вход -> программа -> модуль -> тест -> сертификат
- [ ] Сценарий: Admin создает программу -> публикует -> назначает пользователю
- [ ] Сценарий: Загрузка HTML ZIP -> просмотр в iframe -> завершение
- [ ] Сценарий: Версионирование -> создание v2 -> переключение версий
- [ ] Тестирование безопасности: path traversal, SQL injection, XSS, CSRF

### 7.2 Performance Optimization
- [ ] Индексы на все FK и часто искомые поля
- [ ] Кэширование статики (S3 + CDN)
- [ ] Лимиты запросов (rate limiting)
- [ ] Оптимизация базовой загрузки (lazy loading)
- [ ] Пагинация всех списков (backend + frontend)

### 7.3 Error Handling & Monitoring
- [ ] Глобальный error handler (500 -> user-friendly)
- [ ] Логирование ошибок (error tracking)
- [ ] Перехват необработанных ошибок
- [ ] Страница ошибки (ErrorPage.vue)

### 7.4 DevOps & Deployment
- [ ] `Dockerfile` — мультистейдж (build + runtime)
- [ ] `docker-compose.yml` — приложение + MySQL + nginx
- [ ] `nginx.conf` — reverse proxy, static files, SSL
- [ ] GitHub Actions / CI pipeline (lint, test, build)
- [ ] Скрипт деплоя (rsync / docker pull / restart)
- [ ] Health checks в Docker
- [ ] Graceful shutdown в контейнере

### 7.5 Documentation
- [ ] `README.md` — общее описание, стек, запуск
- [ ] `docs/API.md` — полный список эндпоинтов
- [ ] `docs/DEPLOY.md` — инструкция по деплою
- [ ] `docs/ADMIN_GUIDE.md` — руководство для админа

### Критерий готовности Phase 7
- [ ] E2E-тесты проходят
- [ ] Нет ошибок в консоли
- [ ] `npm run build` собирается без ошибок
- [ ] Docker контейнер запускается
- [ ] CI pipeline проходит
- [ ] Все 3 роли работают (user/admin/superadmin)

---

## Приложения

### A. Соответствие требованиям ТЗ (tzDAc.md)

| Требование ТЗ | Фаза | Статус |
|---|---|---|
| Программы как контейнер | Phase 2 | включено |
| Версионирование (draft/published/archived) | Phase 2 | включено |
| Приглашения + активация | Phase 1 | включено |
| Назначение программ | Phase 1 | включено |
| Прогресс + блокировка | Phase 3 | включено |
| Тесты (HTML + нативный) | Phase 2-3 | включено |
| Сертификаты (PDF + QR) | Phase 4 | включено |
| Публичная верификация | Phase 4 | включено |
| Аудит всех действий | Phase 5 | включено |
| Уведомления | Phase 5 | включено |
| Email (SMTP) | Phase 5-6 | включено |
| ZIP импорт | Phase 5 | включено |
| Отчеты | Phase 6 | включено |
| Настройки (superadmin) | Phase 6 | включено |
| Rutube проверка | Phase 5 | включено |
| Безопасность | Все фазы | включено |

### B. Порядок запуска проекта по фазам

```bash
# Phase 0: Фундамент
npm install
cp .env.example .env  # заполнить переменные
npm run db:generate
npm run db:migrate
npx tsx db/seed.ts
npm run dev              # проверка запуска

# Phase 1-7: После каждой фазы
npx tsc --noEmit         # проверка TypeScript
npm run build            # проверка сборки
npm run test:e2e         # E2E тесты (Phase 7)
```

### C. Риски и митигация

| Риск | Фазы | Митигация |
|---|---|---|
| Неправильное моделирование версий | Phase 2 | Тесты переключения версий |
| Утечка памяти при импорте ZIP | Phase 5 | Ограничение размера + стриминг |
| Уязвимости XSS в iframe | Phase 2-3 | Sandbox + CSP + валидация |
| Утеря прогресса при новой версии | Phase 2 | Отдельный progress на версию |
| Производительность при большом кол-ве пользователей | Phase 7 | Индексы + пагинация + кэш |
| Утечка чувствительных данных | Phase 5-6 | Шифрование + аудит |
| Потеря SMTP-пароля | Phase 6 | Шифрование + невозможность просмотра |
| Несовместимость браузеров для iframe | Phase 3 | Sandboxed iframe + feature policy |

### D. Команда агентов

| Роль | Ответственность | Фазы |
|---|---|---|
| **Coordinator** | Планирование, трекинг, чек-листы | Все |
| **Backend** | DB, API, сервисы, безопасность | 0-3, 5 |
| **Frontend** | Vue, UI kit, страницы, компоненты | 1-4, 6 |
| **QA** | E2E, безопасность, нагрузочное тестирование | 7 |
| **DevOps** | Docker, CI/CD, деплой, мониторинг | 7 |

---

> **Важно:** Не переходить к следующей фазе без завершения критериев готовности текущей.
> Каждая фаза — это рабочий инкремент, который можно показать стейкхолдеру.
