# Backend Analyze API QA Checklist

## Purpose

This document is the authoritative checklist for concrete QA requirements for
NoticePilot's current public HTTP endpoints and frontend-server analyze
boundary.

Related documents have separate responsibilities:

- General security review requirements are maintained in
  `.codex/checklists/security_review.md`.
- Open design questions are maintained in `docs/wiki/Review-Points.md`.
- Current implementation status is maintained in
  `docs/project/current-implementation-summary.md`.
- Future AI provider error policy is maintained in
  `docs/roadmap/phase-4-plan.md`.

## Scope

This checklist currently covers:

- `GET /api/health`
- `POST /api/analyze`
- the public JSON error envelope
- the Express JSON parser boundary
- the frontend-server mock analyze boundary

The following are not in the current scope:

- `/api/extract`
- real AI provider calls
- authentication
- databases
- subscription feed endpoints
- crawler outbound requests

## Common HTTP Contract

- Check the HTTP status and JSON body together for both successful and failed
  responses.
- Preserve the public error envelope as `{ error: { type, message } }`.
- Do not expose stack traces, provider payloads, credentials, or internal Zod
  structures in public error responses.
- Treat HTTP request validation and service result normalization as separate
  boundaries.
- Add or update HTTP contract tests when routes, middleware, request validation,
  or public error behavior changes.
- Do not label a check as automated without evidence from a test file registered
  in `npm test`.
- Distinguish current behavior, target contracts, and unverified behavior.

## Endpoint Contract Matrix

The automation status describes available QA evidence, not whether the runtime
behavior is implemented.

| ID | Request | Expected status | Expected contract | Automation status |
| --- | --- | ---: | --- | --- |
| H-01 | `GET /api/health` | `200` | Normal JSON containing `status` and `service` | Automated |
| A-01 | `POST /api/analyze`, mode omitted | `200` | Server mock analysis result | Automated |
| A-02 | `POST /api/analyze`, `mode="mock"` | `200` | Frontend analysis result shape | Automated |
| A-03 | `POST /api/analyze`, `mode="ai"` | `501` | `error.type="ai_not_implemented"` | Automated |
| A-04 | `POST /api/analyze`, unsupported explicit mode | `400` | `error.type="unsupported_mode"` | Automated |
| A-05 | `POST /api/analyze`, malformed JSON | `400` | `error.type="invalid_json"`, message `Request body contains invalid JSON.` | Automated |
| A-06 | `POST /api/analyze`, JSON body over `1mb` | `413` | `error.type="request_too_large"`, message `Request body exceeds the allowed size limit.` | Automated |
| A-07 | Injected analyze dependency failure during `POST /api/analyze` | `500` | `error.type="server_error"`, message `The analysis server could not complete the request.` | Automated |
| A-08 | Valid mock result | `200` | Object that passes server-side result validation | Automated at the service boundary; HTTP route not automated |
| A-09 | Frontend receives non-2xx response | Preserve received status | Preserve `error.type`, `error.message`, and status handling at the client boundary | Documented only |
| A-10 | Frontend receives an empty or invalid JSON response | Client failure | Reject as `empty_response` or `invalid_response` | Documented only |

A-05 and A-06 expose stable public error types and messages. Express parser
types and parser-specific details remain internal.

A-07 automation covers an analyze dependency rejection injected at app
construction and exercised through the actual `/api/analyze` HTTP boundary. It
does not represent coverage of every possible internal server failure.

## Result Validation And Normalization

### Response schema

- The response schema matches the frontend `analysisResult` shape.
- Invalid or missing fields normalize safely.

### Warnings and section policy

- Warnings use `{ type, message }`.
- Section limits apply.
- Exact duplicate calendar events are removed.

### User preference fallback and normalization

- A missing `userPreferencesSnapshot` falls back to:
  - `activeInstitution: "kangwon"`
  - `selectedCampuses: []`
  - `includeCommonNotices: true`
- `userPreferencesSnapshot.selectedCampuses` removes invalid IDs.
- `userPreferencesSnapshot.selectedCampuses` removes duplicates.
- `userPreferencesSnapshot.selectedCampuses` is sorted in frontend campus order:
  - `chuncheon`
  - `samcheok`
  - `dogye`
  - `gangneung_wonju`
- `userPreferencesSnapshot.includeCommonNotices` always normalizes to `true`.

### Metadata projection

- The response includes normalized `metadata.userPreferencesSnapshot`.
- The response does not expose `userPreferencesSnapshotSource`.
- Adding `metadata.userPreferencesSnapshot` does not change mock analysis
  sections.

## Automation Status

Use the following evidence labels:

- **Automated**: covered by a test file that runs through `npm test`.
- **Manual smoke**: exercised manually, but not registered as an automated
  regression test.
- **Documented only**: recorded as current or expected behavior without test
  evidence in the current harness.
- **Pending**: the contract or its verification remains unresolved.

For manual endpoint smoke checks, first confirm that `npm run dev:server`
starts the Express server.

The current `npm test` command includes the basic HTTP contract tests alongside
the registered schema, adapter, and service tests. Current HTTP automation is
limited to H-01 and A-01 through A-07.

Automation evidence:

- Test file: `server/src/__tests__/httpContract.test.js`
- Focused command: `npm run test:http`
- Repository-wide command: `npm test`

## Change Rule

When an HTTP route, middleware, request validation, public error envelope,
status code, or frontend API parsing behavior changes:

1. Review this checklist.
2. Add or update the relevant HTTP or client-boundary contract test.
3. Register the test in `npm test`.
4. Update the current implementation summary only after the code and tests have
   actually changed.

## Historical QA Notes

### 2026-07-09 Snapshot QA Notes

The following is historical manual QA evidence. It is not a claim of current
automated regression coverage.

Verified during the Calendar Tab + Campus Preferences task:

- direct mock service checks passed for missing, invalid, duplicate, and ordered
  `userPreferencesSnapshot.selectedCampuses`
- Express `/api/analyze` smoke check passed with normalized
  `metadata.userPreferencesSnapshot`
- backend campus order matches frontend order:
  - `chuncheon`
  - `samcheok`
  - `dogye`
  - `gangneung_wonju`
- `includeCommonNotices` remains normalized to `true`
- mock analysis sections remain unchanged by campus preferences
- backend response does not include `userPreferencesSnapshotSource`
