# Project Management SaaS (Trello/Jira-lite)

A full-stack project management application built with:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Django 4.x + Django REST Framework + PostgreSQL
- **Auth:** JWT via `djangorestframework-simplejwt`
- **Local dev:** Docker Compose (PostgreSQL, backend, frontend)
- **Tests:** pytest (backend), Vitest (frontend), Playwright (E2E)

## Quickstart (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r app/requirements.txt
cp app/.env.example app/.env
# Edit app/.env if you need to change DATABASE_URL (defaults to SQLite)
python manage.py migrate
python manage.py runserver
```

The backend runs on `http://localhost:8000`. All API endpoints are under `/api/v1/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`. Set `VITE_API_URL` to point at the backend.

## Quickstart (with Docker)

```bash
docker compose up
```

This starts PostgreSQL, the Django backend (on port 8000), and the Vite frontend (on port 5173).

## API

All endpoints are prefixed with `/api/v1/`.

### Authentication
- `POST /api/v1/auth/register/` — register a new user
- `POST /api/v1/auth/login/` — login, returns JWT tokens
- `POST /api/v1/auth/logout/` — logout (blacklists refresh token)
- `POST /api/v1/auth/refresh/` — refresh access token
- `GET /api/v1/auth/me/` — get current user profile

### Projects
- `GET/PATCH/DELETE /api/v1/projects/` — list/create projects
- `GET/PATCH/DELETE /api/v1/projects/{id}/` — project detail

### Boards
- `GET/PATCH/DELETE /api/v1/boards/` — list/create boards
- `GET/PATCH/DELETE /api/v1/boards/{id}/` — board detail

### Tasks
- `GET/PATCH/DELETE /api/v1/tasks/` — list/create tasks
- `GET/PATCH/DELETE /api/v1/tasks/{id}/` — task detail

### Comments
- `GET/POST /api/v1/tasks/{id}/comments/` — list/add comments
- `PATCH/DELETE /api/v1/comments/{id}/` — edit/delete comment

### Dashboard
- `GET /api/v1/dashboard/` — aggregated stats for the current user

## Running tests

### Backend
```bash
cd backend
pytest
```

### Frontend (later milestones)
```bash
cd frontend
npm run test
```

### E2E (later milestones)
```bash
cd e2e
npx playwright test
```

## Environment variables

See `.env.example` for all supported variables.
