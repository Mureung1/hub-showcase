---
name: orchestrate-dabnyangi-task
description: Coordinate task-focused 답냥이 repository development with one PM/integrator and the smallest safe set of bounded read-only or specialist workers. Use when the user explicitly requests role-based, delegated, or parallel agent work, or an approved work package has at least two independently verifiable workstreams with settled contracts and non-overlapping write ownership. Do not trigger merely because a task has multiple T-numbers or specialties, and do not use for a small or sequential edit, a read-only status request, or the product runtime message-generation path.
---

# Orchestrate a task-focused 답냥이 development task

Use the primary agent as PM and sole integrator. Keep the T dependency graph granular, but organize execution around one user-visible outcome. Treat roles as temporary responsibility and permission templates, not a standing team. Keep the product runtime on the single structured-generation workflow defined in `docs/AI_DESIGN.md`.

## 1. Define the execution package

1. Read `AGENTS.md`, `harness/README.md`, the relevant CHECKLIST row, and only the canonical documents that row or task requires. Locate exact sections with targeted search; do not scan every reference document.
2. Follow every applicable repository skill. For a T-item, run `/task-start` before implementation.
3. Record the work in `harness/tasks/` when the harness requires it. Put the one execution-package outcome, included T-items, dependencies, scope, acceptance criteria, and existing dirty-worktree files in the plan.
4. Identify structural, product-contract, dependency, commit, deployment, or external-write decisions. Stop for approval when existing authority does not cover them.
5. Freeze shared contracts before parallel implementation. For frontend/backend work, fix the request/response types, states, error cases, privacy boundary, and canonical owner first.
6. Do not map one T-item to one agent automatically. A package may contain several related T-items, while one T-item may remain entirely with the PM.

## 2. Decide whether to delegate

Keep work with the PM by default. Delegate a candidate only when every gate below passes:

1. **Independent output:** it can return a bounded artifact or finding and can be validated without another unfinished worker output.
2. **Settled contract:** its inputs, expected output, error cases, privacy boundary, and canonical owner are fixed.
3. **Safe ownership:** it is read-only or its write paths do not overlap any active writer or PM integration path.
4. **Net efficiency:** parallel progress is likely to exceed briefing, supervision, integration, and extra-token cost.

If any gate fails, run the work sequentially under the PM. Do not use available concurrency as a target.

Check dependency gates before spawning implementation roles. If a required dependency is incomplete, keep implementation roles inactive, report the blocker and next eligible action, and use a read-only specialist only when that review can resolve the blocker.

| Work shape | Activate |
| --- | --- |
| Codebase exploration, test/log analysis, documentation verification | One or two read-only workers; PM synthesizes |
| UX flow or copy only | PM or Designer; use read-only review when no separate artifact needs writing |
| React UI with a settled contract | One Frontend writer; add read-only Designer review only when visual judgment is material |
| API, DB, prompt, provider, or privacy boundary | One Backend/AI writer; add Frontend only for a settled, separately owned client consumer |
| Approved end-to-end vertical slice | At most two writers after PM freezes the contract and assigns disjoint paths |
| Small fix, report, or one-file change | No specialist unless the user explicitly requests one |

If collaboration agents are unavailable, execute the same role cards sequentially; do not weaken their ownership and handoff rules.

## 3. Assign ownership before parallel work

Read [roles-and-handoffs.md](references/roles-and-handoffs.md) completely before dispatching specialists.

1. Give every active role a task card with exact owned paths, read-only context, excluded paths, acceptance criteria, validations, and required handoff fields.
2. Assign each writable path to exactly one active agent. The PM owns shared contracts, harness status, CHECKLIST, LOG, and final integration unless the plan explicitly assigns one of those files to a single specialist.
3. Never let specialists edit the same file concurrently. Split by file boundary or sequence the work.
4. Protect all pre-existing user changes. A specialist that finds an overlapping unplanned edit must stop that path and report it to the PM.
5. Tell specialists not to commit, push, mark CHECKLIST complete, expand scope, or make structural decisions unless the user explicitly authorized that action and the task card delegates it.
6. Prefer an isolated, task-local briefing. Pass the minimum canonical paths and contract needed; do not copy the full parent transcript unless the task genuinely depends on nuanced prior decisions.

## 4. Dispatch and coordinate

1. Spawn no more than two writing specialists. Use any additional available capacity only for a bounded read-only task. The primary agent remains PM; do not spawn a second PM.
2. Do not allow specialists to spawn their own agents. Keep a flat PM-to-worker tree for this repository.
3. Run specialists in parallel only when their write sets do not overlap and no output depends on another specialist's unfinished decision.
4. While specialists work, the PM performs independent integration work such as contract tests, harness updates, or read-only checks that do not touch owned paths.
5. Use direct messages for a correction within the current assignment. Use a follow-up task for a bounded review or revision after the first handoff.
6. If a specialist needs a contract change, pause dependent work. The PM evaluates the change, obtains approval when required, updates the canonical contract through one owner, then redispatches.

## 5. Integrate by evidence

1. Collect the standard handoff from every active role. Do not accept “done” without paths, validations, and risks.
2. Inspect the actual shared-worktree diff and compare it with the ownership manifest. Preserve unrelated changes.
3. Run only useful cross-reviews: Designer reviews material UI output; Frontend and Backend/AI check their shared type/API boundary. Keep reviews read-only unless the PM assigns a new non-overlapping revision.
4. Resolve integration edits sequentially under PM ownership.
5. Run the harness gates for the resulting work type. The PM alone updates verification status, CHECKLIST, and LOG and alone declares completion.
6. Record which workers were active, which work actually ran in parallel, ownership conflicts or rework, validation results, and whether delegation produced a clear benefit. Use the next two or three eligible tasks as a pilot before adding permanent custom-agent profiles or worktree automation.
7. Do not commit or push unless the user requests it. Report inactive roles, completed evidence, remaining manual gates, and known risks.

## 6. Preserve the runtime boundary

This skill orchestrates development work only. Do not add PM/Designer/Frontend/Backend model calls to `/api/generate`, do not turn message generation into an autonomous agent loop, and do not introduce RAG or runtime multi-agent review without a separately approved product-contract change.

## Examples

- **Professor direct-input vertical slice:** PM freezes `GenerationRequest`/`GenerationResponse` and non-storage rules; Designer reviews disclosure and loading/error copy; Frontend owns form/state UI; Backend/AI owns the server handler, provider validation, and metadata-only persistence.
- **Cat image replacement:** one Frontend writer changes the asset consumer; Designer reviews the rendered result read-only. Backend/AI stays inactive.
- **T35 external gate:** PM coordinates the incomplete human review; one read-only worker may audit retrieval evidence. Do not add parallel writers to already implemented shared code.
- **T22/T23/T31 chain:** respect the dependency chain and run implementation sequentially. Use a read-only verifier after the integrated diff instead of assigning one agent per T-item.
