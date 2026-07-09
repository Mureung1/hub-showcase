# NoticePilot AI Output Schema

## Purpose

This document defines the AI raw schema for NoticePilot. The AI raw schema is intentionally separated from the current frontend app schema.

## Confirmed Decision

The AI must not directly return the current NoticePilot app schema.

Instead, the flow should be:

```text
AI raw schema
→ server normalize / validate
→ NoticePilot app schema
→ frontend rendering / review / export
```

## Why Separate AI Raw Schema from App Schema?

The current app schema is optimized for UI rendering and export behavior. It contains separate arrays such as `deadlines`, `tasks`, `submissions`, `requirements`, `cautions`, and `calendarEvents`.

The AI raw schema should be optimized for extraction quality:

- evidence tracking
- confidence tracking
- ambiguity handling
- date expression preservation
- future batch event extraction
- server-side normalization

This separation prevents prompts from being tightly coupled to UI-only fields such as `edited`, `selected`, or `completed`.

## Current Validation Stack

The backend now uses Zod schemas for app analysis and AI raw schema validation. The frontend still keeps defensive validation utilities for browser-side safety and backward compatibility with older saved results.

## Current App Schema Target

The server should normalize AI raw output into the current app schema:

```json
{
  "summary": "string",
  "detectedNoticeType": "string",
  "userSelectedNoticeType": "string",
  "noticePublicationDate": "string",
  "uploadedFileName": "string",
  "deadlines": [],
  "tasks": [],
  "submissions": [],
  "requirements": [],
  "cautions": [],
  "calendarEvents": [],
  "metadata": {
    "userPreferencesSnapshot": {
      "activeInstitution": "kangwon",
      "selectedCampuses": [],
      "includeCommonNotices": true
    }
  },
  "warnings": []
}
```

`metadata.userPreferencesSnapshot` is optional app metadata. It is not an AI extraction target and should not be required from AI raw output.

## Proposed AI Raw Schema

```json
{
  "document": {
    "title": "string",
    "detectedNoticeType": "school_notice | assignment | scholarship | competition | job_posting | other | unknown",
    "language": "ko | en | mixed | unknown"
  },
  "summary": "string",
  "items": [
    {
      "kind": "deadline | task | submission | requirement | caution",
      "title": "string",
      "description": "string",
      "dateExpression": "string",
      "normalizedDate": "YYYY-MM-DD | empty string",
      "evidence": "string",
      "confidence": "high | medium | low",
      "reviewRequired": true
    }
  ],
  "calendarEventCandidates": [
    {
      "title": "string",
      "eventType": "deadline | start | end | announcement | meeting | other",
      "dateExpression": "string",
      "normalizedDate": "YYYY-MM-DD | empty string",
      "sourceItemIndex": 0,
      "evidence": "string",
      "confidence": "high | medium | low",
      "reviewRequired": true
    }
  ],
  "warnings": [
    {
      "type": "string",
      "message": "string"
    }
  ]
}
```

## User Preferences Snapshot Policy

Campus preferences are currently inert product metadata:

```text
userPreferencesSnapshot
→ request / result metadata only
→ no effect on AI extraction
→ no notice filtering
→ no Markdown export changes
→ no .ics export changes
```

The AI raw schema should not include `userPreferencesSnapshot`. If a future phase explicitly scopes preference-aware filtering or subscription behavior, that should be designed as a separate product and prompt contract change.

## Field Policy

### `document.title`

The AI may infer a document title from the notice text, but the server should still preserve the existing title priority:

```text
user-entered title
→ AI-detected title
→ first non-empty line of confirmed text
→ uploaded file name as metadata only
```

### `document.detectedNoticeType`

Allowed values:

```text
school_notice
assignment
scholarship
competition
job_posting
other
unknown
```

The AI should not override the user's selected notice type. Server normalization may preserve both:

- `userSelectedNoticeType`
- `detectedNoticeType`

### `items.kind`

Allowed values:

```text
deadline
task
submission
requirement
caution
```

Mapping:

```text
items[kind=deadline]    → deadlines[]
items[kind=task]        → tasks[]
items[kind=submission]  → submissions[]
items[kind=requirement] → requirements[]
items[kind=caution]     → cautions[]
```

### `calendarEventCandidates`

Calendar event candidates should represent event-level export candidates.

Mapping:

```text
calendarEventCandidates → calendarEvents[]
```

The server should generate app-level fields such as `id`, `selected`, `dateConfidence`, `dateSource`, and `referenceDate` as needed.

`sourceItemIndex` is acceptable as a v1 hint while the AI raw `items[]` array is still intact. It should not be treated as a durable identifier after filtering, deduplication, or section-limit normalization. If event-to-item traceability becomes important, prefer adding a stable raw item identifier such as `sourceItemId` in a later schema revision.

## Evidence Policy

Evidence is strongly required for:

- deadlines
- calendar event candidates
- requirements

Evidence is recommended for:

- tasks
- submissions
- cautions

Missing evidence should not automatically discard an item. Server normalization should either:

- keep the item with `reviewRequired: true`, or
- add a warning such as `missing_evidence`.

## Confidence Policy

Allowed values:

```text
high
medium
low
```

Suggested interpretation:

```text
high   → direct evidence and unambiguous meaning
medium → direct evidence exists but interpretation may require review
low    → ambiguous, incomplete, or context-dependent
```

Low-confidence items should normally set `reviewRequired: true`.

## `reviewRequired` Policy

Set `reviewRequired: true` when:

- date is ambiguous
- evidence is missing or weak
- item category is uncertain
- deadline is inferred indirectly
- relative date was normalized using a reference date
- the source text uses vague language such as “추후 공지”, “예정”, “별도 안내”

## Date Field Policy

### Phase 4 Initial Policy

- Absolute dates are preferred.
- Relative dates may be accepted only when a reliable reference date exists.
- Ambiguous dates should preserve `dateExpression` and set `reviewRequired: true`.

### Long-term Direction

The long-term direction is server-side date resolution:

```text
original date expression + reference date + context
→ normalized date + confidence + reviewRequired
```

The AI should preserve original date expressions so that the server can resolve dates later.

## Warning Normalization Policy

AI warnings should be normalized into app-level warning objects:

```json
{
  "type": "string",
  "message": "string"
}
```

Server-generated warning types may include:

```text
missing_evidence
ambiguous_date
invalid_normalized_date
schema_mismatch
section_limit_applied
duplicate_calendar_event_removed
low_confidence_item
```

## Future Direction: Extraction Graph

The long-term structure may evolve from `items[]` into an extraction graph:

```text
sourceDocument
→ extractedFacts
→ eventCandidates
→ app schema / batch export / subscription feed
```

This is not the Phase 4 implementation target. It should be treated as a future design direction after enough corpus examples are collected.
