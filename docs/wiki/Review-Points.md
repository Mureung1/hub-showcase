# Review Points

> Wiki version: 2026-07-07 Phase 3 baseline / Phase 4 planning  
> Review baseline: React + Vite frontend MVP, Express mock analyze API, frontend-server mock analyze wiring  
> Review scope: implementation quality, architecture direction, and Phase 4 planning rather than production readiness.

## 1. Purpose of Peer Review

This project is not being reviewed as a finished production service. It is an MVP built to explore how AI can help convert long university-related notices into actionable outputs.

The main review focus is:

```text
- technical design
- component structure
- data model
- API design
- AI schema boundary
- file input strategy
- validation and failure handling
- evidence and date policy
- export strategy
- roadmap feasibility
```

Product idea feedback is welcome, but the current priority is implementation quality, architectural direction, and Phase 4 planning.

---

## 2. Current Review Context

NoticePilot currently includes a React + Vite frontend MVP and an Express mock analyze API.

Implemented:

```text
- React + Vite frontend MVP
- Express analyze API skeleton
- GET /api/health
- POST /api/analyze mock mode
- mode="ai" returns 501 ai_not_implemented
- unknown explicit mode returns 400 unsupported_mode
- Vite /api dev proxy
- bilingual UI
- manual text paste flow
- TXT / MD upload
- extract preview
- notice type input
- publication date input
- client-side mock analysis
- server mock analysis
- editable extracted items
- task completion toggle
- calendar event selection toggle
- source evidence panel
- full evidence review mode
- warning/error UI
- privacy-like pattern detection and confirmation
- overwrite confirmation
- frontend/backend validation and normalization
- localStorage persistence
- Markdown export
- optional evidence in Markdown export
- selected all-day .ics export
```

Not yet implemented:

```text
- real AI API integration
- runtime AI prompt/schema hardening
- PDF / HWP / HWPX / OCR extraction
- advanced relative date resolution
- school-level notice parsing
- checkbox-based batch .ics export
- subscription calendar feed
- login / database / payment
- Google Calendar API integration
```

Reviewers should evaluate the project with this staged implementation status in mind.

---

## 3. Frontend Design Review Points

### 3.1 State Management

Current decision:

```text
- Keep App.jsx + useState for the current MVP.
- Do not migrate to useReducer or Context yet.
- Extract repeated logic into pure utility functions.
```

Review questions:

```text
- Is keeping App.jsx + useState still reasonable after server mock wiring?
- At what point would useReducer or Context become justified?
- Should Phase 4 real AI integration happen before or after a state-management refactor?
- Are current utility functions enough to keep update/delete/toggle logic maintainable?
```

---

### 3.2 Separated Arrays vs Unified items[]

Current decision:

```text
- Keep separated arrays:
  - deadlines
  - tasks
  - submissions
  - requirements
  - cautions
  - calendarEvents

- Reuse UI components and handlers where possible.
```

Reasoning:

```text
- The UI is section-based.
- Domain meaning stays clear.
- Validation is easier by section.
- Calendar events have different export semantics from ordinary items.
```

Review questions:

```text
- Is the separated-array model still appropriate after adding real AI?
- Would a unified items[] model help or hurt future batch calendar export?
- Is “data separated, UI generic” still a good compromise?
- Should the future AI raw schema use a different structure from the app schema?
```

---

### 3.3 Editable Item Handling

Current decision:

```text
- User edits overwrite current field values.
- Set edited: true on edited items.
- Preserve evidence when editing.
- Do not store full original values or edit history in the MVP.
```

Review questions:

```text
- Is edited: true enough for MVP traceability?
- Should original AI-generated values be preserved before real AI integration?
- Should edit tracking differ between tasks, deadlines, and calendar events?
- Should edited calendar events affect stable UID behavior later?
```

---

### 3.4 Evidence Display

Current decision:

```text
- Hide evidence by default in normal cards.
- Keep card-level Evidence button/panel.
- Provide full Evidence Review mode.
```

Review questions:

```text
- Is hidden-by-default evidence the right UI tradeoff?
- Should evidence be more visible because AI output may be unreliable?
- Is full Evidence Review mode enough for reviewer trust?
- Should missing evidence create a warning, reviewRequired state, or both?
```

---

## 4. API and AI Integration Review Points

### 4.1 Express /api/analyze Design

Current endpoint:

```text
POST /api/analyze
```

Current behavior:

```text
- missing mode or mode="mock" returns server mock analysis
- mode="ai" returns 501 ai_not_implemented
- unsupported explicit mode returns 400 unsupported_mode
```

Expected future responsibilities:

```text
- receive confirmed notice text
- call mock or real AI service
- parse AI response
- validate and normalize response
- return safe JSON to client
```

Review questions:

```text
- Is /api/analyze enough for the real AI milestone?
- Should /api/extract remain separate from /api/analyze?
- Should mode selection be user-facing, developer-facing, or environment-controlled?
- Is explicit 501 ai_not_implemented the right behavior until real AI is ready?
```

---

### 4.2 Client Mock / Server Mock / Real AI Mode

Current decision:

```text
Development paths:
- client-side mock analysis
- server mock analysis
- future real AI analysis
```

Confirmed direction:

```text
- Keep all three paths available during development and regression.
- Do not automatically fall back from real AI to mock.
- Offer user-controlled fallback to server mock after AI failure if needed.
```

Review questions:

```text
- Is it useful to keep both client mock and server mock after real AI is implemented?
- Should the final demo hide mock buttons or keep them visible for transparency?
- Should AI failure provide a visible fallback button to server mock?
- Should automatic fallback be avoided to prevent misleading users?
```

---

### 4.3 AI Raw Schema vs App Schema

Confirmed Phase 4 decision:

```text
- AI should not directly return the current frontend app schema.
- AI should return an AI raw schema.
- Server-side normalization should convert AI raw schema into the current app schema.
```

Reasoning:

```text
- AI should not generate UI-only fields such as edited, completed, or selected.
- App rendering and export can keep the current separated-array schema.
- Server can centralize evidence, date, warning, and reviewRequired policy.
- Future batch parsing can evolve toward an extraction graph model.
```

Review questions:

```text
- Is separating AI raw schema from app schema the right boundary?
- What fields should be required in the AI raw schema?
- Should server normalization be deterministic and testable before real AI is connected?
- Should the AI raw schema include calendarEventCandidates separately from extracted items?
```

---

### 4.4 AI Response Validation

Current decision:

```text
- MVP: manual validation function
- Future: possible Zod migration after schema stabilizes
```

Validation should:

```text
- parse JSON
- normalize missing fields
- generate IDs
- filter invalid calendar events
- remove exact duplicate events
- apply section limits
- add warnings
- mark uncertain results as reviewRequired when appropriate
```

Review questions:

```text
- Is manual validation still acceptable for Phase 4 real AI integration?
- Should Zod be introduced when AI raw schema is added?
- Which fields should be required vs optional?
- Should both server and client keep validation, or should server be authoritative?
```

---

### 4.5 Partial Success Handling

Current decision:

```text
- Allow partial success.
- Render valid sections.
- Show EmptyState for empty sections.
- Show warnings above the dashboard.
- Keep mock paths available for regression and fallback.
```

Review questions:

```text
- Should incomplete AI output still be displayed?
- Which validation failures should block the entire result?
- How should normalized or filtered data be communicated to users?
- Should invalid calendar events be shown as invalid candidates or filtered with warnings?
```

---

## 5. Test Corpus Review Points

### 5.1 Corpus Strategy

Confirmed direction:

```text
- Start with public URLs and manually extracted text.
- Include raw PDF/HWPX/HWP files in the repo only when public, safe, and necessary.
- Expected results should vary by notice type.
- School-level parsing should be considered seriously after around 30 corpus examples.
```

Review questions:

```text
- Is public URL + manually extracted text enough for initial AI evaluation?
- Should raw files be stored outside the repo unless necessary?
- What minimum metadata should notice_index.tsv include?
- How many examples are enough before tuning the prompt/schema?
```

---

### 5.2 Expected Result Depth

Confirmed direction:

```text
Expected result depth may vary by notice type.
```

Examples:

```text
- scholarship: deadlines, submissions, requirements, calendarEvents should be detailed
- assignment: tasks, submissions, deadlines should be detailed
- competition: deadlines, requirements, submissions, event stages should be detailed
- job_posting: deadlines, requirements, submissions, cautions should be detailed
- general school_notice: key dates and cautions may be enough
```

Review questions:

```text
- Should all corpus examples use the full app schema as expected result?
- Should expected results be written against AI raw schema or app schema?
- Should evidence be mandatory in expected results?
- How should ambiguous dates be represented in expected results?
```

---

## 6. File Input and Extraction Review Points

### 6.1 Current MVP File Input

Current implementation:

```text
- TXT / MD only
- client-side FileReader
- file size limit
- no server upload
- file object not stored
- extracted text preview before analysis
```

Review questions:

```text
- Is client-side TXT/MD extraction enough for the current MVP?
- Is the 1MB file limit reasonable?
- Should MIME type be checked in addition to extension?
- Should the ExtractPreview show more of the file body than it currently does?
```

---

### 6.2 Future Extraction Strategy

Future file types:

```text
- PDF
- HWPX
- HWP
- JPG / PNG OCR
- scanned PDF
```

Current direction:

```text
- Route complex formats through Express /api/extract later.
- Always extract text first.
- Always show ExtractPreview.
- User confirms text before /api/analyze.
```

Review questions:

```text
- Should PDF/HWPX extraction live inside Express or a separate worker/service?
- Should unsupported file types remain blocked until /api/extract exists?
- How should extraction confidence be represented?
- Should raw file upload and AI analysis be strictly separated?
```

---

### 6.3 Title Resolution Policy

Current decision:

```text
1. User-entered title
2. AI-detected title
3. First non-empty line of confirmed text
4. Uploaded file name as metadata only
```

Review questions:

```text
- Is this priority order appropriate?
- Should uploaded file name ever become the default title?
- Should title resolution happen before or after AI analysis?
- Should server normalization preserve both user title and AI-detected title?
```

---

## 7. Date and Calendar Review Points

### 7.1 Date Resolution

Current decision:

```text
- Absolute dates can become calendar events.
- Relative dates require reliable referenceDate.
- Calculated relative dates are reviewRequired.
- Vague dates go to cautions.
```

Reference date priority:

```text
1. User-entered notice publication date
2. Document-extracted notice date
3. Uploaded file metadata date
4. Analysis date
```

Phase 4 direction:

```text
- first real AI implementation should prioritize absolute dates
- relative dates may be accepted only with reliable referenceDate
- long-term calculation should move to a server-side date resolver
```

Review questions:

```text
- Is this reference date priority appropriate?
- Should file metadata ever be used for date calculation?
- Should relative-date-derived events be created at all in the first real AI phase?
- Should AI return originalDateExpression and let the server calculate normalized dates later?
```

---

### 7.2 ICS Export

Current decision:

```text
- MVP supports all-day events only.
- Time-specific events are future scope.
- Timezone handling is future scope.
- Google Calendar API is out of scope.
```

Review focus:

```text
- selected events only
- all-day event format
- duplicate removal
- reviewRequired selection behavior
- Samsung Calendar and Apple Calendar compatibility
```

Review questions:

```text
- Is all-day-only .ics export enough for MVP?
- Should time-specific events be supported earlier?
- Should reviewRequired events be blocked from export until explicitly selected?
- Is client-side .ics generation sufficient for now?
```

---

### 7.3 Duplicate Calendar Events

Current decision:

```text
MVP:
- Remove exact duplicates only.
- Duplicate condition: same title + same startDate.
- Keep first, remove later duplicates.
- Add warning.

Future:
- Fuzzy duplicate candidates for user review.
```

Review questions:

```text
- Is exact duplicate removal enough?
- Should fuzzy duplicate detection be avoided for now?
- Should duplicate removal happen during validation or export?
- Should duplicates across multiple notices be handled differently in batch export?
```

---

## 8. Batch Calendar Export Review Points

Long-term product direction:

```text
school notices
→ parsed notices
→ calendar event candidates
→ user checkbox selection
→ selected .ics export
```

Confirmed roadmap decision:

```text
- Initial batch selection unit should be calendarEvent candidate.
- Notice-level select-all can be added later.
- Subscription feed is future roadmap only.
```

Review questions:

```text
- Is calendarEvent-level selection the right first unit?
- When should notice-level select-all be added?
- How should stable UID be generated for events from school notices?
- Should batch export reuse the current .ics generation utility or use a separate export path?
```

---

## 9. Export Review Points

### 9.1 Markdown Export

Current decision:

```text
- Keep default Markdown export concise.
- Add Include evidence option.
- Future: full review-report export mode.
```

Review questions:

```text
- Should evidence be included by default?
- Should Markdown export include calendarEvents in the current MVP?
- Should edited: true markers appear in Markdown?
- Should a separate review report export be added later?
```

---

### 9.2 ICS Export

Review focus:

```text
- selected events only
- all-day event format
- exact duplicate handling
- reviewRequired selection behavior
- calendar import compatibility
```

Review questions:

```text
- Should reviewRequired events require a second confirmation before export?
- How should invalid event rows be displayed to the user?
- Is all-day-only export acceptable until date/time handling is stronger?
```

---

## 10. Warning and Error Review Points

### 10.1 Warning Structure

Current decision:

```js
warnings: [
  {
    type: "date_ambiguous",
    message: "Relative date expression could not be resolved without a reliable notice publication date."
  }
]
```

Future expansion may add:

```js
{
  id: "warning-1",
  type: "date_ambiguous",
  severity: "warning",
  message: "Relative date expression could not be resolved.",
  source: "date_resolution",
  relatedItemId: "event-1"
}
```

Review questions:

```text
- Is { type, message } enough for the current MVP?
- Should severity be included before real AI integration?
- Should warnings link to related items?
- Should missing evidence use warning, reviewRequired, or both?
```

---

### 10.2 Error vs Warning Policy

Current principle:

```text
Error:
- user cannot continue the current flow

Warning:
- user can continue after review
```

Review questions:

```text
- Are the blocking error cases defined clearly enough?
- Should privacy-like pattern detection be a warning or blocking error?
- Should invalid AI JSON block the entire result?
- Should schema mismatch be recoverable if partial sections are valid?
```

---

### 10.3 AI Failure Policy

Confirmed direction:

```text
- Distinguish timeout, invalid JSON, provider/quota error, unsupported mode, and schema mismatch where possible.
- Do not automatically fall back to mock.
- Provide a user-controlled fallback to server mock if needed.
```

Review questions:

```text
- Is user-controlled fallback enough for demo stability?
- Should fallback be shown only in development mode?
- What failure types should be visible to non-technical users?
```

---

## 11. Privacy and Scope Review Points

Current decision:

```text
- Show privacy warning.
- Add lightweight client-side pattern detection.
- Do not implement full anonymization.
- Do not store personal academic profiles.
- Exclude personal condition matching from MVP and early future design.
```

Review questions:

```text
- Is lightweight privacy detection enough for this MVP?
- Should AI analysis be blocked when sensitive-like patterns are detected?
- Is excluding personal condition matching the right scope decision?
- Should corpus rules explicitly reject documents containing names, student IDs, or contact lists?
```

---

## 12. Future Expansion Review Points

Planned future direction:

```text
- test corpus scaffold
- real AI integration
- corpus-based AI QA
- date resolution v1
- advanced PDF/HWPX/OCR extraction
- school-level notice parsing
- metadata-based filtering
- batch selected-event .ics export
- subscription calendar feed
```

Excluded from early design:

```text
- personal profile matching
- storing user academic conditions
- sensitive eligibility profiling
- account-based personalization
```

Review questions:

```text
- Is automatic university notice parsing a reasonable future direction?
- What metadata should be preserved now to support that future?
- Should the current MVP avoid decisions that make future parsing harder?
- Is the 30-corpus-example threshold reasonable before school-level parsing?
```

---

## 13. Most Important Questions for Reviewers

The project owner especially wants feedback on:

```text
1. Is the current App.jsx + useState design still appropriate after server mock wiring?
2. Is separated analysis data with generic UI handlers still the right compromise?
3. Is the AI raw schema → server normalize → app schema boundary sound?
4. Should server normalization be implemented and tested before real AI calls are added?
5. Is the client mock / server mock / future real AI three-path strategy appropriate?
6. Is the public URL + manually extracted text corpus strategy enough for the first AI QA phase?
7. Is evidence-required-for-core-items plus warning/reviewRequired a good policy?
8. Is absolute-date-first handling a suitable first real AI scope?
9. Is all-day-only .ics export still a suitable MVP boundary?
10. Is event-level checkbox selection the right starting point for batch calendar export?
11. Are the warning/error/fallback policies clear enough for real AI integration?
12. Are the current roadmap boundaries clear enough to avoid overbuilding?
```
