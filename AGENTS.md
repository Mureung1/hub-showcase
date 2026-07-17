# AGENTS.md

## Purpose

This file provides guidance for Codex and other development agents working in
this repository. This repository is a local document workspace for game planning
workflows, not a standalone runtime agent product.

## Project Context

This project uses Codex plus repository-local rules, workflows, templates, and
skills as a document-based game planning agent.

The core principle is Human in the Loop: Codex may analyze, draft, and propose
changes, but actual project changes must go through approval-oriented flows.

## Key References

- Project overview and usage: `README.md`
- Project registry: `workspace/project_registry.md`
- Workspace goals and user scenarios: `docs/plan.md`
- Maintenance checklist: `docs/checklist.md`
- Workspace architecture: `docs/architecture.md`
- Workflow rules: `docs/workflows/`
- Document ownership and standard paths: `docs/workflows/document_structure.md`
- Reusable task skills: `docs/skills/`
- Output templates: `docs/templates/`

## Archive Notes

- `docs/dev-log/` is a historical archive kept for the user to read.
- Do not use `docs/dev-log/` as current behavior guidance, architecture truth,
  workflow policy, or implementation direction.
- If `docs/dev-log/` conflicts with `AGENTS.md`, `README.md`, `docs/plan.md`,
  `docs/architecture.md`, `docs/workflows/`, or `docs/skills/`, ignore the
  dev-log content for current work.

## Operating Rules

- Preserve the approval-based workflow.
- Resolve the target project before reading or writing project state. Follow
  `docs/workflows/project_workspace.md`.
- Classify game-design information by canonical document role before drafting or
  changing documents. Follow `docs/workflows/document_structure.md`.
- Keep each game's brief, designs, ideas, approvals, decisions, versions, and
  assets inside `workspace/projects/<project_slug>/`.
- Never reuse another project's approval queue, decision log, version history,
  temporary idea file, or design directory for a new project.
- When the user creates a new project, create a new project root and its full
  document structure, then register it in `workspace/project_registry.md`.
- If multiple projects exist and the request does not identify one, ask which
  project to use before changing project files.
- Do not bypass Approval Queue, Version History, Decision Log, or source/version
  reconfirmation behavior.
- Before changing confirmed design documents in `workspace/projects/<project_slug>/design/`, confirm
  that the user explicitly approved the corresponding approval item.
- If approval is not explicit, produce or update an approval queue draft instead
  of editing confirmed design documents.
- Keep all project knowledge grounded in files under this repository.
- Do not accumulate world setting, scenario, system, content, UI, or technical
  details in a single game overview. Keep one canonical detail owner per fact,
  and use concise summaries plus relative links from the overview.
- When one request spans multiple document roles, prepare a coordinated
  multi-document approval proposal instead of forcing the content into one file.
- Do not invent project facts. Use `TBD` and ask follow-up questions when
  required information is missing.
- Keep changes scoped to the requested behavior and avoid unrelated refactors.
- Do not hardcode API keys, tokens, or other secrets.

## File Roles

- `workspace/project_registry.md`: registered projects and the current default project.
- `workspace/projects/<project_slug>/project_brief.md`: project identity, focus, and constraints.
- `workspace/projects/<project_slug>/design/`: confirmed project design documents.
- `workspace/projects/<project_slug>/design/game/`: game overview and top-level design direction.
- `workspace/projects/<project_slug>/design/world/`: canonical world, character, faction, location, and object settings.
- `workspace/projects/<project_slug>/design/narrative/`: scenario flow, scenes, branches, reveals, and endings.
- `workspace/projects/<project_slug>/design/systems/`: gameplay rules, state changes, checks, balance, and exceptions.
- `workspace/projects/<project_slug>/design/content/`: concrete regions, nodes, quests, items, enemies, and rewards.
- `workspace/projects/<project_slug>/design/ui/`: UI and interaction specifications.
- `workspace/projects/<project_slug>/design/technical/`: runtime, data, save, and integration specifications.
- `workspace/projects/<project_slug>/ideas/temporary_ideas.md`: unapproved ideas and loose notes.
- `workspace/projects/<project_slug>/approvals/approval_queue.md`: pending, held, rejected, or approved
  change proposals.
- `workspace/projects/<project_slug>/decisions/decision_log.md`: accepted or rejected decision records.
- `workspace/projects/<project_slug>/versions/version_history.md`: approved document change history.

## Commands

There is no default runtime command. This workspace is operated through Codex
instructions and Markdown files.

For a quick structure check, use:

```bash
find docs workspace -maxdepth 6 -type f | sort
```

## Style

- Keep implementation simple and explicit.
- Preserve the Korean product documentation style unless asked otherwise.
- Prefer concise Markdown sections and reviewable bullets.
- Keep approval, decision, and version records easy to scan.
