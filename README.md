# DreamDocs Academy

Учебная платформа (LMS) для обучения пользователей продукту DreamDocs. Поддерживает программы, курсы, модули с HTML/PDF/Rutube контентом, мини-тесты, итоговые аттестации и сертификаты.

## Технологический стек

| Слой | Технологии |
|---|---|
| **Frontend** | Vue 3, TypeScript, Vite, Vue Router, Pinia, TanStack Query, Tailwind CSS |
| **Backend** | Node.js 20+, Hono, tRPC 11, Drizzle ORM, MySQL 8 |
| **Хранение** | S3-совместимое облако (Yandex Cloud, AWS и др.) |
| **Auth** | JWT (jose) + bcryptjs, HTTP-only cookies |

## Требования

- **Node.js** >= 20
- **MySQL** >= 8
- **S3-совместимое хранилище** для файлов контента (опционально для dev)

## Быстрый старт

### 1. Клонирование и установка

```bash
git clone <repo-url>
cd dreamdocs-academy
npm install
```

### 2. Переменные окружения

```bash
cp .env.example .env
# Отредактируй .env — укажи DATABASE_URL, APP_SECRET, S3_* параметры
```

### 3. База данных

Создай базу данных в MySQL:

```sql
CREATE DATABASE dreamdocs_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Примени миграции:

```bash
npm run db:push
```

### 4. Seed-данные (опционально)

```bash
npx tsx db/seed.ts
```

Создаёт суперадмина (`admin@dreamdocs.ru` / `admin123`) и демо-контент.

### 5. Запуск в режиме разработки

```bash
npm run dev
```

Откроется на `http://localhost:3000`.

## Деплой в production

### 1. Сборка

```bash
npm ci
npm run build
```

Создаёт:
- `dist/public/` — статика фронтенда
- `dist/boot.js` — бэкенд (Hono + tRPC)

### 2. Переменные окружения

Скопируй `.env` на сервер и заполни реальными значениями. **Обязательно** смени `APP_SECRET` на случайный ключ минимум 32 символа.

| Переменная | Описание | Пример |
|---|---|---|
| `APP_ID` | Идентификатор приложения | `dreamdocs-academy` |
| `APP_SECRET` | Секрет для JWT (>= 32 символов) | `change-me-...` |
| `OWNER_UNION_ID` | ID владельца | `owner-123` |
| `DATABASE_URL` | URL подключения к MySQL | `mysql://user:pass@host:3306/db` |
| `S3_REGION` | Регион S3 | `ru-central1` |
| `S3_ENDPOINT` | Endpoint S3 | `https://storage.yandexcloud.net` |
| `S3_BUCKET` | Название бакета | `dreamdocs-academy` |
| `S3_ACCESS_KEY_ID` | Access Key | `YCA...` |
| `S3_SECRET_ACCESS_KEY` | Secret Key | `YCP...` |
| `S3_PUBLIC_URL` | Публичный URL бакета | `https://storage.yandexcloud.net/bucket` |

### 3. Запуск

```bash
NODE_ENV=production npm run start
```

Сервер слушает порт из переменной окружения `PORT` (по умолчанию `3000`).

### 4. Деплой на VPS (пример с systemd + nginx)

**systemd-сервис** `/etc/systemd/system/dreamdocs-academy.service`:

```ini
[Unit]
Description=DreamDocs Academy
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/dreamdocs-academy
Environment="NODE_ENV=production"
EnvironmentFile=/opt/dreamdocs-academy/.env
ExecStart=/usr/bin/node dist/boot.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**nginx конфиг**:

```nginx
server {
    listen 80;
    server_name academy.dreamdocs.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Запуск**:

```bash
sudo systemctl enable dreamdocs-academy
sudo systemctl start dreamdocs-academy
```

### 5. HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d academy.dreamdocs.ru
```

## E2E-тестирование

```bash
npx playwright install chromium
npx playwright test
```

## Структура проекта

```
├── api/           # Бэкенд (Hono, tRPC роутеры)
├── db/            # Drizzle схема, миграции, seed
├── contracts/     # Общие типы и константы
├── src/           # Фронтенд (Vue 3)
│   ├── components/
│   ├── pages/
│   ├── stores/
│   └── lib/
├── e2e/           # Playwright тесты
└── dist/          # Сборка (создаётся при build)
```

## Лицензия

Проприетарное ПО — DreamDocs.
