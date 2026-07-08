# NoticePilot Current Implementation Summary

## Purpose

This document summarizes the current implementation baseline of NoticePilot before Phase 4 work begins. It is intended to prevent future implementation phases from accidentally breaking the existing MVP, mock analysis flows, validation behavior, and export workflows.

## Current Status

NoticePilot is currently a React + Vite MVP UI with an Express mock analyze API. The project validates the core workflow through client-side mock analysis and server mock analysis.

Current user-facing flow:

```text
long notice
→ structured analysis result
→ user review/edit
→ checklist export
→ selected all-day `.ics` export
```

NoticePilot is not a generic summarization app. Its purpose is to extract actionable notice information:

- deadlines
- tasks
- submissions
- requirements
- cautions
- calendar event candidates
- source evidence

## Completed Phases

### Phase 1. Frontend MVP Follow-up

Status: Complete

Implemented capabilities:

- React + Vite UI skeleton preserved
- bilingual UI: English / Korean
- project intro sections
- notice title input
- notice text input
- client-side mock analysis
- mock analysis dashboard
- editable extracted items
- item delete behavior
- task completion toggle
- calendar event selection toggle
- evidence panel
- Markdown checklist export
- TXT / MD file upload
- extracted text preview
- notice type metadata input
- notice publication date metadata input
- warning and error UI
- overwrite confirmation
- privacy-like pattern confirmation
- localStorage session persistence
- real all-day `.ics` export for selected valid calendar events

### Phase 1-QA. Frontend MVP QA and Major Fixes

Status: Complete

Regression baseline:

- client-side mock analysis still works
- language toggle preserves active analysis result
- all-day `.ics` export scope is no longer represented as time-specific export
- edit/delete/toggle/export flows remain functional

Known minor backlog from earlier QA:

- Uploaded TXT / MD content is placed in the editable notice text input before analysis, but the preview copy can be made clearer so users understand that the editable text area is the extracted text preview.
- Intro copy may still need refinement to avoid overstating real AI readiness.

### Phase 2. Express Analyze API Skeleton

Status: Complete

Implemented capabilities:

- Express dependency and server scripts
- `GET /api/health`
- `POST /api/analyze`
- mock analysis service
- AI analysis service stub
- server-side validation / normalization
- explicit mode policy

Analyze mode behavior:

```text
missing mode or mode="mock" → 200 mock analysis result
mode="ai"                  → 501 ai_not_implemented
unknown explicit mode       → 400 unsupported_mode
```

### Phase 2-QA. Backend Analyze API QA and Major Fixes

Status: Complete

Regression baseline:

- backend health endpoint responds normally
- backend mock analyze response validates against server schema rules
- `mode="ai"` remains blocked with 501 until real AI integration is implemented
- unsupported modes return 400
- missing/invalid section fields are normalized safely
- warning objects preserve `{ type, message }` structure

### Phase 3. Frontend ↔ Server Mock Analyze Wiring

Status: Complete

Implemented capabilities:

- separate frontend action for server mock analysis
- `Analyze via server mock` / `서버 mock 분석` button
- `POST /api/analyze` call with `mode: "mock"`
- Vite `/api` dev proxy to Express server
- server mock loading state
- server unavailable error handling
- non-2xx response handling
- invalid/empty response handling
- server warnings preserved in `analysisResult.warnings[]`
- existing frontend validation still applied after server response
- overwrite confirmation preserved
- privacy confirmation preserved
- existing client-side mock flow preserved

## Current App Schema Baseline

The current app schema uses separate arrays:

```text
deadlines
tasks
submissions
requirements
cautions
calendarEvents
```

This structure should be preserved through Phase 4. UI handlers may be generic, but the app state should not be migrated to a unified `items[]` model yet.

## Current Regression Baselines

Future phases must not break the following behavior:

- client-side mock analysis
- server mock analysis
- bilingual UI
- manual paste flow
- TXT / MD upload flow
- localStorage restore / clear
- overwrite confirmation
- privacy confirmation
- validation / normalization warnings
- item edit behavior with `edited: true`
- item delete behavior
- task completion toggle
- calendar event selection toggle
- source evidence display
- full evidence review mode
- Markdown export
- optional Markdown evidence export
- all-day selected `.ics` export
- server unavailable / invalid response error UI

## Explicitly Unsupported Capabilities

The following are not implemented yet:

- real AI API integration
- AI prompt/schema hardening in runtime
- PDF extraction
- HWP/HWPX extraction
- image OCR
- scanned PDF OCR
- advanced relative date resolution
- school-level notice parsing
- checkbox-based batch `.ics` export
- subscription calendar feed
- multiple saved notice projects
- login / database
- Google Calendar API integration
- payment

## Phase 4 Starting Point

Phase 4 should not begin by directly wiring a provider API. The next step is to document the AI raw schema, prompt contract, corpus plan, and roadmap boundaries so that real AI integration can be implemented against a stable contract.
