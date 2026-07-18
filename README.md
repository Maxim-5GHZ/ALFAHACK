# Альфа.Старт (Alfa.Start)

Веб-приложение для молодых предпринимателей (17–25 лет). Интерактивный ИИ-помощник для выбора ниши, расчёта бизнес-плана и открытия ИП в Альфа-Банке.

## Структура

```
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── api/routes/
│   │   ├── core/          # config, database
│   │   ├── schemas/       # Pydantic модели
│   │   └── main.py
│   ├── Dockerfile          # Production сборка
│   └── Dockerfile.dev      # Dev сборка (--reload)
├── frontend/              # Next.js + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/ui/
│   │   └── lib/
│   ├── Dockerfile          # Production (multi-stage, standalone)
│   └── Dockerfile.dev      # Dev сборка (HMR)
├── caddy-entrypoint.sh     # Автовыбор HTTP/HTTPS в зависимости от CADDY_HOST
├── Caddyfile.dev            # Конфигурация Caddy для разработки (HTTP)
├── Caddyfile.tls            # Шаблон Caddy для прода с TLS (референс)
├── .env.example            # Все переменные окружения
├── .gitignore
├── docker-compose.yml      # Production
└── docker-compose.dev.yml  # Dev (volumes + hot reload)
```

## Запуск

### Production

```bash
# 1. Настройка окружения (из корня проекта)
cp .env.example .env
# Отредактируйте .env, укажите CADDY_HOST (ваш домен), OPENAI_API_KEY и т.д.

# 2. Запуск
docker compose up --build
```

- **Caddy (reverse proxy):** `localhost:80` (или `your.domain:443` c TLS)
  - `/api/*` → Backend (FastAPI)
  - `/health` → Backend
  - `/*` → Frontend (Next.js)
- PostgreSQL: `localhost:5432`

> **Важно:** Если `CADDY_HOST` — реальный домен (не `localhost` и не IP),  
> Caddy автоматически включит HTTPS с Let's Encrypt. Укажите `CADDY_TLS_EMAIL` в `.env`.  
> Если домена нет — Caddy работает по plain HTTP на порту 80.

### Development (с hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Фронтенд и бэкенд автоматически перезагружаются при изменении файлов (HMR + uvicorn --reload). Caddy слушает на порту 80 и проксирует запросы.

| Сервис     | Адрес                          |
|------------|--------------------------------|
| Caddy      | `http://localhost`             |
| Backend    | `http://localhost:8000`        |
| Frontend   | `http://localhost:3000`        |

### Локально (без Docker)

```bash
# 1. Настройка окружения (из корня проекта)
cp .env.example .env

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 3. Frontend
cd frontend
npm install
npm run dev
```

> Без Docker Caddy не используется. Фронтенд обращается к бэкенду напрямую через `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Переменные окружения

| Переменная                 | Описание                          | По умолчанию                                       |
|----------------------------|-----------------------------------|---------------------------------------------------|
| `CADDY_HOST`               | Домен для Caddy                   | `localhost`                                       |
| `CADDY_TLS_EMAIL`          | Email для Let's Encrypt (опционально) | — (plain HTTP если нет домена)               |
| `OPENAI_API_KEY`           | Ключ OpenAI API                   | —                                                 |
| `OPENAI_API_BASE`          | Базовый URL OpenAI API            | `https://api.openai.com/v1`                       |
| `LLM_MODEL`                | Модель LLM                        | `gpt-4o-mini`                                     |
| `DATABASE_URL`             | Строка подключения к PostgreSQL   | `postgresql+asyncpg://alfastart:alfastart_secret@localhost:5432/alfastart` |
| `NEXT_PUBLIC_API_URL`      | URL API для фронтенда             | `http://localhost`                                |
| `GIGACHAT_API_KEY`         | Ключ GigaChat API                 | —                                                 |
| `GIGACHAT_CREDENTIALS_PATH`| Путь к файлу credentials GigaChat | —                                                 |
| `YANDEX_MAPS_API_KEY`      | Ключ Yandex Maps API              | —                                                 |
| `AUTH_SECRET_KEY`          | Секретный ключ для JWT            | `change-me-to-a-random-secret`                    |
| `POSTGRES_USER`            | Пользователь PostgreSQL           | `alfastart`                                       |
| `POSTGRES_PASSWORD`        | Пароль PostgreSQL                 | `alfastart_secret`                                |
| `POSTGRES_DB`              | База данных PostgreSQL            | `alfastart`                                       |
