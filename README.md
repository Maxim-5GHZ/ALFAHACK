# Альфа.Старт (Alfa.Start)

Веб-приложение для молодых предпринимателей (17–25 лет). Интерактивный ИИ-помощник для выбора ниши, расчёта бизнес-плана и открытия ИП в Альфа-Банке.

## Структура

```
├── backend/          # FastAPI + Python
│   ├── app/
│   │   ├── api/routes/
│   │   ├── core/      # config, database
│   │   ├── schemas/   # Pydantic модели
│   │   └── main.py
│   ├── Dockerfile      # Production сборка
│   └── Dockerfile.dev  # Dev сборка (--reload)
├── frontend/         # Next.js + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/       # App Router
│   │   ├── components/ui/
│   │   └── lib/
│   ├── Dockerfile      # Production (multi-stage, standalone)
│   └── Dockerfile.dev  # Dev сборка (HMR)
├── .env.example          # Все переменные окружения
├── .gitignore
├── docker-compose.yml      # Production
└── docker-compose.dev.yml  # Dev (volumes + hot reload)
```

## Запуск

### Production

```bash
docker compose up --build
```

- PostgreSQL: `localhost:5432`
- Backend: `localhost:8000`
- Frontend: `localhost:3000`

### Development (с hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Фронтенд и бэкенд автоматически перезагружаются при изменении файлов (HMR + uvicorn --reload).

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