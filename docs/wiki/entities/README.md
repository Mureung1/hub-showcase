---
title: Wiki Entities
type: entity-index
status: active
updated: 2026-07-14
source_paths:
  - docs/project-knowledge-map.md
confidence: high
tags:
  - wiki
  - entities
---

# Wiki Entities

Entities are stable project objects such as files, modules, workflows, and UI surfaces.

## Initial Entity Candidates

- React app entry: `src/main.tsx`
- Main UI surface: `src/App.tsx`
- Static visual reference: `public/prototype-static.html`
- MVP behavior contract: `docs/mvp-functional-spec.md`
- Project backlog: `docs/tasks.md`
- Project skills: `docs/codex-skills/`
- Active harness roles: `.codex/agents/`
- Active harness skills: `.agents/skills/`

## Rules

- Create an entity page only when multiple tasks need the same anchor.
- Prefer updating an existing entity page over creating duplicates.
- Include `source_paths` in every entity page.
