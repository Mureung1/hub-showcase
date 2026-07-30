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
- Project creative agent setup: `docs/workflows/project_creative_agent_setup.md`
- Project creative agent rule template:
  `docs/templates/project_creative_agent_rule.md`
- Project creative agent setup plan template:
  `docs/templates/project_creative_agent_setup_plan.md`
- Project creative agent index template:
  `docs/templates/project_creative_agent_index.md`
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
- Independent design creative reviewer agent:
  `.codex/agents/design_creative_reviewer.toml`
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
  `scenario_reviewer`, `design_creative_planner`, or
  `design_creative_reviewer`, follow
  `docs/workflows/specialist_agent_handoff.md` and complete
  `docs/templates/specialist_task_packet.md`. Reconcile the current request and
  every material prior user fact, selection, prohibition, scope change, approval
  ID, and authorization boundary into the packet. Record each fact or input as
  `current_user_input`, `prior_user_input`, `confirmed_document`,
  `proposal_input`, or `synthetic_test_fixture`. Do not call a specialist while
  a required packet field or provenance is missing or contradictory.
- Before creative option generation, scenario authoring, in-game script writing,
  or selection incorporation, follow
  `docs/workflows/project_creative_agent_setup.md`. Resolve the exact active
  project creative rule from `workspace/projects/<project_slug>/agents/README.md`
  by canonical role, `exact | subtree` project-relative target path, and one
  allowed operation. If more than one active rule matches, return
  `blocked_creative_rule_mismatch` without opening every rule. Record the
  selected rule's basis (`active_current | archived_snapshot`), ID, path,
  version, SHA-256, applicability, and review contract in the Specialist Task
  Packet. `design_creative_planner` `classify`, search,
  summary, review-only, non-creative source structuring, temporary-idea capture,
  and mechanical application do not require a creative rule.
- If no matching project creative rule exists, do not call an authoring or
  creative-generation specialist and do not generate alternatives. Return
  `blocked_missing_creative_rule` for creative execution and immediately use
  the planning-only setup workflow in the current conversation. Explain the
  required PCA fields, prefill discoverable values from the current request and
  minimal confirmed sources, ask only material preference questions with
  recommended defaults, and return a complete setup plan. Fill unanswered
  fields with the disclosed conservative defaults and report what was supplied
  and why; do not persist that report in the PCA. If an existing rule is out of
  scope or conflicts with the request, return
  `blocked_creative_rule_mismatch`; explain the mismatch and ask whether to
  revise it, but never revise it automatically.
- Project creative rule creation and revision happen only through a
  decision-complete planning-only setup result followed by the user's explicit
  implementation request. Actual UI Plan mode is not required. A request such
  as `그대로 구현해` adopts the defaults already disclosed in the complete plan.
  That implementation request activates the behavioral rule directly without
  Approval Queue, Decision Log, or Version History; it never authorizes a
  simultaneous change to confirmed design documents.
- Keep project creative rules as independent field-specific files. Do not create
  a shared creative-direction file, copy another project's rule, or create a new
  `.codex/agents/*.toml` for each project rule. Existing specialist agent types
  execute the selected project rule.
- Every project creative rule must choose a review policy. General scenario and
  in-game script authoring always use `independent_always` with
  `scenario_reviewer`. Non-scenario rules choose
  `self_and_main | independent_high_risk | independent_always` during the
  planning-only setup design;
  required independent review uses `design_creative_reviewer`.
- Treat a project creative rule as behavioral guidance, never as the canonical
  source of a game fact. Global workflow, confirmed canonical documents,
  provenance, approval, and ownership rules take precedence. Preserve the rule
  ID, version, and SHA-256 originally used by every result. A newer active rule
  does not automatically invalidate, revise, or re-review an older result; that
  result may continue through selection, approval, and mechanical application
  under its recorded review state. New generation, revision, restructure, or
  selection incorporation uses the current active rule. Re-review under the
  current rule happens only on the user's explicit request and remains
  read-only. Return `blocked_creative_rule_integrity` only when the exact active
  file or archived snapshot named in the packet does not match its transmitted
  path, version, or SHA-256. Source changes still follow normal source
  reconfirmation.
- Before revising a project creative rule, preserve its exact bytes at
  `agents/rules/archive/<rule_slug>/v<version>.md`, record the snapshot SHA-256
  in `agents/README.md`, and then increment the active version. Archived
  snapshots are never candidates for new creative routing and are used only to
  audit older results.
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
- `workspace/projects/<project_slug>/agents/README.md`: optional index of active
  and retired project creative agent rules; created only with the first
  explicitly implemented rule.
- `workspace/projects/<project_slug>/agents/rules/`: optional independent,
  field-specific behavioral rules for existing creative specialist agents;
  never a canonical game-fact owner.
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
