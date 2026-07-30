# Task 2 browser QA — FAIL / BLOCKED

Date: 2026-07-30 (Asia/Seoul)

## Required Chrome channel

The browser-control runtime returned exactly:

`Browser is not available: extension`

The Browser skill forbids substituting another browser when Chrome is explicitly
required. Therefore no valid Chrome screenshot or live DOM interaction artifact
could be produced. The overall result is FAIL/BLOCKED, regardless of static and
automated evidence below.

## Baseline static DOM observable

- Map container: `<div ... className="location-map" aria-label="출발 위치 지도" />`
- Address input is rendered by `LocationPicker.jsx` and is associated with the
  caller-provided `inputId`; the requested id is `group-buy-pickup-location`.
- OSM layer: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Attribution configured as `OpenStreetMap contributors`.
- Cleanup path calls `map.remove()`.

This is source evidence only and is not counted as live-page acceptance evidence.

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Map displayed with visible OSM attribution | BLOCKED | Source config exists; Chrome visual assertion unavailable |
| Address editing; typed value remains | BLOCKED | Required `page.fill` unavailable |
| Map click creates marker and coordinate status | BLOCKED | Required live click/DOM assertion unavailable |
| Denied geolocation shows notice and leaves address enabled | BLOCKED | Denied-permission browser context unavailable |
| Unmount/remount has no duplicate Leaflet-container error | BLOCKED | Navigation/repetition unavailable |
| Malformed one-character input | BLOCKED | Browser constraint probe unavailable |
| Clear pin then click again | BLOCKED | Browser interaction unavailable |
| Edit address after pin preserves coordinate pair | BLOCKED | Browser interaction unavailable |

## Automated checks (30-second ceiling)

- Focused test run 1: exit 0; 3 passed, 0 failed; duration 218.6551 ms.
- Focused test run 2: timed out after 30.068 seconds (flakiness/hang evidence).
- `npm run lint`: timed out after 34.118 seconds; no success output captured.
- `npm run build`: exit 0; Vite 8.1.3; 36 modules transformed; build reported
  success in 708 ms (shell completed in 21.5 seconds).

## Dirty-worktree receipt

`git status --short` before and after had the same listed entries. QA made no
production-file edits and did not revert any user changes. This report is the only
intentional QA artifact added by this task.

## Cleanup receipt

- App servers started by this QA: none.
- Browser tabs/contexts created by this QA: none (Chrome connection failed before
  creation).
- Temporary scripts created: none.
- PIDs terminated: none.
- Ports closed: none.
- Existing listener observed on `127.0.0.1:5173`, PID 8716; it was not created or
  terminated by this QA.
- Pre-existing user browser sessions were not closed.

