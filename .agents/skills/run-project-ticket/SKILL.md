---
name: run-project-ticket
description: Analyze, implement, or report repository tickets defined in docs/product/checklist.md while preserving prerequisites, product intent, completion evidence, project context, work history, and repeated-work skill candidates. Use when a request names a ticket ID such as FE-AUTH-002 or BE-AI-001 and asks to analyze, implement, continue, complete, or check its status.
---

# Run Project Ticket

Treat the named ticket as the complete scope contract. Use `$preserve-product-intent` for repository analysis and implementation.

## Resolve the request

1. Extract exactly one ticket ID matching `[A-Z]+-[A-Z]+-[0-9]{3}`.
2. Find the exact ticket in `docs/product/checklist.md` and read its whole block.
3. Determine the requested mode:
   - `status`: report current evidence and remaining criteria without mutation.
   - `analyze`: produce an implementation analysis without mutation.
   - `implement`: modify the repository and close only verified criteria.
4. Ask for clarification only when the ticket ID or mode is genuinely ambiguous.

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

Inspect the current code and report the intended outcome, prerequisite or document conflicts, affected behavior, likely files, smallest implementation approach, failure cases, verification commands, and unresolved user decisions.

Do not edit files, check boxes, or append history.

## Implement mode

1. Confirm all material prerequisites are complete.
2. Preserve existing user changes and limit edits to the ticket.
3. Implement the smallest complete vertical slice described by the criteria.
4. Run the repository's actual relevant validation commands.
5. Review the diff against every completion criterion.
6. Mark only criteria supported by code or verification as `[x]`.
7. Mark the parent ticket `[x]` only when every criterion is complete and no required work remains.
8. Never Commit or Push unless the user explicitly requests it.

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
