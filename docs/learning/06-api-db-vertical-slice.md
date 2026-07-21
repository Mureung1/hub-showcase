# API DB Vertical Slice

## Keywords

- FE-BE-DB vertical slice
- API contract
- POST /api/quest-events
- GET /api/quest-events
- GET /api/manager-context
- Hono
- Supabase REST
- Supabase Data API grant
- RLS
- server-side memory store
- server-side secret
- fetch adapter
- optimistic flow vs server response
- error state
- Vite middleware
- /api/health storage mode
- service_role key

## Why It Matters

This topic explains how quest completion, failure, recovery, server storage, and journal rendering connect without breaking the XP desktop flow.

## Reference Code Paths

- src/App.tsx
- src/layers/storage/questLogApi.ts
- src/data/questLogs.ts
- src/layers/storage/questLogRepository.ts
- server/app.ts
- server/contracts/questEvents.ts
- server/routes/questEvents.ts
- server/lib/questEventStore.ts
- server/lib/supabase.ts
- server/index.ts
- vite.config.ts
- supabase/migrations/001_create_quest_logs.sql
- docs/api-contracts.md
- docs/db-schema.md
- docs/supabase-setup.md

## Parts To Check

- `createQuestEventViaApi` and when it is called from complete/failure/recovery handlers
- `fetchQuestEventsViaApi` and desktop entry refresh behavior
- `fetchManagerContextViaApi` and how Lumi state is updated
- `QuestLogSyncState` and journal error notice rendering
- `CreateQuestEventRequest`, `QuestEventResponseItem`, `ManagerContext`, and common API error shape
- Supabase REST insert/select mapping in `createSupabaseQuestEventStore`
- Memory store behavior when Supabase env is not configured
- `/api/health` result: `memory` vs `supabase`
- Data API permission gap: table exists but REST insert/select can still fail without grants
- `.env.example` names only: no real keys

## ChatGPT Questions

- Explain the FE-BE-DB vertical slice using this project's Quest Event flow.
- Walk through how `POST /api/quest-events` is called from React and converted into a DB row.
- Compare browser mock storage, server memory store, and Supabase persistence in this codebase.
- How should API failure states be designed so the user flow does not break?
- Explain why `service_role` belongs in the Hono server environment, not React code.
- Why can `/api/health` show Supabase configured while `POST /api/quest-events` still fails?
