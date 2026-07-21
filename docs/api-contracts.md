# API Contracts

## Environment names

Do not commit real values.

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## GET /api/health

Success `200`:

```json
{
  "ok": true,
  "api": "hono",
  "storageMode": "memory",
  "supabaseConfigured": false
}
```

`storageMode` is `supabase` only when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in the local server environment. Do not expose the actual values in screenshots, docs, or PR text.

2026-07-21 local Supabase smoke criteria:

- `GET /api/health` returns `storageMode: "supabase"` and `supabaseConfigured: true`.
- `POST /api/quest-events` returns `201 Created`.
- `GET /api/quest-events?limit=5` returns `200 OK`.
- `GET /api/manager-context` returns `200 OK`.

## POST /api/quest-events

Request:

```json
{
  "type": "quest_completed",
  "quest": {
    "title": "DB concept study",
    "type": "time",
    "amount": 15,
    "unit": "min",
    "difficulty": "normal",
    "deadlineAt": "2026-07-15T14:59:00.000Z"
  },
  "result": "success",
  "expDelta": 20,
  "failureReason": null,
  "previousQuestTitle": null,
  "recoveryFromEventId": null,
  "managerMoodAfter": "happy",
  "managerLine": "The quest event was saved as memory.",
  "clientCreatedAt": "2026-07-15T13:20:00.000Z",
  "metadata": {
    "rewardCandidates": ["character_animation", "desktop_theme", "sound"],
    "futureContextTargets": ["personalized_manager", "web_day_flow", "reward_system"]
  }
}
```

Success `201`:

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "type": "quest_completed",
    "title": "DB concept study",
    "result": "success",
    "expDelta": 20,
    "failureReason": null,
    "managerMoodAfter": "happy",
    "createdAt": "2026-07-15T13:20:01.000Z",
    "metadata": {}
  },
  "managerContext": {
    "currentMood": "happy",
    "recentEventCount": 1,
    "lastQuestResult": "success",
    "memorySummary": "recent events 1: success 1, failed 0, recovery 0.",
    "rewardHints": ["character_animation"]
  }
}
```

## GET /api/quest-events

Query:

- `limit`: optional, default `20`, max `100`
- `cursor`: optional
- `type`: optional quest event type
- `result`: optional, `success | failed | recovery`

Success `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "type": "quest_completed",
      "title": "DB concept study",
      "result": "success",
      "expDelta": 20,
      "failureReason": null,
      "managerMoodAfter": "happy",
      "createdAt": "2026-07-15T13:20:01.000Z",
      "metadata": {}
    }
  ],
  "page": {
    "nextCursor": null
  }
}
```

## GET /api/manager-context

Success `200`:

```json
{
  "ok": true,
  "data": {
    "currentMood": "happy",
    "recentEventCount": 3,
    "lastQuestResult": "recovery",
    "memorySummary": "recent events 3: success 1, failed 1, recovery 1.",
    "rewardHints": ["character_animation", "memory_fragment", "gentle_recovery_tone"]
  }
}
```

## Failure response

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request value is invalid.",
    "details": {
      "field": "result"
    }
  }
}
```

Error codes:

- `VALIDATION_ERROR`
- `DB_INSERT_FAILED`
- `DB_SELECT_FAILED`
- `UNAUTHORIZED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`
