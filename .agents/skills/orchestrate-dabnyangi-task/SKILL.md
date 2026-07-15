---
name: orchestrate-dabnyangi-task
description: Coordinate 답냥이 repository development across a PM/integrator, product designer, frontend engineer, and backend/AI engineer. Use when the user explicitly requests role-based or multi-agent work, or an approved task spans at least two independent specialties that can safely run in parallel. Do not use for a small single-owner edit, a read-only status request, or the product runtime message-generation path.
---

# Orchestrate a 답냥이 development task

Use the primary agent as PM and sole integrator. Activate only the specialist roles the task needs; a four-role roster does not mean four agents must run on every task. Keep the product runtime on the single structured-generation workflow defined in `docs/AI_DESIGN.md`.

## 1. Establish authority and the contract

1. Read `AGENTS.md`, `harness/README.md`, the relevant CHECKLIST row, and only the canonical documents that row or task requires. Locate exact sections with targeted search; do not scan every reference document.
2. Follow every applicable repository skill. For a T-item, run `/task-start` before implementation.
3. Record the work in `harness/tasks/` when the harness requires it. Put objective, dependencies, scope, acceptance criteria, and existing dirty-worktree files in the plan.
4. Identify structural, product-contract, dependency, commit, deployment, or external-write decisions. Stop for approval when existing authority does not cover them.
5. Freeze shared contracts before parallel implementation. For frontend/backend work, fix the request/response types, states, error cases, privacy boundary, and canonical owner first.

## 2. Decide whether to delegate

Delegate only a bounded task that can progress independently. Keep work with the PM when it is small, sequential, or would make two agents edit the same file.

Check dependency gates before spawning implementation roles. If a required dependency is incomplete, keep implementation roles inactive, report the blocker and next eligible action, and use a read-only specialist only when that review can resolve the blocker.

| Work shape | Activate |
| --- | --- |
| UX flow or copy only | Designer; PM integrates |
| React UI with a settled contract | Frontend; add Designer for review when visual judgment is material |
| API, DB, prompt, provider, or privacy boundary | Backend/AI; add Frontend only for an actual client contract consumer |
| Approved end-to-end vertical slice | Designer + Frontend + Backend/AI after PM freezes the contract |
| Small fix, report, or one-file change | No specialist unless the user explicitly requests one |

If collaboration agents are unavailable, execute the same role cards sequentially; do not weaken their ownership and handoff rules.

## 3. Assign ownership before parallel work

Read [roles-and-handoffs.md](references/roles-and-handoffs.md) completely before dispatching specialists.

1. Give every active role a task card with exact owned paths, read-only context, excluded paths, acceptance criteria, validations, and required handoff fields.
2. Assign each writable path to exactly one active agent. The PM owns shared contracts, harness status, CHECKLIST, LOG, and final integration unless the plan explicitly assigns one of those files to a single specialist.
3. Never let specialists edit the same file concurrently. Split by file boundary or sequence the work.
4. Protect all pre-existing user changes. A specialist that finds an overlapping unplanned edit must stop that path and report it to the PM.
5. Tell specialists not to commit, push, mark CHECKLIST complete, expand scope, or make structural decisions unless the user explicitly authorized that action and the task card delegates it.

## 4. Dispatch and coordinate

1. Spawn at most one Designer, one Frontend, and one Backend/AI specialist. The primary agent remains PM; do not spawn a second PM.
2. Give the minimum task-local context that preserves the contract. Include canonical file paths rather than copying whole documents into the prompt.
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
6. Do not commit or push unless the user requests it. Report inactive roles, completed evidence, remaining manual gates, and known risks.

## 6. Preserve the runtime boundary

This skill orchestrates development work only. Do not add PM/Designer/Frontend/Backend model calls to `/api/generate`, do not turn message generation into an autonomous agent loop, and do not introduce RAG or runtime multi-agent review without a separately approved product-contract change.

## Examples

- **Professor direct-input vertical slice:** PM freezes `GenerationRequest`/`GenerationResponse` and non-storage rules; Designer reviews disclosure and loading/error copy; Frontend owns form/state UI; Backend/AI owns the server handler, provider validation, and metadata-only persistence.
- **Cat image replacement:** PM activates Designer and Frontend only. Backend/AI stays inactive because no server contract changes.
- **Migration-only task:** PM activates Backend/AI. Frontend and Designer stay inactive unless a real UI/API consumer changes.
