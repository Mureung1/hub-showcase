# Supabase Setup

## Goal

Prepare the `quest_logs` table so the React flow can save and load quest events through `/api/quest-events`.

## Steps

1. Create or open a Supabase project.
2. Open SQL Editor.
3. Run `supabase/migrations/001_create_quest_logs.sql`.
4. If the project does not automatically expose new tables through the Data API, run the service role grants below.
5. Copy project URL into local `.env` as `SUPABASE_URL`.
6. Copy service role key into local `.env` as `SUPABASE_SERVICE_ROLE_KEY`.
7. Restart the dev server and run local verification commands.

```sql
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.quest_logs to service_role;
```

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run typecheck:server
npm.cmd run dev
```

Manual flow:

- Open `/api/health` and confirm `storageMode` is `supabase`.
- Confirm `supabaseConfigured` is `true`.
- `POST /api/quest-events` returns `201 Created`.
- `GET /api/quest-events?limit=5` returns `200 OK`.
- `GET /api/manager-context` returns `200 OK`.
- First visit
- Profile setup
- Accept today's quest
- Complete quest
- Open journal
- Refresh
- Confirm server quest events and manager context are loaded

## Security Notes

- Keep RLS enabled.
- Use the service role key only through the local API/server layer.
- Do not put Supabase keys in React components, docs, PR text, screenshots, or commits.
- Do not prefix server secrets with `NEXT_PUBLIC_`.
