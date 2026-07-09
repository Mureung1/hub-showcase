---
name: daily-mission
description: Run the daily workflow for the MBTI study and stress management webapp in /Users/bricepark/Documents/hub. Use when Codex is asked to continue project work, verify the repo, plan a task, make scoped docs or prototype changes, or prepare a daily assignment without repeating the full project context.
---

# Daily Mission

## Start

1. Work only in `/Users/bricepark/Documents/hub`.
2. Confirm `pwd`, `git branch --show-current`, and `git status --short --branch`.
3. Read `AGENTS.md`, `docs/context.md`, `docs/plan.md`, and `docs/checklist.md`.

## Scope

Keep the current Vite + React structure. Do not migrate frameworks or add new dependencies unless the user explicitly asks.

## Product Guardrails

- Treat MBTI as preference exploration.
- Do not recommend from MBTI type names alone.
- Use fatigue signal, recovery routine, and caution pattern language.
- Use possibility-based result wording.
- Do not add sign-up, AI chatbot, external AI API, community, calendar, notification, payment, grade forecasting, comparison, ranking, or study proof features.

## Work Pattern

1. Report current state before edits when requested.
2. List files to create or edit.
3. Make small scoped changes.
4. Keep docs and prototype aligned.
5. Run `npm run build` and `npm run lint`.
6. Report changed files, validation, and remaining risks.

## Finish

End with changed files, validation results, `git status --short --branch`, and whether commit or PR is ready.
