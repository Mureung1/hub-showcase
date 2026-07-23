---
name: run-project-ticket
description: Analyze, implement, or report repository tickets defined in docs/product/checklist.md while preserving prerequisites, product intent, completion evidence, project context, work history, and repeated-work skill candidates. Use when a request names a ticket ID such as FE-AUTH-002 or BE-AI-001 and asks to analyze, implement, continue, complete, or check its status.
---

# Run Project Ticket

Treat the named ticket as the complete scope contract. Use `$preserve-product-intent` for repository analysis and implementation.

## Resolve the request

1. Extract exactly one ticket ID matching `[A-Z]+-[A-Z]+-[0-9]{3}`.
2. Find the exact ticket in `docs/product/checklist.md` and read its whole block.
3. Resolve the role and mode:
   - When the user explicitly says `analyst` with the ticket ID, route to the configured analyst and force `analyze` mode even if the same request says start, proceed, guide, or implement.
   - Otherwise determine the requested mode normally:
     - `status`: report current evidence and remaining criteria without mutation.
     - `analyze`: produce an implementation analysis without mutation.
     - `guide`: route to the configured implementer for one verified coaching step at a time without mutation.
     - `implement`: route to the configured implementer to modify the repository and close only verified criteria.
4. Ask for clarification only when the ticket ID or mode is genuinely ambiguous.

## Confirm role settings

Before a configured role begins work, ask the user to set and confirm the role's TOML model settings:

- analyst: `gpt-5.6-terra`, reasoning effort `medium`;
- implementer: `gpt-5.6`, reasoning effort `high`.

Treat an explicit user confirmation as sufficient; do not require runtime proof. Ask once when a new agent starts or the role changes, not during uninterrupted work in the same role. Never substitute or escalate a configured model automatically.

## Load context

Read in this order:

1. The ticket, its completion criteria, and every listed prerequisite.
2. `docs/project/context.md` completely.
3. Matching ticket entries and relevant keywords in `docs/project/history.md`; do not load unrelated history.
4. Current Git status and the existing implementation.
5. Product, design, API, and data documents selected through `$preserve-product-intent`.

Never assume an unchecked prerequisite is complete. In implement mode, stop and report when an incomplete prerequisite materially blocks the ticket; do not implement the prerequisite implicitly.

## Status mode

Report the ticket goal, checkbox state, prerequisites, verified criteria, remaining work, blockers, active context, and relevant history. Do not edit files or append history.

## Analyze mode

Inspect the current code and report the intended outcome, prerequisite or document conflicts, affected behavior, likely files, smallest implementation approach, failure cases, verification commands, and unresolved user decisions. For every testable behavior, define a TDD test contract: test level, success/failure/boundary cases, target test location, and the command expected to fail in Red. State the reason when TDD is not applicable.

Do not edit files, check boxes, or append history. Do not implement automatically after analysis. End the report by asking the user to choose exactly one next action:

1. `guide`: the implementer explains one concrete step at a time without editing and reviews the user's changes;
2. `implement`: the implementer edits the repository and performs verification.

The analyst never performs either choice. After the user chooses, pass the analysis and choice to the configured implementer.

The handoff must contain the ticket ID and original request, prerequisites and current state, verified document and code facts, included and excluded scope, smallest implementation approach, success/error/empty states, risks, completion criteria, validation commands, TDD test contract or skip reason, and selected mode.

When `analyst` was explicitly invoked, never combine analysis and implementation or route implementation to the root/main agent.

## Guide mode

This mode belongs to the configured implementer. Require the analyst handoff and explicit user choice when analyst routing was used. Do not edit files, check boxes, append history, commit, or push. Give exactly one implementation step at a time. For a testable behavior, begin with a test-only Red step and require the user to confirm that the targeted test fails for the expected missing behavior; then give the minimum Green implementation step. Suggest refactoring only after Green when it improves the requested change. Each step must state the target file and location, purpose, intended code or behavior, validation command, and completion signal. After the user reports completion, inspect the diff and give either a correction or the next step. Never mark the ticket complete until the user explicitly delegates implementation or asks for completion handling.

## Implement mode

This mode belongs to the configured implementer. Require the analyst handoff and explicit user choice when analyst routing was used.

1. Confirm all material prerequisites are complete.
2. Preserve existing user changes and limit edits to the ticket.
3. For every testable behavior in the handoff, write or update the focused test first and run it to confirm Red. Stop when the failure is unrelated to the intended missing behavior.
4. Implement the smallest complete vertical slice needed to make the Red test Green.
5. Refactor only after Green and only when it improves the requested change.
6. Run the repository's actual relevant validation commands.
7. Review the diff against every completion criterion.
8. Mark only criteria supported by code or verification as `[x]`.
9. Mark the parent ticket `[x]` only when every criterion is complete and no required work remains.
10. Never Commit or Push unless the user explicitly requests it.

Partial progress is valid, but the parent ticket must stay open. Do not hide failed or unavailable validation.

## Record implementation outcomes

For every implement-mode result, add a concise newest-first entry to `docs/project/history.md` using its template. Record decisions and failed approaches only when they help a later ticket; do not duplicate Git diffs.

Update `docs/project/context.md` only for facts that future tickets must continue to honor:

- add a durable decision or constraint;
- mark a known issue resolved when its ticket fixes it;
- mark obsolete context `대체됨` and identify its replacement.

Do not add routine implementation details to current context.

## Detect repeated work

Before finishing implement mode:

1. Decide whether the work used a reusable multi-step procedure rather than merely touching a similar feature.
2. If so, choose a stable lowercase hyphenated pattern key.
3. Update `docs/project/skill_candidates.md` with the count and evidence ticket IDs.
4. At count 1, use `관찰 중`.
5. At count 2, use `제안 필요` and ask the user once whether to create a project skill.
6. After asking, use `제안함`; respect `승인됨` and `거절됨` without asking again.

Never create a repeated-work skill automatically. After approval, use `$skill-creator` and default to `.agents/skills/<skill-name>`.

Do not count one-off feature code, visual tweaks, isolated bug fixes, product decisions, or plain `lint`/`build` commands as reusable patterns.

## Report implementation

Use the repository's required result format:

- 완료한 작업
- 변경한 파일
- 검증 결과
- 남은 문제

If a pattern reached `제안 필요`, finish the ticket report first and then ask the skill-creation question.
