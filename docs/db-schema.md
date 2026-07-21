# DB Schema

## quest_logs

Recommended database: Supabase Postgres.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `user_id` | uuid nullable | future auth link |
| `anonymous_session_id` | text nullable | MVP anonymous session |
| `quest_id` | uuid nullable | future quest table link |
| `event_type` | text | `quest_completed`, `quest_failed`, `recovery_completed`, etc. |
| `title` | text | quest title at event time |
| `quest_type` | text | `time`, `quantity`, `action` |
| `amount` | integer | quest amount |
| `unit` | text | display unit |
| `difficulty` | text | `easy`, `normal`, `hard` |
| `deadline_at` | timestamptz nullable | quest deadline |
| `result` | text nullable | `success`, `failed`, `recovery`; nullable for non-result events |
| `exp_delta` | integer | EXP change from event |
| `failure_reason` | text nullable | selected failure reason |
| `previous_quest_title` | text nullable | recovery context |
| `recovery_from_event_id` | uuid nullable | future self-reference |
| `manager_mood_after` | text nullable | manager state after event |
| `manager_line` | text nullable | manager reaction text used to summarize the event |
| `client_created_at` | timestamptz nullable | client event time |
| `created_at` | timestamptz | server insert time, default `now()` |
| `visibility` | text | default `private` |
| `event_version` | integer | default `1` |
| `metadata` | jsonb | extension data |

Indexes to add with the real migration:

- `created_at desc`
- `(user_id, created_at desc)`
- `(anonymous_session_id, created_at desc)`
- `(result, created_at desc)`
- `(event_type, created_at desc)`

Data API grants used for local Supabase verification:

```sql
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.quest_logs to service_role;
```

Expansion notes:

- Weekly reports can aggregate by `created_at`, `result`, `exp_delta`, and `failure_reason`.
- Manager memory can summarize from private logs instead of storing prompts.
- Public quest exploration must keep `visibility` defaulted to `private`.
- Camera or gesture features should store settings or consent versions only, not raw frames.
