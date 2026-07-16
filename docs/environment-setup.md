# Environment Setup

## Stack

- React + Vite + TypeScript
- Hono API through Vite local middleware
- TypeScript server contracts/routes
- Server-side memory store for DB-free local flow checks
- Supabase Postgres through REST

## Local Files

Create a local `.env` file from `.env.example`.

```powershell
Copy-Item .env.example .env
```

Fill these values locally only:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not commit `.env`.

## Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run typecheck:server
npm.cmd run build
```

Check the local API mode in the browser or DevTools:

```text
http://localhost:5173/api/health
```

Expected without local Supabase secrets:

```json
{"ok":true,"api":"hono","storageMode":"memory","supabaseConfigured":false}
```

Expected after local Supabase values are configured:

```json
{"ok":true,"api":"hono","storageMode":"supabase","supabaseConfigured":true}
```

## Notes

- React calls `/api/quest-events` and `/api/manager-context`.
- During local dev, `vite.config.ts` handles `/api/*` and reads `.env`.
- API verification should use `npm.cmd run dev`; `npm.cmd run preview` does not attach the local Hono middleware.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- Browser code should not read or expose Supabase keys.
