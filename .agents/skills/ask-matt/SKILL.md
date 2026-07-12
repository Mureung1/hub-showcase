---
name: ask-matt
description: Ask which skill or flow fits your situation. A router over the skills in this repo.
disable-model-invocation: true
---

# Ask Matt

You don't remember every skill, so ask.

A **flow** is a path through the skills. Most paths run along one **main flow**, and two on-ramps merge onto it. Everything else is standalone, or a vocabulary layer that runs underneath.

## This repository

Matt planning artifacts are local Markdown by default:

- `/to-spec` writes specs under `docs/prds/` (the legacy directory name is retained for link compatibility).
- `/to-tickets` writes one implementation ticket per file under `docs/issues/`.
- `/wayfinder` writes maps, decision tickets, and linked assets under `docs/wayfinding/`.
- GitHub Issues are used only when the user explicitly requests publication and confirms the target repository or request surface.

## The main flow: idea → ship

The route most work travels. You have an idea and want it built.

1. **Sharpen a tractable idea** → `/grill-with-docs`. Start here when the idea and its major branches fit in one conversation. It keeps domain language and durable decisions in `CONTEXT.md` and ADRs. With no codebase, use `/grill-me` instead.
2. **Answer questions that need a runnable artifact** → use `/handoff` to enter a fresh `/prototype` session, then carry the verdict back through the durable artifact. The prototype is evidence; the adopted decision belongs in the spec, ADR, or implementation.
3. **Choose the planning depth.**
   - **Huge and foggy; the route itself is not visible** → `/wayfinder`. Resolve one investigation ticket per session until the map reaches `ready-for-spec`, then start a fresh session with `/to-spec <map-path>`.
   - **The route is clear, but implementation spans multiple sessions** → `/to-spec`, then `/to-tickets`. Tickets are tracer-bullet slices with explicit blocking edges.
   - **Small and already clear enough for one session** → `/implement` directly.
4. **Implement one ticket per fresh session.** Invoke `/implement <ticket-path>`. It reads the parent spec and resolved blockers, drives `/tdd` at the agreed seam, runs `/code-review`, records verification in the ticket, and stops instead of claiming the next ticket in the same context.
5. **Integrate completed work** → `/camp-pr` when the selected `codex/...` working branch should enter the participant's `N180_하성욱` flow.

### Context hygiene

For a normal multi-session build, keep grilling, `/to-spec`, and `/to-tickets` in one unbroken context when they still fit in the model's smart zone. Clear context before each `/implement` ticket.

Wayfinder deliberately crosses sessions: the map and its tickets are the durable context. Work at most one Wayfinder ticket per session. Use `/handoff` only when a ticket or planning phase is unfinished and the current context must roll over; a completed spec, ticket, or resolved Wayfinder ticket is already its own handoff.

## On-ramps

- **Incoming bugs and requests** → `/triage`. It turns raw external reports into agent-ready work that `/implement` can later pick up. Tickets produced by `/to-tickets` are already agent-ready and should not be triaged again.
- **A hard bug with no tight explanation yet** → `/diagnosing-bugs`. Establish one command that reproduces the bug, fix it with a regression test, and hand architectural seam problems to `/improve-codebase-architecture`.

## Codebase health

- **`/improve-codebase-architecture`** surveys deepening opportunities. A chosen opportunity becomes an idea that can enter `/grill-with-docs` or, when unusually large and foggy, `/wayfinder`.

## Vocabulary underneath

- **`/domain-modeling`** sharpens domain language and records hard-to-reverse decisions.
- **`/codebase-design`** supplies the module, interface, seam, adapter, locality, and depth vocabulary used by the implementation-oriented skills.

## Crossing sessions

- **`/handoff`** compacts unfinished work into a temporary document for a fresh session. It points to durable artifacts instead of duplicating them.
- **`/compact`** (built-in) continues the same conversation through a summary. Use it only at intentional phase boundaries.

## Standalone

- **`/grill-me`** — stateless grilling without a repository.
- **`/prototype`** — a throwaway runnable artifact that answers one design question and is preserved on a non-integration evidence branch.
- **`/research`** — primary-source investigation that leaves a cited Markdown asset for later planning.
- **`/camp-pr`** — the repository-specific fork integration and camp submission flow.
- **`/teach`** — multi-session learning in the current directory.
- **`/writing-great-skills`** — reference for writing and editing skills.

## Precondition

`/setup-matt-pocock-skills` configures the tracker, triage vocabulary, and domain-document layout. This repository is already configured; preserve `docs/agents/**`, the local artifact paths, marker-based triage, `/camp-pr`, and fork publication rules unless the user explicitly requests reconfiguration.
