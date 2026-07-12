---
name: implement
description: Implement one well-bounded piece of work from a direct request, spec, or implementation ticket, verify it, review it, and close the local ticket when present.
disable-model-invocation: true
---

# Implement

Implement the work described by the user. A small, already-clear request may be implemented directly. A multi-session build should arrive as one local implementation ticket from `/to-tickets`.

## Preflight

Before editing any tracked file:

1. Read `AGENTS.md` and every repository instruction it points to for the affected area.
2. When a ticket was supplied, read it in full. Otherwise bound the direct request to one session and state what is out of scope.
3. For a ticket, verify it is `ready-for-agent` or already `claimed` by this session.
4. For a ticket, verify every entry under `Blocked By` is completed. Stop on an unresolved blocker.
5. Read the parent spec and relevant linked Wayfinder answers when they exist, plus owning architecture documents, ADRs, package READMEs, and current code/tests.
6. Revalidate every ticket `Starting Points` hint against the live code; those paths are non-normative.
7. State the slice's externally observable result and the testing seam before implementation.
8. Run `git rev-parse HEAD` and record that commit as the review fixed point.
9. For a local ticket, set `State: claimed` and save before changing code.

A spec with `State: ready-for-ticketing` is not itself an implementation ticket. Use `/to-tickets` unless the user explicitly asks for a direct, single-session implementation.

## Implement the slice

- Work only on the selected vertical slice or bounded direct request.
- Use `/tdd` where possible at the pre-agreed highest seam.
- Keep the repository green through natural checkpoints.
- Run targeted tests and typechecking regularly.
- Commit focused checkpoints to the current `codex/...` working branch.
- Preserve current architecture and documentation ownership; update the owning document when live behavior or topology changes.
- For a ticket explicitly marked as an intermediate step in a wide-refactor integration sequence, use the current `codex/...` branch named by the parent plan; never create another integration layer. Keep the ticket-specific verification green and defer only the repository-wide checks explicitly assigned to the final integrate-and-verify ticket.

## Finish

1. Run the targeted verification named by the ticket, or agreed for the bounded direct request.
2. Run the repository's PR-ready checks from `AGENTS.md`, plus any relevant live smoke command documented by the affected package. The only exception is a declared wide-refactor intermediate ticket: record the intentionally deferred repository-wide checks, which the final integrate-and-verify ticket must run.
3. Commit every intended implementation change so `git diff <review-fixed-point>...HEAD` contains the complete slice.
4. Use `/code-review <review-fixed-point>` against repository standards and, when present, the parent spec/ticket.
5. Address review findings or record a clear blocker.
6. When working from a local ticket, update it in place:
   - check verified acceptance criteria,
   - set `State: completed` and `Next actor: none`,
   - add or update one `## Result` section with the implementation outcome and the implementation commits already created,
   - update the existing `## Verification` section with commands and outcomes, including any checks explicitly deferred to a final integration ticket; add the section once only when closing a legacy ticket that lacks it.
7. When the ticket names a parent spec, inspect every implementation ticket in the same directory that references that exact spec. If all are `State: completed`, set the parent spec to `State: completed` and `Next actor: none`, then add or update one `## Completion` section with relative links to the completed ticket set. Otherwise leave the parent spec state unchanged.
8. Inspect `git status` and the remaining diff. Stage only intended changes, including review fixes, owning-document updates, local artifact closeout, and parent spec closeout when applicable. Do not stage unrelated user changes.
9. Create a final focused commit on the current `codex/...` branch. For ticket work, use a closeout-oriented Conventional Commit message such as `docs: close <ticket title>` when only artifact bookkeeping remains; otherwise describe the final behavior fix. The ticket does not need to cite this closeout commit's own SHA.
10. Verify the tracked working tree is clean. If the final commit cannot be created or intended tracked changes remain, report the blocker and do not invoke `/camp-pr`.
11. Stop. Do not claim the next implementation ticket in the same context; report the next frontier for a fresh session. For direct work, report the completed scope, verification, and final commit instead.
