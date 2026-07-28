# Prelegal

A SaaS that helps users draft common legal agreements from a catalogue of Common Paper templates.
Users pick a template, chat with an AI assistant to fill in the required fields, watch the
document update live, and download it as a PDF or plain text.

The catalogue covers 11 document types — see [`catalog.json`](catalog.json) for the full list.

## Live demo

The latest version is deployed on Render:

- **App**: https://vibecoding-week-2.onrender.com
- **Health check**: https://vibecoding-week-2.onrender.com/api/health
- **Sign up**: https://vibecoding-week-2.onrender.com/auth/register
- **Sign in**: https://vibecoding-week-2.onrender.com/auth/login

> Free-tier Render instances sleep after a period of inactivity. The first request after a
> cold start may take a few seconds to wake the service.

## Tech stack

- **Backend**: FastAPI + SQLAlchemy + LiteLLM, packaged with `uv`. SQLite for local
  development, Postgres in production.
- **Frontend**: Next.js 16 (App Router) + React 19 + TanStack Query + react-pdf + Tailwind.
  Static export (`output: "export"`) bundled and served by the same FastAPI process.
- **AI**: OpenRouter via LiteLLM, primary model `openrouter/openai/gpt-oss-120b`, fallback
  `openrouter/openai/gpt-oss-20b`. Responses use Structured Outputs so fields can be extracted
  directly into the document.
- **Container**: Multi-stage Docker build (Node + Python).

## Repository layout

```
backend/                 FastAPI app, uv project, tests
frontend/                Next.js app, vitest tests, Playwright e2e
scripts/                 Start/stop scripts for macOS, Linux, Windows
catalog.json             Catalogue of document templates
Dockerfile               Multi-stage production image
render.yaml              Render service definition
```

## Running locally

The project uses two dev processes: the FastAPI backend on `:8000` and the Next.js frontend on
`:3000`. Helper scripts are provided for all three platforms.

### macOS / Linux

```bash
./scripts/start-mac.sh   # or ./scripts/start-linux.sh
```

### Windows (PowerShell)

```powershell
.\scripts\start-windows.ps1
```

### Manual setup

1. **Backend** (uses [uv](https://docs.astral.sh/uv/)):

   ```bash
   cd backend
   uv sync
   uv run uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open http://localhost:3000. The frontend talks to `http://localhost:8000` by default.

### Environment variables

Create `.env` at the project root for backend:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
```

For local dev the backend uses SQLite at `backend/data/legal_docs.db`. If `DATABASE_URL` is set,
SQLAlchemy switches to Postgres (e.g. `postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require`).

Other env vars the backend reads:

| Variable           | Default                                | Purpose                                       |
| ------------------ | -------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`     | `sqlite:///./data/legal_docs.db`       | Production Postgres connection string.        |
| `ALLOWED_ORIGINS`  | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated CORS origins.        |
| `COOKIE_SECURE`    | `false`                                | Set `true` in production to lock auth cookies to HTTPS. |
| `JWT_SECRET`       | random per process                     | JWT signing secret. Set in production.        |
| `PORT`             | `8000`                                 | Port the server listens on inside the container. |

Frontend env (`.env.local`):

| Variable                | Default | Purpose                                            |
| ----------------------- | ------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | unset   | Set to an absolute API base for cross-origin deployments. When unset, the frontend uses relative paths to the same origin. |

## Tests

```bash
# Backend
cd backend && uv run pytest

# Frontend unit tests
cd frontend && npm test

# Frontend e2e (requires running local stack)
cd frontend && npm run test:e2e
```

## Deployment

Production is a single Docker container that serves both the API and the static Next.js export.
The free-tier deployment uses Render (web service) plus Neon (managed Postgres).

### Production image

```bash
docker build -t prelegal .
docker run --rm -p 8000:8000 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  -e DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require \
  -e COOKIE_SECURE=true \
  -e ALLOWED_ORIGINS=https://your-render-url.onrender.com \
  prelegal
```

The container exposes port 8000 and serves the frontend from the same origin, so cookies and
CORS stay simple.

### Render + Neon (current production)

1. **Neon**: create a free project and copy the connection string. Convert
   `postgresql://...` to `postgresql+psycopg://...` so SQLAlchemy uses the bundled psycopg driver.
2. **Render**: create a new Web Service from this repo. `render.yaml` declares the service
   shape. Set the env vars from the table above.
3. Render builds the Docker image on push and deploys. The container's health check hits
   `/api/health`.

## API surface

| Method | Path                              | Purpose                                              |
| ------ | --------------------------------- | ---------------------------------------------------- |
| GET    | `/api/health`                     | Health check.                                        |
| GET    | `/templates/`                     | List available templates.                            |
| GET    | `/templates/{id}`                 | Get one template definition.                         |
| POST   | `/templates/`                     | Create a template (admin/internal).                  |
| PATCH  | `/templates/{id}`                 | Update a template.                                   |
| DELETE | `/templates/{id}`                 | Delete a template.                                   |
| POST   | `/templates/{template_id}/render` | Render a document from collected variables.           |
| POST   | `/api/auth/signup`                | Create a new user.                                   |
| POST   | `/api/auth/signin`                | Sign in and set the JWT cookie.                      |
| POST   | `/api/auth/signout`               | Clear the auth cookie.                               |
| GET    | `/api/auth/me`                    | Get the current user (requires cookie).              |
| GET    | `/api/documents/`                 | List the current user's saved documents.             |
| POST   | `/api/documents/`                 | Save a new document.                                 |
| GET    | `/api/documents/{document_id}`    | Get a saved document.                                |
| PUT    | `/api/documents/{document_id}`    | Update a saved document.                             |
| DELETE | `/api/documents/{document_id}`    | Delete a saved document.                             |
| GET    | `/api/chat/greeting`              | Get the AI's opening greeting for a template.        |
| POST   | `/api/chat/message`               | Send a chat message, receive the full reply.         |
| POST   | `/api/chat/message/stream`        | Stream the AI reply as Server-Sent Events.           |

## Colour scheme

Used throughout the UI:

| Token       | Hex       |
| ----------- | --------- |
| Primary     | `#2563EB` |
| Secondary   | `#475569` |
| Accent      | `#F59E0B` |
| Headings    | `#0F172A` |
| Body text   | `#475569` |
| Muted text  | `#64748B` |
| Border      | `#E2E8F0` |
| Background  | `#FFFFFF` |
| Surface     | `#F8FAFC` |
| Success     | `#16A34A` |
| Warning     | `#D97706` |
| Error       | `#DC2626` |

## Disclaimer

Documents produced by this tool are drafts. They are not legal advice and must be reviewed by
qualified counsel before use.