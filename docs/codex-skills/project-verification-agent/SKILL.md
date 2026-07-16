---
name: project-verification-agent
description: Use when verifying AIAgentChallenge hub implementation work: checking MVP flows, React vs static HTML parity, Hono/Supabase vertical slices, PR readiness, issue completion, manual QA, build results, Korean text integrity, and visible UI scope.
---

# Project Verification Agent

> Repository copy for review and reuse. 실제 Codex 실행용 skill은 로컬 .codex/skills/project-verification-agent에 설치해서 사용한다.

Use this skill to judge whether work actually satisfies the project requirements.

## First Steps

1. Check the relevant docs when available:
   - `docs/mvp-functional-spec.md`
   - `docs/user-flow-wireframes.md`
   - `docs/tasks.md`
   - `docs/status.md`
   - `docs/weekly-plan-2026-07-13.md` for week 2 work
2. Inspect the changed files or implementation evidence.
3. Separate build verification, manual UI flow, and data persistence.

## Output Shape

Return:

1. Verification summary
2. Passed items
3. Failed items
4. Needs-confirmation items
5. Reproduction steps
6. Fix candidates
7. Completion judgment

## MVP Flow Checks

- First visit opens Profile Setup Wizard.
- Saving profile enters XP Desktop.
- Default open windows are Today Quest and Manager only.
- Editing and accepting a quest opens QuestRunner.exe.
- Completing a quest updates EXP and the journal.
- Failing a quest allows a failure reason and recovery quest.
- Accepting recovery continues through QuestRunner.exe.

## Vertical Slice Checks

- Complete/fail/recovery records are sent to Hono API.
- Supabase `quest_logs` stores the records.
- Journal renders server-fetched records.
- Refresh can show stored records again.
- API failure shows retry or clear guidance.

Judge each vertical-slice stage separately:

| Stage | Evidence | PASS standard | NEEDS CONFIRMATION standard |
|---|---|---|---|
| UI event | Click flow and React state | Complete/fail/recovery actions open the expected windows and states | The UI was not manually exercised |
| FE API request | DevTools Network | `POST /api/quest-events`, `GET /api/quest-events`, and `GET /api/manager-context` are visible | Only screenshots without payload/response evidence exist |
| Server validation | API response | Invalid input returns `VALIDATION_ERROR` | Only happy-path requests were checked |
| Store mode | `GET /api/health` | Supabase verification requires `storageMode: "supabase"` | `storageMode: "memory"` means server mock only |
| DB persistence | Supabase table or GET after refresh | The same event exists in `quest_logs` and can be fetched again | Supabase dashboard or refresh check was not observed |
| UI update | Journal and manager context | Saved responses update the journal and Lumi state | API response was checked but UI update was not |
| Failure handling | Forced API failure | Guidance appears and app flow continues | Failure path was not forced |
| Secret exposure | grep/screenshots | No real key/token appears | PR images or docs still need review |

## UI Scope Checks

- No visible future-only modules in the MVP UI.
- No developer layer names such as Agent Layer, Reward Layer, Social Layer, or Asset Pipeline.
- Korean text must not be mojibake.
- Static HTML and React differences must be reported honestly.

## Safety

- Do not pass data storage based on screenshots alone.
- Do not confuse localStorage with server DB persistence.
- Do not claim completion for unimplemented features.
