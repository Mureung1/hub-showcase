# API Contracts

## Environment names

Do not commit real values.

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## POST /api/quest-logs

Request:

```json
{
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
  "recoveryFromLogId": null,
  "managerMoodAfter": "happy",
  "clientCreatedAt": "2026-07-15T13:20:00.000Z",
  "metadata": {}
}
```

Success `201`:

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "title": "DB concept study",
    "result": "success",
    "expDelta": 20,
    "failureReason": null,
    "createdAt": "2026-07-15T13:20:01.000Z"
  }
}
```

## GET /api/quest-logs

Query:

- `limit`: optional, default `20`, max `100`
- `cursor`: optional
- `result`: optional, `success | failed | recovery`

Success `200`:

```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "title": "DB concept study",
      "result": "success",
      "expDelta": 20,
      "failureReason": null,
      "createdAt": "2026-07-15T13:20:01.000Z"
    }
  ],
  "page": {
    "nextCursor": null
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
