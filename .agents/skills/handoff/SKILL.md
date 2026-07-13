---
name: handoff
description: Compact unfinished work from the current conversation into a temporary handoff document for a fresh agent session.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

# Handoff

Write a handoff document summarising the unfinished work so a fresh agent can continue. Save it to the temporary directory of the user's OS, not the current workspace.

Use this when the current ticket or planning phase is incomplete and context must roll over. A completed spec, implementation ticket, resolved Wayfinder ticket, ADR, commit, or diff is already durable context and does not need a duplicate handoff.

Include:

- the next session's exact objective,
- current branch and working-tree state,
- completed work and remaining work,
- blockers, assumptions, and unresolved decisions,
- exact verification already run,
- a `Suggested skills` section.

Reference existing specs, Wayfinder maps and tickets, implementation tickets, plans, ADRs, commits, diffs, and research assets by path or URL instead of copying their contents.

Redact API keys, passwords, tokens, secrets, and personally identifiable information.

When the user passes arguments, treat them as the next session's focus and tailor the handoff to it.
