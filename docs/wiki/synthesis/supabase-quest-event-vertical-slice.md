---
title: Supabase Quest Event Vertical Slice
type: synthesis
status: active
updated: 2026-07-21
source_paths:
  - src/App.tsx
  - src/layers/storage/questLogApi.ts
  - server/app.ts
  - server/index.ts
  - server/routes/questEvents.ts
  - server/lib/supabase.ts
  - supabase/migrations/001_create_quest_logs.sql
  - docs/api-contracts.md
  - docs/db-schema.md
  - docs/supabase-setup.md
  - docs/status.md
confidence: high
tags:
  - supabase
  - hono
  - vertical-slice
  - quest-events
  - wiki
---

# Supabase Quest Event Vertical Slice

This page summarizes the current verified FE-BE-DB slice for Quest Events. It is a synthesis page, not a replacement for the API contract, DB schema, or source code.

## Verified Path

```text
React quest event
-> questLogApi fetch adapter
-> Vite local /api middleware
-> Hono quest event route
-> Supabase REST Data API
-> public.quest_logs
-> manager context response
-> React logs, journal, and Lumi state
```

## Current Contract

- React creates a `CreateQuestEventRequest` for quest complete, fail, and recovery complete actions.
- `src/layers/storage/questLogApi.ts` sends `POST /api/quest-events`, `GET /api/quest-events`, and `GET /api/manager-context`.
- `vite.config.ts` forwards `/api/*` requests to the Hono app during local development.
- `server/index.ts` selects Supabase storage only when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist in the server environment.
- If Supabase env is missing, the server intentionally falls back to memory storage.
- `server/lib/supabase.ts` maps Quest Event requests to the `public.quest_logs` table.

## Verification Evidence

The 2026-07-21 local smoke test verified:

- `GET /api/health` returned `storageMode: "supabase"` and `supabaseConfigured: true`.
- `POST /api/quest-events` returned `201 Created`.
- `GET /api/quest-events?limit=5` returned `200 OK`.
- `GET /api/manager-context` returned `200 OK`.

The UI still needs a final manual pass before moving the GitHub Project card from `In review` to `Done`.

## Supabase Permission Note

The table migration enables RLS and creates indexes. In projects where new tables are not automatically exposed through the Data API, the local verification also requires explicit `service_role` grants:

```sql
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.quest_logs to service_role;
```

Keep the service role key server-side only. Do not put it in React code, screenshots, PR text, or committed docs.

## What This Unlocks

- Journal entries can be loaded from server persistence instead of only browser state.
- `ManagerContext` can summarize recent events for rule-based reactions now and LLM manager prompts later.
- Reward hints such as character animation, memory fragment, and recovery tone can be derived from event history.
- Public quest exploration can later filter by `visibility` while defaulting to private records.

## Remaining Gaps

- Browser UI verification should confirm quest complete/fail/recovery clicks produce the expected Network requests.
- Auth and user-specific RLS policies are not implemented yet.
- The current API uses one `quest_logs` event table; future tables should be added only when the event table becomes too broad for a real feature.
