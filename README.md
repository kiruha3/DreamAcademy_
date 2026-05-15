# DreamAcademy

Учебная платформа (LMS) для обучения пользователей продукту DreamDocs.

## Стек технологий

- **Backend:** Node.js 20+, Hono, tRPC 11, Drizzle ORM, MySQL 8, Zod
- **Frontend:** Vue 3.5, TypeScript, Vite 7, Vue Router 4, Pinia 3, TanStack Query Vue 5, Tailwind CSS 3.4
- **Testing:** Playwright (E2E)
- **PDF:** Playwright + qrcode

---

## 🚀 Деплой на сервер (Production)

### Требования

- **Docker** (с поддержкой `docker compose` V2)
- **Node.js 20+** (для сборки на хосте)
- **Git**

### 1. Подготовка

```bash
git clone https://github.com/kiruha3/DreamAcademy_.git
cd DreamAcademy_
cp .env.example .env
nano .env  # заполни обязательные переменные
```

**Обязательные переменные в `.env`:**
у S3... -заглушки можно отставить
| Переменная | Описание | Пример |
|---|---|---|
| `APP_SECRET` | Секрет для JWT (мин. 32 символа) | `openssl rand -hex 32` |
| `DATABASE_URL` | URL подключения к MySQL | `mysql://academy:academy_pass@db:3306/dreamdocs_academy` |
| `APP_ID` | Идентификатор приложения | `dreamdocs-academy` |
| `OWNER_UNION_ID` | ID первого суперадмина | `superadmin-001` |
| `S3_REGION` | Регион S3-хранилища | `ru-central1` |
| `S3_ENDPOINT` | Endpoint S3 | `https://storage.yandexcloud.net` |
| `S3_BUCKET` | Имя бакета | `dreamacademy` |
| `S3_ACCESS_KEY_ID` | Access Key S3 | `YCAJE...` |
| `S3_SECRET_ACCESS_KEY` | Secret Key S3 | `YCMBE...` |
| `S3_PUBLIC_URL` | Публичный URL бакета | `https://storage.yandexcloud.net/dreamacademy` |

> **База данных:** Если `DATABASE_URL` указывает на `localhost` и порт 3306 отвечает — Makefile использует локальную MySQL. Иначе — поднимает MySQL автоматически в Docker.

### 2. Первая установка (одна команда)

```bash
make server-install
```

Это автоматически:
1. Установит зависимости (`npm ci`)
2. Соберёт приложение (`npm run build`)
3. Поднимет MySQL (Docker или локальную)
4. Применит миграции
5. Засеет демо-данные (суперадмин + тестовый курс)
6. Запустит приложение на порту **3000**

### 3. Обновление (последующие деплои)

```bash
make deploy
```

Это подтянет изменения из git, пересоберёт и перезапустит контейнеры.

### 4. Проверка

```bash
# Статус контейнеров
make status

# Логи
make logs

# Проверка отклика локально
curl http://localhost:3000/health
```

Приложение будет доступно по адресу:
```
http://<IP_СЕРВЕРА>:3000
```

**Данные для входа (после seed):**
- Email: `admin@dreamdocs.ru`
- Пароль: `admin123`

---

## 💻 Локальная разработка

### Вариант 1: Makefile (Linux/macOS/WSL)

```bash
# Полная установка с нуля (npm install, БД, миграции, seed)
make setup

# Запуск dev-сервера (порт 3000)
make dev
```

### Вариант 2: PowerShell (Windows)

```powershell
# Полная установка с нуля
.\setup.ps1 setup

# Запуск dev-сервера
.\setup.ps1 dev
```

### Вариант 3: Вручную

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Отредактируй .env — укажи DATABASE_URL, APP_SECRET и другие переменные

# Запуск MySQL (если через Docker)
docker compose up -d db

# Применение миграций
npm run db:migrate

# Seed данных
npx tsx db/seed.ts

# Запуск dev-сервера (порт 3000)
npm run dev
```

---

## 🔧 Сборка и запуск

```bash
# Сборка
npm run build

# Запуск в production
npm run start
```

---

## 🧪 Тестирование

```bash
# E2E тесты
npx playwright test
```

---

## 📋 Доступные команды Makefile

| Команда | Описание |
|---|---|
| `make server-install` | Первая установка на сервере (Docker, миграции, seed) |
| `make deploy` | Обновление приложения (git pull, build, restart) |
| `make setup` | Полная установка для локальной разработки |
| `make dev` | Запуск dev-сервера |
| `make build` | Production сборка |
| `make start` | Запуск production (требует предварительной сборки) |
| `make db-up` | Запуск MySQL в Docker |
| `make db-down` | Остановка MySQL |
| `make db-migrate` | Применение миграций |
| `make db-seed` | Seed демо-данных |
| `make db-reset` | Полный сброс БД |
| `make docker-up` | Запуск через Docker Compose |
| `make docker-down` | Остановка Docker Compose |
| `make logs` | Просмотр логов контейнеров |
| `make status` | Статус контейнеров |
| `make test` | E2E тесты Playwright |
| `make lint` | Проверка TypeScript |
| `make clean` | Очистка (node_modules, dist, volumes) |

---

## 🐳 Docker

```bash
# Запуск с Docker Compose
docker compose up --build -d

# Остановка
docker compose down
```

---

## 🔐 Переменные окружения

| Переменная | Описание | Обязательная |
|---|---|---|
| `DATABASE_URL` | URL подключения к MySQL | ✅ |
| `APP_SECRET` | Секрет для JWT (мин. 32 символа) | ✅ |
| `APP_ID` | Идентификатор приложения | ✅ |
| `OWNER_UNION_ID` | ID владельца / первого суперадмина | ✅ |
| `S3_REGION` | Регион S3-хранилища | ✅ |
| `S3_ENDPOINT` | Endpoint S3 | ✅ |
| `S3_BUCKET` | Имя S3-бакета | ✅ |
| `S3_ACCESS_KEY_ID` | Access Key S3 | ✅ |
| `S3_SECRET_ACCESS_KEY` | Secret Key S3 | ✅ |
| `S3_PUBLIC_URL` | Публичный URL бакета | ✅ |
| `KIMI_AUTH_URL` | URL интеграции Kimi (опционально) | ❌ |
| `KIMI_OPEN_URL` | URL открытого API Kimi (опционально) | ❌ |

---

## 📁 Структура проекта

```
├── api/                  # Backend (Hono + tRPC)
│   ├── boot.ts           # Точка входа сервера
│   ├── router.ts         # Корневой роутер tRPC
│   ├── auth-router.ts    # Аутентификация
│   ├── lib/              # Утилиты (env, s3, cookies)
│   └── queries/          # Запросы к БД
├── db/                   # Схема БД и миграции Drizzle
│   ├── schema.ts         # Описание таблиц
│   ├── relations.ts      # Связи между таблицами
│   ├── seed.ts           # Начальные данные
│   └── migrations/       # SQL-миграции
├── src/                  # Frontend (Vue 3)
│   ├── pages/            # Страницы приложения
│   ├── components/       # Vue-компоненты
│   ├── stores/           # Pinia-сторы
│   └── router/           # Vue Router
├── e2e/                  # E2E тесты Playwright
├── public/               # Статические файлы (логотип, favicon)
├── contracts/            # Общие типы и константы
├── docker-compose.yml    # Docker Compose (app + db)
├── docker-compose.local-db.yml  # Docker Compose (только app)
├── Makefile              # Команды для деплоя и разработки
└── package.json          # Зависимости и скрипты
```

---

## 🛡️ Безопасность

- Пароли хранятся в виде bcrypt-хешей
- JWT-токены подписываются `APP_SECRET`
- S3-ключи не попадают в клиентский бандл
- HTML ZIP открывается в sandboxed iframe

---

## 📄 Лицензия

Proprietary — DreamDocs
