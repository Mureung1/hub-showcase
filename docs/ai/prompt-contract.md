# NoticePilot Prompt Contract

## Purpose

This document defines the prompt contract for real AI integration. The contract is intended to produce reliable AI raw JSON that can be normalized by the server into the current NoticePilot app schema.

## Prompt Goals

The AI should convert a long notice into structured, actionable information:

- deadlines
- tasks
- submissions
- requirements
- cautions
- calendar event candidates
- evidence for extracted items

The AI should not behave as a generic summarizer. Summary is useful, but the primary output is structured action extraction.

## Current Runtime Boundary

The backend uses Zod schemas to validate AI raw output and app analysis results. The prompt contract still targets AI raw JSON, not the frontend app schema.

Campus preferences may exist in the app as `userPreferencesSnapshot`, but they are inert metadata in the current MVP. They must not change AI extraction, filtering, Markdown export, or `.ics` export behavior unless a later phase explicitly changes this contract.

## JSON-only Output Rule

The AI must return JSON only.

Do not return:

- Markdown explanations
- prose before or after JSON
- code fences
- comments inside JSON

## No Hallucination Rule

The AI must not invent:

- deadlines
- eligibility requirements
- submission documents
- event dates
- contact details
- application methods
- source URLs

If information is unclear, the AI should set `reviewRequired: true` and preserve the relevant evidence.

## Evidence Extraction Rule

Evidence should be a short source excerpt from the notice text.

Evidence is strongly required for:

- deadlines
- calendar event candidates
- requirements

If evidence is missing, the AI should not fabricate it. The server should keep or warn depending on validation policy.

## Date Extraction Rule

### Initial Rule

The AI should prioritize absolute dates.

Examples:

```text
2026.07.20.
2026-07-20
2026년 7월 20일
```

### Relative Dates

Relative dates may be normalized only when a reliable reference date exists.

Examples of reference dates:

- explicit notice publication date provided by user
- explicit document publication date in source metadata
- clearly stated reference date inside the notice

If the reference date is missing or unreliable, preserve the original expression and set `reviewRequired: true`.

### Ambiguous Dates

For vague or uncertain expressions:

```text
추후 공지
별도 안내
예정
개강 후
접수 종료 후
```

The AI should avoid producing a normalized date unless the date is explicitly recoverable.

## Notice Type Handling

Allowed detected notice types:

```text
school_notice
assignment
scholarship
competition
job_posting
other
unknown
```

The AI may suggest `detectedNoticeType`, but the server should preserve any user-selected notice type separately.

## Ambiguity Handling

Set `reviewRequired: true` when:

- a date is vague
- a deadline is inferred indirectly
- a submission requirement is conditional
- a requirement is unclear
- the source has multiple possible interpretations
- evidence is missing or weak
- the item is low confidence

## UI-only Field Rule

The AI should not output frontend-only fields such as:

```text
edited
selected
completed
expanded
isOpen
```

The server/frontend should generate those fields where necessary.

## Preference Snapshot Rule

The AI should not output `userPreferencesSnapshot` or use campus preferences to suppress, prioritize, filter, or rewrite extracted items in the current contract.

Current prompt inputs should remain focused on the confirmed notice text and document-level metadata:

```text
language
userSelectedNoticeType
noticePublicationDate
uploadedFileName
noticeTitle
noticeText
```

If future preference-aware analysis is introduced, it should use a separate prompt revision and explicit QA coverage.

## Example Prompt Skeleton

```text
You are NoticePilot's notice extraction engine.

Task:
Convert the provided notice into structured AI raw JSON.

Important rules:
- Return JSON only.
- Do not include Markdown code fences.
- Do not invent missing information.
- Extract actionable information, not just a summary.
- Preserve short evidence excerpts for each important item.
- Prioritize absolute dates.
- Use reviewRequired=true for ambiguous or low-confidence items.
- Do not output UI-only fields such as edited, selected, or completed.

Input metadata:
- language: {{language}}
- userSelectedNoticeType: {{userSelectedNoticeType}}
- noticePublicationDate: {{noticePublicationDate}}
- uploadedFileName: {{uploadedFileName}}
- noticeTitle: {{noticeTitle}}

Notice text:
{{noticeText}}

Return JSON matching the AI raw schema.
```

## Example Valid AI Raw Response

```json
{
  "document": {
    "title": "2026학년도 2학기 장학금 신청 안내",
    "detectedNoticeType": "scholarship",
    "language": "ko"
  },
  "summary": "2026학년도 2학기 장학금 신청 기간과 제출 서류를 안내하는 공지입니다.",
  "items": [
    {
      "kind": "deadline",
      "title": "장학금 신청 마감",
      "description": "장학금 신청은 2026년 7월 20일까지입니다.",
      "dateExpression": "2026.07.20.",
      "normalizedDate": "2026-07-20",
      "evidence": "신청 기간: 2026.07.10. ~ 2026.07.20.",
      "confidence": "high",
      "reviewRequired": false
    },
    {
      "kind": "submission",
      "title": "성적증명서 제출",
      "description": "성적증명서를 제출해야 합니다.",
      "dateExpression": "",
      "normalizedDate": "",
      "evidence": "제출서류: 성적증명서, 자기소개서",
      "confidence": "high",
      "reviewRequired": false
    }
  ],
  "calendarEventCandidates": [
    {
      "title": "장학금 신청 마감",
      "eventType": "deadline",
      "dateExpression": "2026.07.20.",
      "normalizedDate": "2026-07-20",
      "sourceItemIndex": 0,
      "evidence": "신청 기간: 2026.07.10. ~ 2026.07.20.",
      "confidence": "high",
      "reviewRequired": false
    }
  ],
  "warnings": []
}
```

## Example Problematic Response

```json
{
  "summary": "장학금 공지입니다.",
  "deadlines": [
    {
      "title": "신청 마감",
      "date": "곧 마감"
    }
  ]
}
```

Problems:

- returns app-like schema instead of AI raw schema
- missing `document`
- missing `items`
- missing `calendarEventCandidates`
- missing evidence
- ambiguous date

Expected server handling:

- reject or normalize with `schema_mismatch` warning
- do not create a reliable calendar event from “곧 마감”
- preserve warning for review
- avoid hallucinating a normalized date

## Provider Failure Assumptions

The prompt contract does not handle provider failures directly. Server integration should distinguish:

- timeout
- provider error
- quota/rate-limit error
- invalid JSON
- schema mismatch
- AI not configured

No automatic fallback to server mock should occur. A future user-controlled fallback option may be added.
