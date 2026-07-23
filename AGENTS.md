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
- Design creative completion: `docs/skills/design_creative_completion.md`
- Scenario authoring and review: `docs/skills/scenario_review.md`
- Specialist agent handoff: `docs/workflows/specialist_agent_handoff.md`
- Specialist task packet template: `docs/templates/specialist_task_packet.md`
- Behavior test isolation: `docs/workflows/behavior_testing.md`
- Behavior test manifest: `docs/templates/behavior_test_manifest.md`
- Output templates: `docs/templates/`
- Project landing page template: `docs/templates/project_readme.md`
- Scenario writer agent: `.codex/agents/scenario_writer.toml`
- General scenario designer agent: `.codex/agents/scenario_designer.toml`
- Independent scenario reviewer agent: `.codex/agents/scenario_reviewer.toml`
- Design creative planner agent: `.codex/agents/design_creative_planner.toml`
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
- Keep a project landing page at `workspace/projects/<project_slug>/README.md`
  with a short source-grounded description, current focus, existing confirmed
  design documents, and links to project working records. It is an index, not a
  canonical detail owner.
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
- If an approval expression is ambiguous, such as "괜찮네" or "좋아 보이네",
  do not approve or apply the item. Explicitly tell the user that nothing was
  applied because the expression was not an explicit approval, keep the current
  approval state unchanged, and show the exact kind of confirmation needed,
  such as "`APPR-...`을 승인하고 적용해줘."
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
- When an approved design document is created, deleted, moved, changes role, or
  changes its one-line responsibility, update the project README, design index,
  and affected game-overview links in the same approval scope.
- Before any agent behavior or smoke test, complete
  `docs/templates/behavior_test_manifest.md` and follow
  `docs/workflows/behavior_testing.md`. Mark synthetic data
  `[TEST FIXTURE: SYNTHETIC]` at its first appearance and preserve the
  `synthetic_test_fixture` origin through every Task Packet, specialist handoff,
  and result report. Never describe it as a user-provided fact, confirmed fact,
  canon, or an actual project proposal.
- Run behavior tests against the dedicated
  `tests/fixtures/behavior/sample-game/` fixture by default. Only when real
  project structure is necessary, copy the exact project to a new `/tmp`
  directory, record the reason and a before/after baseline, forbid writes to the
  original, and verify that the original is unchanged. Never persist test
  conversations, outputs, temporary approvals, or fixture facts into project
  state.
- Every behavior test report must state `데이터 출처`, `실행 환경`, `원본 변경`,
  and `실제 프로젝트 사실로 채택`. The adoption value for synthetic test data is
  always `아님`.
- Before every call to `scenario_designer`, `scenario_writer`,
  `scenario_reviewer`, or `design_creative_planner`, follow
  `docs/workflows/specialist_agent_handoff.md` and complete
  `docs/templates/specialist_task_packet.md`. Reconcile the current request and
  every material prior user fact, selection, prohibition, scope change, approval
  ID, and authorization boundary into the packet. Record each fact or input as
  `current_user_input`, `prior_user_input`, `confirmed_document`,
  `proposal_input`, or `synthetic_test_fixture`. Do not call a specialist while
  a required packet field or provenance is missing or contradictory.
- Spawn a named custom specialist with its exact `agent_type`,
  `fork_turns: "none"`, and the complete Specialist Task Packet as the task
  message. Never combine a custom `agent_type` with an omitted or `"all"`
  full-history fork, never silently substitute a general agent, and never retry
  the same incompatible arguments. Do not add model or reasoning overrides
  unless explicitly required.
- Specialist agents must validate the packet before substantive work and return
  `blocked_missing_handoff` without drafting, option generation, or review when
  required context is absent. The main agent must compare every handoff against
  the packet and must not present, persist, approve, or apply a result that
  exceeds the transmitted scope or leaves a handoff failure unresolved.
- If synthetic test data lacks its label or origin, or is classified as a user
  or confirmed fact, the main agent and specialist must return
  `blocked_test_provenance` without drafting, option generation, or review. Do
  not silently repair provenance by guessing the data's source.
- Task Packet preparation and specialist execution must both obey the Minimal
  Source Rule in `docs/workflows/specialist_agent_handoff.md`. Resolve exact
  paths before reading; do not enumerate the whole design tree, and do not open
  Approval Queue, temporary ideas, Decision Log, or Version History unless the
  current request identifies them as inputs or the active workflow specifically
  requires their history.
- For new, updated, or restructured non-scenario design Drafts, and non-scenario
  gaps in multi-role Drafts, delegate missing-information classification to
  `design_creative_planner` under `docs/skills/document_completion.md`. General
  scenario gaps remain with `scenario_designer`; in-game script gaps remain with
  `scenario_writer`. The main agent must review and show the complete GAP list,
  but must not authorize creative alternatives until the user explicitly
  authorizes all or selected `creative_fillable` GAPs.
- Delegate authorized design gaps to `design_creative_planner` under
  `docs/skills/design_creative_completion.md`. Require two alternatives for
  low/medium risk and three for high risk, a source-grounded recommendation, and
  `TBD` for `user_fact` or unresolved `dependency` gaps.
- Mark every selected, unsupported design decision with a `CP-*` footnote and
  preserve its alternatives, rationale, impacts, selection and validation needs
  in the approval item's Creative Proposal Log. Keep proposed or declined options
  out of the Draft.
- Treat balance numbers as `provisional` creative hypotheses with validation and
  retuning conditions. Do not invent actual platform, engine, budget, schedule,
  asset/data IDs, external contracts, or legal facts.
- Creative authorization or option selection is not approval. Reconfirm sources,
  revise the Draft, and return it to `pending` for explicit approval. If the
  canonical owner or core scope changes, create a linked or atomic `restructure`
  approval item.
- When receiving scenario material for review or drafting or changing a
  `scenario` document, the main agent must resolve the project, canonical owner,
  sources and scope. Delegate review-only requests directly to
  `scenario_reviewer`; delegate general scenario authoring or changes to
  `scenario_designer` under `docs/skills/scenario_review.md`, then send its result
  to `scenario_reviewer` before presenting or saving it. Preserve a source-faithful
  Draft and, when a stronger event order, reveal, branch, Outcome, or motivation
  exists, present it separately in `Scenario Improvement Review` with its reason
  and impacts.
- Do not merge a scenario improvement recommendation into the Draft or treat it as
  canon before the user selects it. After selection, reconfirm the sources, revise
  the Draft or create a linked replacement item as required, and return it to
  `pending` for explicit approval.
- Do not invent and present project facts as confirmed. Specialized workflows
  may create clearly disclosed proposals; use `TBD` when a required value cannot
  safely be proposed.
- When the user requests an in-game script from scenario material, delegate the
  project-adapted authoring task to the custom agent `scenario_writer`, then send
  the result to `scenario_reviewer` for independent review before the main agent
  presents or saves it.
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
- Authoring and creative subagents must return read-only handoffs. They do not
  write Approval Queue items or modify `design/`, `approvals/`, `decisions/`, or
  `versions/`. After required review findings are resolved, the main agent alone
  assembles and persists a `pending` approval item and retains all approval,
  reconfirmation, and application decisions.
- Do not duplicate creative provenance systems. General scenario structure uses
  Scenario Improvement Review, in-game scripts use `CW-*` and `NR-*`, and other
  authorized design completion uses `CP-*`.
- Keep changes scoped to the requested behavior and avoid unrelated refactors.
- Do not hardcode API keys, tokens, or other secrets.

## File Roles

- `workspace/project_registry.md`: registered projects and the current default project.
- `workspace/projects/<project_slug>/README.md`: project description, current focus,
  confirmed-document map, and working-record links; never a canonical detail owner.
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
