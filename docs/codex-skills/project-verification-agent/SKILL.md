---
name: project-verification-agent
description: Use when verifying AIAgentChallenge hub implementation work: checking MVP flows, React vs static HTML parity, Express/Supabase vertical slices, PR readiness, issue completion, manual QA, build results, Korean text integrity, and visible UI scope.
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

- Complete/fail/recovery records are sent to Express API.
- Supabase `quest_logs` stores the records.
- Journal renders server-fetched records.
- Refresh can show stored records again.
- API failure shows retry or clear guidance.

## UI Scope Checks

- No visible future-only modules in the MVP UI.
- No developer layer names such as Agent Layer, Reward Layer, Social Layer, or Asset Pipeline.
- Korean text must not be mojibake.
- Static HTML and React differences must be reported honestly.

## Safety

- Do not pass data storage based on screenshots alone.
- Do not confuse localStorage with server DB persistence.
- Do not claim completion for unimplemented features.