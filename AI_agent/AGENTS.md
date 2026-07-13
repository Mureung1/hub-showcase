# Career Mission AI Agent Guide

## Project Scope

Career Mission AI is an MVP career preparation app for students and early job seekers.
The current app uses a React + Vite frontend and prepares a separate backend workspace.

## Directory Structure

```txt
frontend/  React + Vite client
backend/   Backend server workspace
docs/      Planning, checklist, and review documents
```

## Frontend

- App source lives under `frontend/src`.
- Pages live under `frontend/src/pages`.
- Layout components live under `frontend/src/components/layout`.
- Shared data lives under `frontend/src/data`.
- Auth, storage, and API helpers live under `frontend/src/features`.
- Route constants and navigation bridge live in `frontend/src/router.js`.

Run frontend commands from the project root:

```bash
npm run dev
npm run build
npm run lint
```

The root scripts delegate to `frontend`.

## Backend

- Backend code should be added under `backend`.
- Keep backend environment variables separate from frontend variables.
- API keys that should not be exposed to browsers should eventually move to backend `.env`.

## Environment

- Frontend Vite variables live in `frontend/.env`.
- Example values live in `frontend/.env.example`.
- Do not commit real secrets.
- Do not place real keys in `.env.example`.

## Current Implementation Notes

- Frontend routing uses React Router.
- Authentication is currently localStorage-based for MVP flow validation.
- `frontend/src/features/auth/authService.js` owns signup, login, logout, and auth-state helpers.
- Protected routes are centralized in `frontend/src/App.jsx`.
- CareerNet and Q-Net calls are currently frontend MVP integrations and should move behind backend APIs later.

## Safety

- Do not expose API keys in source code or docs.
- Do not implement real AI API calls directly from the frontend.
- Do not implement real payment, JWT, database, or file upload behavior without an explicit backend task.
- Avoid unrelated refactors while feature work is in progress.
