# Architecture Overview

> Wiki version: 2026-07-07 Phase 3 baseline / Phase 4 planning  
> Implementation baseline: React + Vite frontend MVP, Express mock analyze API, frontend-server mock analyze wiring  
> Runtime scope: real AI API, PDF/HWP/HWPX/OCR extraction, batch calendar export, and subscription feed are not implemented yet.

## 1. Project Summary

**NoticePilot**은 대학생이 긴 공지, 과제 지침, 장학금 안내, 공모전 공지, 채용 공고를 실행 가능한 체크리스트와 캘린더 일정 후보로 바꿀 수 있게 돕는 MVP 웹앱이다.

핵심 흐름은 다음과 같다.

```text
Long notice
→ structured analysis result
→ user review/edit
→ checklist export
→ selected all-day .ics calendar export
```

NoticePilot은 단순 요약 앱이 아니다. 사용자가 실제로 해야 할 일, 제출해야 할 자료, 확인해야 할 조건, 놓치면 안 되는 마감일을 구조화하는 데 초점을 둔다.

---

## 2. Current Implementation Status

현재 프로젝트는 **React + Vite 기반 frontend MVP + Express mock analyze API** 단계다.

현재 구현된 기능은 다음과 같다.

```text
- React + Vite frontend MVP
- Express analyze API skeleton
- GET /api/health
- POST /api/analyze mock mode
- mode: "ai" returns 501 ai_not_implemented
- unknown explicit mode returns 400 unsupported_mode
- Vite /api dev proxy to Express server
- English / Korean UI toggle
- Project introduction section
- Notice title and body input UI
- TXT / MD file upload
- Extract preview before analysis
- Notice type input
- Notice publication date input
- Client-side mock analysis flow
- Server mock analysis flow
- Mock analysis dashboard
- Item edit/delete
- Task completion toggle
- Calendar event selection toggle
- Source evidence panel
- Full evidence review mode
- Warning and error UI
- Privacy-like pattern detection and confirmation
- New notice overwrite confirmation
- Frontend analysis result validation/normalization
- Server analysis result validation/normalization
- localStorage persistence with noticepilot:v1
- Markdown checklist download
- Optional Markdown evidence inclusion
- Selected all-day .ics calendar export
- Server unavailable / invalid response error handling
```

아직 구현하지 않은 기능은 다음과 같다.

```text
- Real AI API integration
- Runtime AI prompt/schema hardening
- PDF / HWP / HWPX / OCR extraction
- Advanced relative date resolution
- School-level notice parsing
- Checkbox-based batch .ics export
- Subscription calendar feed
- Multiple saved notice projects
- Login / database / payment
- Google Calendar API integration
```

---

## 3. Current Architecture

현재 NoticePilot은 다음 구조를 따른다.

```text
React Client
  - notice input
  - TXT / MD file read with FileReader
  - extract preview
  - client-side mock analysis
  - server mock analysis through /api/analyze
  - analysis dashboard
  - editable result cards
  - source evidence panel
  - full evidence review mode
  - Markdown export
  - selected all-day .ics export
  - localStorage session persistence

Express Server
  - GET /api/health
  - POST /api/analyze
  - mock analysis service
  - real AI service stub
  - response validation
  - response normalization
  - section limits
  - duplicate calendar event removal

Future Express Endpoint
  - /api/extract
  - file upload
  - server-side text extraction
  - PDF / HWPX / HWP / OCR parsing
```

Current analysis paths:

```text
Manual paste or TXT/MD file
→ user reviews extracted text
→ client-side mock analysis OR server mock analysis
→ validation / normalization
→ analysis dashboard
→ user edit/review
→ Markdown export and selected all-day .ics export
```

Future real AI path:

```text
Manual paste, extracted text, or future /api/extract output
→ user review/edit
→ POST /api/analyze mode="ai"
→ AI raw schema
→ server-side normalization/validation
→ current NoticePilot app schema
→ React dashboard
```

---

## 4. Frontend / Backend Responsibility Split

### React Client Responsibilities

```text
- Manage current working state with App.jsx + useState
- Provide bilingual UI
- Accept notice title and body
- Support TXT / MD file upload in the current MVP
- Show extracted text preview
- Show privacy notice and lightweight privacy pattern warnings
- Request client-side mock analysis
- Request server mock analysis
- Defensively validate/normalize received analysis results
- Render analysis result dashboard
- Allow user edits, deletion, task completion, and event selection
- Show source evidence
- Export Markdown checklist
- Export selected all-day .ics calendar events
- Persist current session in localStorage
```

### Express Server Responsibilities

```text
- Provide health check endpoint
- Receive confirmed notice text through /api/analyze
- Route between mock mode and future AI mode
- Return server mock analysis results during MVP development
- Keep real AI mode blocked with explicit 501 ai_not_implemented until implemented
- Reject unsupported explicit modes with 400 unsupported_mode
- Treat model/service output as untrusted
- Validate and normalize analysis results
- Generate missing IDs
- Normalize missing fields
- Filter invalid calendar events
- Remove exact duplicate calendar events
- Apply section limits
- Return safe structured JSON to React
```

The AI response must be treated as untrusted external input. The server should not forward raw AI output directly to the client without validation and normalization.

---

## 5. State Management Strategy

For the current MVP, NoticePilot keeps the main state in `App.jsx` using `useState`.

The project does not use `useReducer`, Context, Zustand, Redux, or another state management library in the current phase.

Repeated update logic is separated into utility functions.

Current utility direction:

```text
src/utils/analysisHandlers.js
```

This utility includes or supports:

```text
- updateSectionItem
- deleteSectionItem
- toggleTaskCompleted
- toggleCalendarEventSelected
- updateCalendarEventField
```

This avoids premature abstraction while reducing duplicated item update logic.

Future migration to `useReducer` or Context may be reconsidered if:

```text
- prop drilling becomes difficult to maintain
- analysis result schema grows significantly
- multiple saved notice projects are introduced
- advanced filtering/search is added
- batch calendar export introduces multi-notice state
```

---

## 6. Analysis Data Model Decision

For the current app schema, NoticePilot keeps the analysis result as separated arrays.

```js
{
  deadlines: [],
  tasks: [],
  submissions: [],
  requirements: [],
  cautions: [],
  calendarEvents: []
}
```

This decision is intentional.

### Why separated arrays are used

```text
- They match the current UI sections.
- They keep domain meaning clear.
- Each section can have its own normalization rules.
- Validation and rendering remain easy to review.
- Peer reviewers can understand the MVP domain model more easily.
```

### Why not a unified `items[]` model yet

A common `items[]` model would make generic rendering easier, but it would blur domain-specific meanings. Deadlines, tasks, submissions, requirements, cautions, and calendar events have different fields and review rules.

For the current app:

```text
Data model: separated arrays
UI implementation: reusable components and generic handlers
```

A unified model may be reconsidered later if the app needs:

```text
- global search
- cross-section filtering
- unified timeline
- item-level workflow
- saved multi-notice projects
- extraction graph model for batch notice parsing
```

---

## 7. AI Raw Schema vs App Schema Strategy

Phase 4 planning decision:

```text
AI should not directly return the current frontend app schema.
AI should return an AI raw schema.
The server should normalize and validate the AI raw schema into the current NoticePilot app schema.
```

Reasoning:

```text
- AI output should not be coupled to UI-only fields such as edited, selected, or completed.
- The current app schema can remain stable for rendering and export.
- Server-side normalization can handle missing fields, date policy, evidence policy, and warnings.
- Future school-level notice parsing and batch calendar export can evolve toward an extraction graph model without rewriting the frontend immediately.
```

Initial mapping direction:

```text
AI raw items[kind=deadline]      → deadlines[]
AI raw items[kind=task]          → tasks[]
AI raw items[kind=submission]    → submissions[]
AI raw items[kind=requirement]   → requirements[]
AI raw items[kind=caution]       → cautions[]
AI calendarEventCandidates       → calendarEvents[]
AI warnings                      → analysisResult.warnings[]
```

This is a Phase 4 design target. Runtime real AI integration is not implemented yet.

---

## 8. Source Metadata and File Strategy

For the MVP, source metadata is stored at the document level.

```js
{
  source: {
    sourceType: "manual" | "file",
    sourceName: "",
    sourceUrl: "",
    uploadedFileName: "",
    createdAt: "",
    analyzedAt: ""
  }
}
```

Each extracted item should keep its `evidence` text. Full item-level source metadata is not required in the current MVP.

Current file input:

```text
- TXT / MD only
- client-side FileReader
- file size limit
- no server upload
- extracted text preview before analysis
- file object is not stored
- uploaded file name is metadata only
```

Future automatic university notice parsing may extend source metadata to item level.

```js
{
  sourceUrl: "",
  sourceTitle: "",
  sourcePublishedAt: "",
  crawledAt: "",
  institutionId: "",
  noticeCategory: ""
}
```

This would allow users to trace each extracted deadline or event back to the original university notice page.

---

## 9. Notice Type Strategy

For the MVP, NoticePilot uses both optional user-selected notice type and AI-detected notice type.

Supported user-selected values:

```text
- school_notice
- assignment
- scholarship
- competition
- job_posting
- other
```

The analysis result stores or prepares both values.

```js
{
  userSelectedNoticeType: "scholarship",
  detectedNoticeType: "scholarship"
}
```

If the user does not select a notice type, `userSelectedNoticeType` may be empty in the input state and normalized to `"unknown"` in analysis metadata. Future AI may still infer `detectedNoticeType`.

This supports future filtering, corpus evaluation, and automatic notice parsing.

---

## 10. Date Resolution Strategy

NoticePilot distinguishes between three date types.

```text
Absolute date:
- 2026-07-20
- 2026년 7월 20일

Relative date:
- 공고일로부터 7일 이내
- 개강 후 2주 이내
- 다음 주 금요일까지

Vague date:
- 7월 중
- 추후 공지
```

### Reference Date Priority

Reference dates should be resolved in the following order.

```text
1. User-entered notice publication date
2. Notice date explicitly extracted from document text
3. Uploaded file metadata date
4. Analysis date
```

High-confidence reference dates:

```text
- user-entered notice publication date
- document-extracted notice date
```

Low-confidence reference dates:

```text
- uploaded file lastModified
- analysis date
```

### Current MVP Rule

```text
- Absolute dates can become calendar event candidates.
- Relative dates can be calculated only when a reliable reference date exists.
- Calculated relative dates must be marked as reviewRequired.
- Calculated relative dates should not be selected for .ics export by default.
- Vague dates should be placed in cautions, not calendarEvents.
```

### Phase 4 Direction

```text
- First real AI implementation should prioritize absolute dates.
- Relative dates may be accepted only when a reliable reference date exists.
- Long-term direction is server-side date resolution using originalDateExpression and referenceDate.
```

---

## 11. ICS Export Strategy

For the current MVP, NoticePilot supports **all-day calendar events only**.

### Current Rule

```text
- Export only selected calendar events.
- Export only events with a clear startDate.
- Use all-day VEVENT format.
- Do not implement time-specific events yet.
- Do not implement timezone handling yet.
- Do not implement Google Calendar API integration.
```

For all-day events:

```text
DTSTART;VALUE=DATE:YYYYMMDD
DTEND;VALUE=DATE:next-day-YYYYMMDD
```

Time-specific events and timezone handling are future enhancements.

This decision keeps the first `.ics` implementation simple and improves compatibility testing across Apple Calendar, Samsung Calendar, Outlook, and Google Calendar.

---

## 12. Local Storage Persistence Strategy

For the MVP, NoticePilot uses localStorage to preserve the current working state.

Stored data:

```text
- language
- noticeTitle
- sourceText
- extractedText
- uploadedFileName
- userSelectedNoticeType
- noticePublicationDate
- analysisResult
- calendar event selection state inside analysisResult
```

Use a versioned localStorage key.

```text
noticepilot:v1
```

If the schema changes later, use a new key.

```text
noticepilot:v2
```

MVP rules:

```text
- Restore saved state on app load when schema version matches.
- Reset safely if parsing fails or schema version is incompatible.
- Do not store uploaded file objects.
- Store uploaded file name only as metadata.
```

---

## 13. Privacy and Sensitive Information Handling

NoticePilot may process notices or application-related documents that contain personal information.

For the MVP, full anonymization is out of scope. However, the app includes basic privacy safeguards.

### Current MVP Policy

```text
- Display a warning before analysis.
- Tell users not to paste or upload sensitive personal information.
- Run simple client-side pattern checks.
- Detect email addresses, phone numbers, and resident-registration-number-like strings.
- If detected, show a warning banner and confirmation modal before analysis.
- Do not automatically remove or rewrite user text in the MVP.
- Let the user decide whether to continue.
```

Out of scope:

```text
- full anonymization
- secure file storage
- document encryption
- account-level privacy controls
- enterprise compliance
- personal eligibility profile matching
```

---

## 14. Future Expansion: University Notice Parsing and Batch Calendar Export

Future versions may reduce manual input by parsing university notice pages and letting users choose useful calendar events.

Possible future flow:

```text
university notice pages
→ parsed source notices
→ normalized calendar event candidates
→ user selects event-level checkboxes
→ selected .ics export
→ future subscription calendar feed
```

Early future filters should remain metadata-based.

```text
- institution
- noticeType
- noticeCategory
- keyword
- published date
- deadline date
```

Batch export design direction:

```text
- Initial selection unit: calendarEvent candidate
- Later addition: notice-level select-all
- Export unit: selected valid calendarEvents
- Future stable UID strategy should support re-export and subscription feeds
```

Personal condition matching is intentionally excluded from early design due to privacy and scope concerns. The app should not store user grade level, major, completed credits, region, or personal eligibility profiles in the MVP.

---

## 15. Roadmap Summary

```text
Completed:
- Phase 1: Frontend MVP follow-up
- Phase 1-QA: Frontend major QA fixes
- Phase 2: Express analyze API skeleton
- Phase 2-QA: Backend analyze API QA fixes
- Phase 3: Frontend ↔ server mock analyze wiring
- Phase 3-QA: Server mock wiring QA

Next:
- Phase 4-A: Planning / contract documentation
- Phase 4-B: Test corpus scaffold
- Phase 4-C: Real AI API integration
- Phase 4-D: Corpus-based AI QA
- Phase 4-E: Date resolution v1

Future:
- Phase 5: Advanced file extraction
- Phase 6: School-level notice parsing
- Phase 7: Batch calendar export
- Phase 8: Subscription calendar feed
```
