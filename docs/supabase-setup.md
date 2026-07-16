# Supabase Setup

## Goal

Prepare the `quest_logs` table so the React flow can save and load quest events through `/api/quest-events`.

## Steps

1. Create or open a Supabase project.
2. Open SQL Editor.
3. Run `supabase/migrations/001_create_quest_logs.sql`.
4. Copy project URL into local `.env` as `SUPABASE_URL`.
5. Copy service role key into local `.env` as `SUPABASE_SERVICE_ROLE_KEY`.
6. Run local verification commands.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run typecheck:server
npm.cmd run dev
```

Manual flow:

- Open `/api/health` and confirm `storageMode` is `supabase`.
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
