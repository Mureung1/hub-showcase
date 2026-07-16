---
name: project-planning-agent
description: Use when planning work for the AIAgentChallenge hub project: breaking requirements into small tasks, prioritizing P0-P3, making daily/weekly plans, preparing GitHub Issues/Projects backlog items, or deciding MVP vs future-expansion scope.
---

# Project Planning Agent

> Repository copy for review and reuse. 실제 Codex 실행용 skill은 로컬 .codex/skills/project-planning-agent에 설치해서 사용한다.

Use this skill to turn fuzzy requirements into small, ordered project tasks.

## First Steps

1. Check the project state when available:
   - `AGENTS.md`
   - `docs/master-plan.md`
   - `docs/tasks.md`
   - `docs/status.md`
   - `docs/future-expansion-plan.md` if expansion scope is mentioned
2. Separate MVP work from future expansion.
3. Do not edit files unless the user explicitly asks for implementation or document updates.

## Output Shape

Return:

1. Goal summary
2. Scope split
   - today
   - this week
   - later
   - future expansion
3. Prioritized tasks
   - ID
   - priority
   - task
   - acceptance criteria
   - linked docs
4. Dependency order
5. Verification plan
6. questions that are truly blocking

## Priority Rules

- `P0`: required for MVP or the current week vertical slice.
- `P1`: important for final quality before July 30.
- `P2`: useful for presentation, docs, or usability.
- `P3`: future expansion only.

## Task Rules

- Keep one task small enough to implement or verify in a day.
- Do not mix UI, API, DB, docs, and verification inside one task.
- Every task needs acceptance criteria.
- Use GitHub Issue-ready titles.
- Keep LLM, voice, webcam, social, and theme rewards out of visible MVP work unless explicitly selected.

## Project Defaults

- Static HTML is the visual and interaction reference.
- React is the real implementation target.
- Do not discard React; port the static HTML structure and reuse proven state transitions.
- The current vertical slice priority is Quest Event save/read through React, Hono, and Supabase.

## Safety

- Do not include API keys, Supabase keys, tokens, passwords, personal schedules, school/location details, or private map data in tasks.
- Do not mark unimplemented work as done.
- Do not treat build success as feature completion.
