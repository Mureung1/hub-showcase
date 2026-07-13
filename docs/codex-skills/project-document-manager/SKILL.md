---
name: project-document-manager
description: Use when adding, editing, deleting, reorganizing, or reviewing docs in the AIAgentChallenge hub project: deciding document placement, avoiding duplicated roles, updating README/docs links, project-knowledge-map, AGENTS.md, Wiki candidates, and keeping planning/status/tasks/future docs separated.
---

# Project Document Manager

> Repository copy for review and reuse. 실제 Codex 실행용 skill은 로컬 .codex/skills/project-document-manager에 설치해서 사용한다.

Use this skill to keep the project documentation structure stable.

## First Steps

1. Check these docs when available:
   - `docs/README.md`
   - `docs/project-knowledge-map.md`
   - `AGENTS.md`
   - `docs/status.md`
2. Decide whether the request needs a new doc, an existing doc edit, archive, or no doc change.
3. Do not delete documents without explicit user confirmation.

## Output Shape

Return:

1. Work judgment
   - new doc / edit existing / archive / do not create
2. Document location
3. Document role
4. Parent links to update
5. Duplicate-role check
6. Post-edit checklist
7. blocking questions only

## Document Branches

Each official doc must belong to one branch:

- Planning: `product-plan.md`, `user-flow-wireframes.md`, `mvp-functional-spec.md`
- Design/assets: `design-references/`, `design-system.md`, `asset-prompts/`, `public/assets`
- Agent/source rules: `agent-design.md`, `planning-agent.md`, `verification-agent.md`, `document-management-agent.md`, `agent-usage-guide.md`
- Execution rules: `AGENTS.md`, `docs/codex-skills/`
- Operations/learning: `master-plan.md`, `four-week-roadmap.md`, `weekly-plan-*`, `today-plan-*`, `tasks.md`, `github-project-guide.md`, `status.md`, `learning/`
- Archive: `archive/`

If a new doc does not fit one branch, prefer editing an existing doc.

## Link Rules

When adding an official doc, check:

- Root `README.md`
- `docs/README.md`
- `docs/project-knowledge-map.md`
- `AGENTS.md` if it affects repeated Codex work
- `docs/tasks.md` or roadmap if it affects execution
- Wiki page candidate if mentors/reviewers should see it

## Separation Rules

- Roadmap dates live in roadmap and weekly/today docs.
- Backlog and priorities live in `tasks.md`.
- Done/verified/next/blocked status lives in `status.md`.
- Long-term expansion lives in `future-expansion-plan.md`.
- MVP behavior contract lives in `mvp-functional-spec.md`.
- Design rules live in `design-system.md`.
- Asset generation text lives in `asset-prompts/`.

## Safety

- Keep README concise; do not turn it into a master document.
- Do not put secrets, API keys, tokens, personal schedules, school/location data, or private map data in docs.
- Check for Korean mojibake before handoff.