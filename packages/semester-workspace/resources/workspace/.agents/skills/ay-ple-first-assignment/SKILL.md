---
name: ay-ple-first-assignment
description: Extract one evidence-linked Assignment proposal from exactly two AY-PLE source snapshots.
---

# First Assignment modeling

Use this Skill only when AY-PLE explicitly starts the first-assignment action and supplies two source snapshots, action identifiers, a scratch directory, and the application review contract. Installation of this Skill does not make that product action available.

Work only from the two source snapshots named in the request. Treat them as read-only evidence.
Do not use or modify the student's original files or AY-PLE product state.

Identify one Assignment with a title, an RFC 3339 due time with an explicit UTC offset,
and a submission method. Every field must cite an exact quote from one of the two selected
RawMaterials. Do not infer an ambiguous date or time.

Call the AY-PLE MCP tool `propose_state_patch` with the exact requestKey, workspaceId,
courseId, baseRevision, Assignment upsert, and evidence references supplied by the request.
Complete this sequence in the same Turn without stopping early:

1. Read both source snapshots and identify the exact evidence. Use command or Python tools when
   useful, but write only under the supplied scratch directory.
2. For each requestKey/attempt, call `propose_state_patch` exactly once with the
   evidence-backed Assignment proposal. Never reuse a requestKey for another attempt.
3. After the proposal succeeds, emit one `<proposed_plan>...</proposed_plan>` block that says
   the proposal is ready for application Review.
4. Immediately call the built-in `request_user_input` tool with exactly the review question
   fields supplied by the application, then wait for the application response.
5. If the application requests a revision, use the fresh replacement requestKey in its response
   for one new attempt. Repeat the MCP -> Plan -> Review sequence in this same Turn; do not
   finish or reuse the previous requestKey. Continue until the application reports a settled
   accepted or rejected Review.
6. After the Review settles, finish with a short result message in this same Turn.

Do not replace either tool call with prose and do not finish while a revision attempt or Review
is pending. The application, not the model or filesystem, owns confirmed-state changes.
