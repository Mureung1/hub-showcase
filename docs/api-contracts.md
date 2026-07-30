# API Contracts

## Environment names

Do not commit real values.

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-nano
OPENAI_FALLBACK_MODEL=gpt-5-mini
LLM_MANAGER_ENABLED=
LLM_MANAGER_MIN_INTERVAL_MS=
LLM_MANAGER_DAILY_LIMIT=
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

## Manager LLM API v1

React must call only these Hono routes. It must not call OpenAI or any other LLM provider directly.

Routes:

- `POST /api/manager/line`
- `POST /api/manager/quest-suggestion`
- `POST /api/manager/difficulty-evaluation`
- `POST /api/manager/stat-evaluation`
- `POST /api/manager/behavior-intent`
- `POST /api/manager/goal-plan`
- `POST /api/manager/plan-rebalance`
- `POST /api/manager/quest-acceptance-preview`

Prompt version:

- `manager-api-v1`

Server env:

- `OPENAI_API_KEY`: server-only secret. Never commit a real value.
- `OPENAI_MODEL`: default `gpt-5-nano`.
- `OPENAI_FALLBACK_MODEL`: default `gpt-5-mini`. Used for planning-heavy routes: `goalPlan`, `planRebalance`, and `questAcceptancePreview`.
- `LLM_MANAGER_ENABLED`: set to `true` only in an environment where the server key is configured.
- `LLM_MANAGER_MIN_INTERVAL_MS`: optional in-memory minimum interval per output kind. Default is `30000`.
- `LLM_MANAGER_DAILY_LIMIT`: optional in-memory daily cap. Default is `80`.

Request:

```json
{
  "promptVersion": "manager-api-v1",
  "outputKind": "behaviorIntent",
  "managerContext": {
    "currentMood": "waiting",
    "recentEventCount": 1,
    "lastQuestResult": "success",
    "memorySummary": "recent events summary",
    "rewardHints": ["character_animation"]
  },
  "profile": {
    "nickname": "루카스",
    "goal": "정보처리기사",
    "category": "study",
    "dailyMinutes": 30,
    "questSize": "balanced",
    "managerTone": "friendly"
  },
  "persona": {
    "petId": "pink-manager",
    "tone": "friendly",
    "questStyle": "balanced",
    "feedbackStyle": "playful",
    "behaviorStyle": "balanced"
  },
  "questState": {
    "status": "success",
    "currentQuest": {
      "title": "DB concept study 15min",
      "type": "time",
      "amount": 15,
      "unit": "min",
      "difficulty": "normal",
      "deadline": "today 23:59",
      "rewardExp": 20
    },
    "previousQuestTitle": null,
    "failureReason": null
  },
  "recentEvents": [
    {
      "type": "quest_completed",
      "title": "DB concept study 15min",
      "result": "success",
      "difficulty": "normal",
      "createdAt": "2026-07-29T10:00:00.000Z"
    }
  ]
}
```

Success `200`:

```json
{
  "ok": true,
  "data": {
    "behaviorIntent": {
      "behaviorStyle": "balanced",
      "tone": "friendly",
      "line": "오늘 페이스를 기억해둘게.",
      "suggestedBehaviorBias": []
    },
    "source": "llm",
    "promptVersion": "manager-api-v1"
  }
}
```

Fallback also returns `200` so the app flow can continue:

```json
{
  "ok": true,
  "data": {
    "behaviorIntent": {
      "behaviorStyle": "balanced",
      "tone": "friendly",
      "line": "오늘 할 수 있는 작은 분량부터 같이 골라보자.",
      "suggestedBehaviorBias": []
    },
    "source": "rule_fallback",
    "fallbackReason": "LLM_DISABLED",
    "promptVersion": "manager-api-v1"
  }
}
```

Fallback reasons:

- `LLM_DISABLED`
- `LLM_PROVIDER_ERROR`
- `INVALID_LLM_OUTPUT`
- `RATE_LIMITED`
- `CLIENT_THROTTLED`

### POST /api/manager/quest-suggestion

Use this route only when the user asks for a new quest recommendation. The route should turn the long-term profile goal into one concrete next action for today.

Rules:

- `title` must be a small action, not a copy of the long-term goal.
- `type` must be `time`, `quantity`, or `action`.
- `amount` should follow `questSize` and `dailyMinutes`: `tiny` usually `5..10` minutes or `1..3` items, `balanced` usually `15..25` minutes or `3..7` items, `challenge` usually `30..45` minutes or `8..15` items.
- `difficulty` must be `easy`, `normal`, or `hard`; `hard` is reserved for challenge-sized work, long focus blocks, or concrete deliverables.
- `rewardExp` must match the selected difficulty range: `easy=5..15`, `normal=16..35`, `hard=36..60`.
- If the provider returns a copied broad goal title or an out-of-range reward, the server returns `INVALID_LLM_OUTPUT` rule fallback.

### POST /api/manager/goal-plan

Use this route after profile creation or goal change. It creates a bounded structured plan instead of a free-text coaching paragraph.

Output includes:

- `goalSummary`
- `horizon`: `month` or `quarter`
- `milestones`
- `monthlyPlan`
- `weeklyPlan`
- `dailySeeds`
- `risks`
- `rebalancingPolicy`

`dailySeeds` use the same quest limits as `questSuggestion`, plus `linkedMilestoneId`.

Storage:

- When Supabase is configured, the server stores the plan in `manager_goal_plans`.
- If storage succeeds, response data includes `storedPlanId`.
- Storage failure is swallowed so the UI flow still receives the plan response.

### POST /api/manager/plan-rebalance

Use this route after meaningful success/failure signals, not after every render. The request may include `activePlanId` and `activePlan`.

Recommended call triggers:

- one failed quest with a time shortage or too-hard reason
- recovery completed
- three consecutive successes
- skipped-day recovery flow

The response contains `planRebalance.rebalancedPlan`, a small `changes` list, and `nextQuest`. The full `rebalancedPlan` is for storage and future scheduling; UI should show only `nextQuest` plus a short recovery reason.

`nextQuest` fields:

- `title`
- `type`: `time | quantity | action`
- `amount`
- `unit`
- `difficulty`: `easy | normal | hard`
- `deadline`
- `rewardExp`: must match `easy=5..15`, `normal=16..35`, `hard=36..60`
- `linkedMilestoneId`
- `recoveryReason`

When Supabase is configured, the server stores revisions in `manager_plan_revisions` and includes `storedRevisionId` when storage succeeds.

### POST /api/manager/quest-acceptance-preview

Use this route immediately before accepting an edited quest draft when the UI needs one server call to settle difficulty, EXP, and stat reward together.

Rules:

- `difficulty` must be `easy`, `normal`, or `hard`.
- `rewardExp` must match `easy=5..15`, `normal=16..35`, `hard=36..60`.
- `statEvaluation.difficulty` must match preview `difficulty`.
- `statEvaluation.statBudget` must match `easy=3`, `normal=7`, `hard=15`.

### POST /api/manager/difficulty-evaluation

Use this route immediately before accepting an edited quest draft. The route evaluates the current quest title, amount, type, profile goal, persona, manager context, and recent event summary, then returns only a bounded difficulty and reward.

Success `200`:

```json
{
  "ok": true,
  "data": {
    "difficultyEvaluation": {
      "difficulty": "hard",
      "rewardExp": 40,
      "reason": "The edited quest is a long focused study block."
    },
    "source": "llm",
    "promptVersion": "manager-api-v1"
  }
}
```

Rules:

- `difficulty` must be `easy`, `normal`, or `hard`.
- `rewardExp` must match the selected difficulty range.

| difficulty | rewardExp range |
|---|---|
| `easy` | `5..15` |
| `normal` | `16..35` |
| `hard` | `36..60` |
- If the provider is disabled, rate-limited, fails, or returns an invalid schema, the server returns rule fallback and React accepts the quest with the existing draft difficulty/reward.

Privacy and storage rules:

- Do not send API keys, Supabase keys, tokens, raw DB rows, DOM state, sprite paths, coordinates, school/location data, or personal schedule data.
- Do not store raw prompts in Supabase.
- Store only the final user-visible manager line and minimal metadata such as `source`, `fallbackReason`, and `promptVersion` when needed.
