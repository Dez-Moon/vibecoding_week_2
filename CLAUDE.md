# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 11 document types via AI chat with full user authentication and document persistence.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use LiteLLM via OpenRouter. You should primarily use the openrouter/openai/gpt-oss-120b model. If that model is unavailable, use openrouter/openai/gpt-oss-20b as a fallback. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme

- Primary: `#2563EB` (professional blue)
- Secondary: `#475569` (slate gray)
- Accent: `#F59E0B` (amber for highlights only)
- Headings: `#0F172A` (dark slate)
- Body Text: `#475569`
- Muted Text: `#64748B`
- Border: `#E2E8F0`
- Background: `#FFFFFF`
- Surface: `#F8FAFC`
- Success: `#16A34A`
- Warning: `#D97706`
- Error: `#DC2626`

## Implementation Status

### Completed foundation
- Docker multi-stage build (Node frontend + Python backend)
- FastAPI backend with SQLite
- Next.js frontend served by FastAPI at `http://localhost:8000`
- Start/stop scripts for Mac, Linux, and Windows
- Template seeding from `backend/data/templates`

### Completed document generation
- Support for all 11 document types from `catalog.json`
- Template selection screen for choosing a document type
- AI chat flow for gathering document details conversationally
- Structured outputs for reliable field extraction from conversation
- Live preview updates as fields are extracted
- PDF generation and download for completed documents
- Dedicated preview/PDF components for Mutual NDA, Cloud Service Agreement, and Pilot Agreement
- Generic preview/PDF components for the remaining agreement types

### Completed chat experience
- AI greeting endpoint per template
- Streaming chat responses over Server-Sent Events
- Optimistic user messages while a response is in progress
- Animated assistant typing state during streaming
- Current chat state preserved correctly during streaming updates
- Chat input auto-focus after sending messages
- AI continues asking follow-up questions until required fields are complete

### Completed authentication and persistence
- User signup and signin with email/password
- JWT auth in HttpOnly cookies
- Auth context and user menu in the frontend
- Save, load, update, and delete user documents
- My Documents modal for browsing saved documents
- New Document flow to start a fresh draft
- Protected document endpoints

### Current API Endpoints
- `GET /templates/` - List available document templates
- `GET /templates/{id}` - Get a template definition
- `POST /templates/{template_id}/render` - Render a document from collected fields
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in and receive JWT cookie
- `POST /api/auth/signout` - Clear auth cookie
- `GET /api/auth/me` - Get current user info
- `GET /api/documents/` - List the current user's saved documents
- `POST /api/documents/` - Save a new document
- `GET /api/documents/{document_id}` - Get a specific saved document
- `PUT /api/documents/{document_id}` - Update a saved document
- `DELETE /api/documents/{document_id}` - Delete a saved document
- `GET /api/chat/greeting` - Get the initial AI greeting for a template
- `POST /api/chat/message` - Send a chat message and get a complete AI response
- `POST /api/chat/message/stream` - Stream the AI response as SSE events
- `GET /api/health` - Health check

### Recent focus
- Chat streaming UX and state management were recently improved to avoid stale message state and empty assistant bubbles during streaming.
