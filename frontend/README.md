# Mutual NDA Creator — Frontend

Next.js app that lets users fill in NDA details and download a completed document.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables (optional — defaults to `http://localhost:8000`):
   ```bash
   cp .env.local.example .env.local
   ```

3. Start the backend (from the repository root, `backend/` directory):
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```

4. Start the frontend:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 15** — App Router, TypeScript
- **Tailwind CSS + shadcn/ui** — UI components
- **TanStack Query** — server state management
- **React Hook Form + Zod** — form validation
- **@react-pdf/renderer** — PDF download generation
