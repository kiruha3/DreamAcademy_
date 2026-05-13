# DreamDocs Academy

Учебная платформа (LMS) для обучения пользователей продукту DreamDocs.

## Стек технологий

- **Backend:** Node.js 20+, Hono, tRPC 11, Drizzle ORM, MySQL 8, Zod
- **Frontend:** Vue 3.5, TypeScript, Vite 7, Vue Router 4, Pinia 3, TanStack Query Vue 5, Tailwind CSS 3.4
- **Testing:** Playwright (E2E)
- **PDF:** Playwright + qrcode

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Отредактируй .env — укажи DATABASE_URL, APP_SECRET и другие переменные

# Применение миграций
npm run db:migrate

# Запуск dev-сервера (порт 3000)
npm run dev
```

## Сборка и запуск

```bash
# Сборка
npm run build

# Запуск в production
npm run start
```

## Тестирование

```bash
# E2E тесты
npx playwright test
```

## Docker

```bash
# Запуск с Docker Compose
docker-compose up --build
```

## Переменные окружения

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | URL подключения к MySQL |
| `APP_SECRET` | Секрет для JWT (мин. 32 символа) |
| `APP_ID` | Идентификатор приложения |
| `OWNER_UNION_ID` | ID владельца |
| `S3_*` | Настройки S3 (опционально) |

## Структура проекта

```
├── api/           # Backend (Hono + tRPC)
├── db/            # Схема БД и миграции Drizzle
├── src/           # Frontend (Vue 3)
├── e2e/           # E2E тесты Playwright
├── public/        # Статические файлы
└── contracts/     # Общие типы
```

## Лицензия

Proprietary — DreamDocs
