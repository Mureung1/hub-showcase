# NoticePilot QA Backlog

## Minor Issues

### 1. ExtractPreview does not directly show file body preview
- Severity: minor
- Status: backlog
- Reason: Does not block current frontend MVP flow.
- Suggested fix: Show a clearer extracted text preview area after TXT/MD upload.

### 2. Intro copy should keep mock / real AI readiness distinct
- Severity: minor
- Status: partially addressed / monitor
- Reason: Express mock analyze API and Zod-backed server schemas are now implemented, but real AI integration is still not implemented.
- Suggested fix: Keep copy explicit that client mock and server mock are implemented, while real AI API calls remain future scope.

## Manual QA Follow-ups

### 1. Campus preference raw localStorage inspection
- Severity: minor
- Status: manual follow-up
- Reason: Codex browser plugin read-only page scope did not expose browser localStorage directly.
- Covered by: campus preference helper serialization checks and browser refresh restore.
- S17 result: Rechecked on 2026-07-09. Browser plugin still exposes `localStorage` as `undefined`; campus selection save and refresh restore passed with `춘천 + 도계`.
- S18 result: Rechecked on 2026-07-09. The plugin-exposed browser capabilities still do not include DevTools Application storage or a raw localStorage reader, so this remains a human DevTools check.
- Suggested fix: Manually inspect browser DevTools Application storage for `noticepilot:campus-preferences:v1` when doing human QA.

### 2. Blob download event capture
- Severity: minor
- Status: closed by file-system verification
- Reason: Codex browser plugin did not capture Blob downloads through `waitForEvent('download')`.
- Covered by: Downloads folder inspection and downloaded Markdown / `.ics` file content checks.
- S17 result: Rechecked on 2026-07-09. Blob download event still timed out in the plugin, but valid `.ics` export created `/Users/chan/Downloads/noticepilot-calendar-ko (2).ics`; file structure checks passed.
- Suggested fix: No code fix needed for app behavior. Keep using Downloads folder/file content inspection when this plugin cannot observe Blob download events.

### 3. ICS no-valid-event blocking
- Severity: minor
- Status: closed
- Reason: Valid `.ics` download had been verified, but the no-valid-event blocking path still needed browser confirmation.
- S17 result: Rechecked on 2026-07-09. With the calendar event deselected, `.ics` export showed `내보내기 차단` and did not create a new Downloads file.
- Suggested fix: None.

### 4. External calendar app import smoke
- Severity: minor
- Status: closed by user-provided calendar import evidence
- Reason: Importing into a local calendar app may create or stage real calendar data in the user's environment.
- Covered by: `.ics` structural validation for `BEGIN:VCALENDAR`, one `VEVENT`, `UID`, `SUMMARY`, all-day `DTSTART`, all-day `DTEND`, and `DESCRIPTION`.
- S19 result: Closed on 2026-07-09 with user-provided calendar screenshot evidence. The imported event shows title `서버 mock 일정`, date `7/20/26`, and description `선택된 valid all-day event export schema를 확인합니다.`, matching the generated `.ics` smoke fixture.
- Follow-up: Remove the imported test event or disposable test calendar if it was created in a real calendar account.
