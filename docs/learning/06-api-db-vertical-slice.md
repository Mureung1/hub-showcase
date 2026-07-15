# API DB Vertical Slice

## Keywords

- FE-BE-DB vertical slice
- API contract
- POST /api/quest-logs
- GET /api/quest-logs
- Supabase REST
- server-side secret
- fetch adapter
- optimistic flow vs server response
- error state
- Vite middleware

## Why It Matters

This topic explains how quest completion, failure, recovery, server storage, and journal rendering connect without breaking the XP desktop flow.

## Reference Code Paths

- src/App.tsx
- src/layers/storage/questLogApi.ts
- src/data/questLogs.ts
- src/layers/storage/questLogRepository.ts
- server/contracts/questLogs.ts
- server/routes/questLogs.ts
- server/lib/supabase.ts
- server/index.ts
- vite.config.ts
- docs/api-contracts.md
- docs/db-schema.md

## Parts To Check

- `saveQuestLog` and when it is called from complete/failure/recovery handlers
- `fetchQuestLogsViaApi` and desktop entry refresh behavior
- `QuestLogSyncState` and journal error notice rendering
- `CreateQuestLogRequest`, `QuestLogResponseItem`, and common API error shape
- Supabase REST insert/select mapping in `createSupabaseQuestLogStore`
- `.env.example` names only: no real keys

## ChatGPT Questions

- Explain the FE-BE-DB vertical slice using this project's quest log flow.
- Walk through how `POST /api/quest-logs` is called from React and converted into a DB row.
- Compare local mock storage and server response based journal rendering in this codebase.
- How should API failure states be designed so the user flow does not break?
