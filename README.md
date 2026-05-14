# DreamAcademy

Учебная платформа (LMS) для обучения пользователей продукту DreamDocs.

## Стек технологий

- **Backend:** Node.js 20+, Hono, tRPC 11, Drizzle ORM, MySQL 8, Zod
- **Frontend:** Vue 3.5, TypeScript, Vite 7, Vue Router 4, Pinia 3, TanStack Query Vue 5, Tailwind CSS 3.4
- **Testing:** Playwright (E2E)
- **PDF:** Playwright + qrcode

## Быстрый старт

### Вариант 1: Makefile (Linux/macOS/WSL)

```bash
# Полная установка с нуля (npm install, БД, миграции, seed)
make setup

# Запуск dev-сервера (порт 3000)
make dev

# Полный стек через Docker Compose
make docker-up
```

### Вариант 2: PowerShell (Windows)

```powershell
# Полная установка с нуля
.\setup.ps1 setup

# Запуск dev-сервера
.\setup.ps1 dev

# Полный стек через Docker Compose
.\setup.ps1 docker-up
```

### Вариант 3: Вручную

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Отредактируй .env — укажи DATABASE_URL, APP_SECRET и другие переменные

# Запуск MySQL (если через Docker)
docker-compose up -d db

# Применение миграций
npm run db:migrate

# Seed данных
npx tsx db/seed.ts

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

## Доступные команды

| Команда | Описание |
|---|---|
| `make setup` / `.\setup.ps1 setup` | Полная установка с нуля |
| `make dev` / `.\setup.ps1 dev` | Запуск dev-сервера |
| `make build` / `.\setup.ps1 build` | Production сборка |
| `make start` / `.\setup.ps1 start` | Запуск production |
| `make db-up` / `.\setup.ps1 db-up` | Запуск MySQL в Docker |
| `make db-down` / `.\setup.ps1 db-down` | Остановка MySQL |
| `make db-migrate` / `.\setup.ps1 db-migrate` | Применение миграций |
| `make db-seed` / `.\setup.ps1 db-seed` | Seed демо-данных |
| `make db-reset` / `.\setup.ps1 db-reset` | Полный сброс БД |
| `make docker-up` / `.\setup.ps1 docker-up` | Запуск через Docker Compose |
| `make docker-down` / `.\setup.ps1 docker-down` | Остановка Docker Compose |
| `make test` / `.\setup.ps1 test` | E2E тесты Playwright |
| `make lint` / `.\setup.ps1 lint` | Проверка TypeScript |
| `make clean` / `.\setup.ps1 clean` | Очистка (node_modules, dist, volumes) |

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
