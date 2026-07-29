---
name: ay-ple-semester-modeling
description: Reconcile academic facts from SemesterWorkspace sources into the SemesterModel snapshot with semantic Review before mutation. Use when a student wants to identify, organize, or update semester, Course, Assignment, Exam, or ScheduleEvent information.
---

# Semester Modeling

1. Establish the current scope from the user's request. Treat explicit file
   references as strong context when present; otherwise use the conversation and
   SemesterWorkspace context naturally. Clarify only when ambiguity would
   materially change the work.
2. Read `workspace-state.json` and the actual sources needed for the task. Treat
   the file as a SemesterWorkspaceState envelope: preserve `kind`,
   `formatVersion`, `workspaceId`, and `semester`, and change only its `snapshot`.
3. Identify relevant Course, Assignment, Exam, and ScheduleEvent facts, then
   incrementally reconcile them with the existing SemesterModel. Preserve facts
   outside the current scope and perform a full rebuild only when the user
   explicitly requests that scope.

   Use `known`, `unknown`, and `ambiguous` as epistemic guardrails without
   forcing a closed serialization schema. Do not invent missing facts or hide
   conflicts with a silent overwrite. In particular, keep an Assignment
   deadline and an Exam schedule visible as required knowledge: when the source
   does not establish one, express the uncertainty and useful explanation or
   evidence in the shape that best fits the current snapshot. Judge source
   trust, recency, relevance, and conflicting evidence in the actual academic
   context. Do not attach a fact to a Course or another academic object merely
   because it is the only plausible object in the snapshot; preserve the
   uncertain relationship unless the sources or conversation establish it.
4. Draft the proposed snapshot change without writing it. Re-read
   `workspace-state.json` and the relevant sources immediately before Review.
   If an input drifted from what informed the draft, discard the draft and
   reconcile against the current information before proposing. For a read-only
   extraction or answer, return the result without proposing a mutation.
5. Before changing `workspace-state.json`, call `propose_state_patch`. Provide a
   short `summary`, a `question`, and ordered semantic `changes` with readable
   `label`, `description`, and meaningful `before` and/or `after` values. When
   showing the source behind a change helps the user judge it, add `citations`.
   Give each citation a POSIX workspace-relative `relativePath`, a concise
   `excerpt` that honestly represents the part of the source AY relied on, and
   an optional free-form `locationHint` when it helps the user find that part.
   The App checks the file link and presents AY's citation; it does not certify
   that the excerpt exactly matches the file or that AY's interpretation is
   correct.
6. Treat the structured result as the decision about this proposal:
   - On `accept`, obtain any required native file permission, re-read
     `workspace-state.json` and the citation-bearing sources to detect drift.
     If a reviewed input drifted, keep the state unchanged and start a fresh
     reconciliation and Review instead of rebasing the accepted change.
     Otherwise, apply only the reviewed snapshot changes with native file tools
     while preserving the envelope identity, and verify the resulting file.
   - On `revise`, keep `workspace-state.json` unchanged. Incorporate the
     feedback, re-read the current state and relevant sources, and make a fresh
     `propose_state_patch` call. Start a new Review for the fresh call.
   - On `reject`, keep `workspace-state.json` unchanged and stop applying this
     proposal.
7. After an accepted snapshot change, follow the active SemesterWorkspace
   `AGENTS.md` and native permission policy. When the change is a meaningful
   checkpoint, inspect the exact diff and commit only the intended paths.

Rely on the App only to validate safe citation file links, present the Review,
and return its result; never ask or expect it to edit
a SemesterWorkspace file or run Git for AY. Never ask it to verify AY's source
interpretation. Keep a Review result independent from native execution
approval. If the Review call fails or its result is unavailable, preserve the
current state and do not infer an outcome.
