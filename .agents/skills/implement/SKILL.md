---
name: implement
description: Implement one well-bounded piece of work from a direct request, spec, or implementation ticket, verify it, review it, and close the local ticket when present.
disable-model-invocation: true
---

# Implement

Implement the work described by the user. A small, already-clear request may be implemented directly. A multi-session build should arrive as one local implementation ticket from `/to-tickets`.

## Preflight

Before editing code:

1. Read `AGENTS.md` and every repository instruction it points to for the affected area.
2. When a ticket was supplied, read it in full. Otherwise bound the direct request to one session and state what is out of scope.
3. For a ticket, verify it is `ready-for-agent` or already `claimed` by this session.
4. For a ticket, verify every entry under `Blocked By` is completed. Stop on an unresolved blocker.
5. Read the parent spec and relevant linked Wayfinder answers when they exist, plus owning architecture documents, ADRs, package READMEs, and current code/tests.
6. Revalidate every ticket `Starting Points` hint against the live code; those paths are non-normative.
7. State the slice's externally observable result and the testing seam before implementation.
8. For a local ticket, set `State: claimed` and save before changing code.

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
3. Use `/code-review` against repository standards and, when present, the parent spec/ticket.
4. Address review findings or record a clear blocker.
5. When working from a local ticket, update it in place:
   - check verified acceptance criteria,
   - set `State: completed` and `Next actor: none`,
   - append `## Result` with the implementation outcome and the implementation commits already created,
   - append `## Verification` with commands and outcomes, including any checks explicitly deferred to a final integration ticket.
6. Inspect `git status` and the remaining diff. Stage only intended changes, including review fixes, owning-document updates, and the local ticket closeout. Do not stage unrelated user changes.
7. Create a final focused commit on the current `codex/...` branch. For ticket work, use a closeout-oriented Conventional Commit message such as `docs: close <ticket title>` when only artifact bookkeeping remains; otherwise describe the final behavior fix. The ticket does not need to cite this closeout commit's own SHA.
8. Verify the tracked working tree is clean. If the final commit cannot be created or intended tracked changes remain, report the blocker and do not invoke `/camp-pr`.
9. Stop. Do not claim the next implementation ticket in the same context; report the next frontier for a fresh session. For direct work, report the completed scope, verification, and final commit instead.
