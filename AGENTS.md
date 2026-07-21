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
- Main-agent scenario review: `docs/skills/scenario_review.md`
- Output templates: `docs/templates/`
- Scenario writer agent: `.codex/agents/scenario_writer.toml`
- In-game script workflow: `docs/workflows/write_ingame_script.md`

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
- Treat `approvals/assets/` as temporary review storage and `design/assets/` as
  the canonical location for approved assets.
- When applying an approved asset, verify that the file in `design/assets/`
  matches the reviewed file, update approval and history references to the
  canonical path, and delete only the corresponding file from
  `approvals/assets/` before marking the item `applied`. Keep the review file
  while an item is merely `approved`, or if application or reconfirmation fails.
- Keep all project knowledge grounded in files under this repository.
- Do not accumulate world setting, scenario, system, content, UI, or technical
  details in a single game overview. Keep one canonical detail owner per fact,
  and use concise summaries plus relative links from the overview.
- When one request spans multiple document roles, prepare a coordinated
  multi-document approval proposal instead of forcing the content into one file.
- When receiving scenario material for review or drafting or changing a
  `scenario` document, the main agent must read the relevant project sources and
  apply `docs/skills/scenario_review.md`. Preserve a source-faithful Draft and, when a
  stronger event order, reveal, branch, Outcome, or motivation exists, present it
  separately in `Scenario Improvement Review` with its reason and impacts.
- Do not merge a scenario improvement recommendation into the Draft or treat it as
  canon before the user selects it. After selection, reconfirm the sources, revise
  the Draft or create a linked replacement item as required, and return it to
  `pending` for explicit approval.
- Do not invent and present project facts as confirmed. Specialized workflows
  may create clearly disclosed proposals; use `TBD` when a required value cannot
  safely be proposed.
- When the user requests an in-game script from scenario material, delegate the
  project-adapted authoring task to the custom agent `scenario_writer` and review
  its result before presenting or saving it.
- An in-game script request authorizes `scenario_writer` to draft creative
  writing and a stronger narrative structure within the requested scope. This is
  proposal authority, not approval or application authority.
- Build a project-specific `Writer's Brief` from the Project Brief, game overview,
  confirmed world and scenario documents, and existing approved scripts before
  drafting. Do not reuse another project's writer identity or prose style.
- Every unsupported concrete line, ID, setting detail, state representation, or
  production direction must carry a `CW-*` creative footnote. Every departure
  from the source event order, reveal, branch, Outcome, or motivation must appear
  in the `NR-*` Narrative Revision Log with its reason and impact. Never present
  either kind of proposal as confirmed project fact.
- If an NR entry changes the parent scenario, put the parent update, script and
  link updates in one atomic `restructure` approval item. World-canon or
  system-rule changes require a separate linked high-risk proposal; keep dependent
  script fields `TBD` until that proposal is applied and the script is reconfirmed.
- Keep changes scoped to the requested behavior and avoid unrelated refactors.
- Do not hardcode API keys, tokens, or other secrets.

## File Roles

- `workspace/project_registry.md`: registered projects and the current default project.
- `workspace/projects/<project_slug>/project_brief.md`: project identity, focus, and constraints.
- `workspace/projects/<project_slug>/design/`: confirmed project design documents.
- `workspace/projects/<project_slug>/design/assets/`: canonical approved image assets.
- `workspace/projects/<project_slug>/design/game/`: game overview and top-level design direction.
- `workspace/projects/<project_slug>/design/world/`: canonical world, character, faction, location, and object settings.
- `workspace/projects/<project_slug>/design/narrative/`: scenario flow, scenes, branches, reveals, and endings.
- `workspace/projects/<project_slug>/design/narrative/scripts/`: approved chapter-based in-game scripts with player-facing text and scene implementation metadata.
- `workspace/projects/<project_slug>/design/systems/`: gameplay rules, state changes, checks, balance, and exceptions.
- `workspace/projects/<project_slug>/design/content/`: concrete regions, nodes, quests, items, enemies, and rewards.
- `workspace/projects/<project_slug>/design/ui/`: UI and interaction specifications.
- `workspace/projects/<project_slug>/design/technical/`: runtime, data, save, and integration specifications.
- `workspace/projects/<project_slug>/ideas/temporary_ideas.md`: unapproved ideas and loose notes.
- `workspace/projects/<project_slug>/approvals/approval_queue.md`: pending, held, rejected, or approved
  change proposals.
- `workspace/projects/<project_slug>/approvals/assets/`: temporary review assets;
  remove an asset after its verified promotion to `design/assets/` is applied.
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
