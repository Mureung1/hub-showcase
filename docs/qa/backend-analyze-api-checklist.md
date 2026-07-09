# Backend Analyze API QA Checklist

- `npm run dev:server` starts
- `GET /api/health` returns OK
- `POST /api/analyze` returns mock result
- `POST /api/analyze` with `mode=ai` returns `501 ai_not_implemented`
- response schema matches frontend `analysisResult` shape
- warnings use `{ type, message }`
- section limits apply
- duplicate calendar events are removed
- invalid/missing fields normalize safely
- missing `userPreferencesSnapshot` falls back to:
  - `activeInstitution: "kangwon"`
  - `selectedCampuses: []`
  - `includeCommonNotices: true`
- request `userPreferencesSnapshot.selectedCampuses` removes invalid IDs
- request `userPreferencesSnapshot.selectedCampuses` removes duplicates
- request `userPreferencesSnapshot.selectedCampuses` is sorted in frontend campus order:
  - `chuncheon`
  - `samcheok`
  - `dogye`
  - `gangneung_wonju`
- request `userPreferencesSnapshot.includeCommonNotices` always normalizes to `true`
- response includes normalized `metadata.userPreferencesSnapshot`
- response does not include `userPreferencesSnapshotSource`
- adding `metadata.userPreferencesSnapshot` does not change mock analysis sections

## 2026-07-09 Snapshot QA Notes

Verified during the Calendar Tab + Campus Preferences task:

- direct mock service checks passed for missing, invalid, duplicate, and ordered `userPreferencesSnapshot.selectedCampuses`
- Express `/api/analyze` smoke check passed with normalized `metadata.userPreferencesSnapshot`
- backend campus order matches frontend order:
  - `chuncheon`
  - `samcheok`
  - `dogye`
  - `gangneung_wonju`
- `includeCommonNotices` remains normalized to `true`
- mock analysis sections remain unchanged by campus preferences
- backend response does not include `userPreferencesSnapshotSource`
