---
name: wayfinder
description: Plan a huge, foggy effort across multiple sessions as a local map of decision and investigation tickets, resolving one ticket per session until an implementation-ready spec can be written.
disable-model-invocation: true
---

# Wayfinder

Use Wayfinder when an effort is too large for one agent session **and** the route from the current state to the destination is not yet clear. It charts questions and decisions; it is not a large implementation backlog.

This repository stores Wayfinder artifacts as local Markdown under `docs/wayfinding/`. Do not create GitHub Issues unless the user explicitly requests publication and confirms the target repository or request surface.

Write generated map, ticket, answer, and asset prose in Korean. Preserve established domain terms, protocol names, package names, file paths, and code identifiers in their original form.

## Plan, do not implement by default

Each ticket resolves a decision, investigation, or prerequisite fact. The default destination is a spec or durable decision that makes implementation planning possible. When the urge is to implement the destination, the map has probably reached its edge and should hand off to `/to-spec`, `/to-tickets`, or `/implement`.

A map may include execution only when its `Notes` explicitly says so. Even then, keep implementation tickets separate from Wayfinder decision tickets.

## Local artifact layout

```text
docs/wayfinding/<effort-slug>/
├── map.md
├── tickets/
│   ├── 001-<ticket-slug>.md
│   └── 002-<ticket-slug>.md
└── assets/
    └── ...
```

The map is an **index**, not the detailed decision store. Each resolved ticket owns its full answer; `map.md` carries only a one-line gist and a link.

Use ticket titles in human-facing prose. A filename or number may identify a path, but never replace the readable name.

## State model

| Artifact | States | Meaning |
| --- | --- | --- |
| Map | `active` → `ready-for-spec` → `complete` | Investigation is in progress; the route is clear enough for `/to-spec`; the resulting spec is linked. |
| Ticket | `open` → `claimed` → `resolved` | Available or blocked; owned by the current session; answered and closed. |
| Ticket | `out-of-scope` | Closed because it lies beyond the destination. |

Wayfinder tickets are **decision and investigation artifacts**. Their state vocabulary is exclusively `open`, `claimed`, `resolved`, and `out-of-scope`; implementation triage state belongs to tickets produced by `/to-tickets`.

## The map

```markdown
# <Effort title>

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

<One or two lines describing the spec, decision, or bounded change that marks the end of this map.>

## Notes

<Domain, owning documents, skills to consult, and standing rules for every session.>

## Decisions so far

- [<resolved ticket title>](tickets/001-example.md) — <one-line gist>

## Not yet specified

<In-scope fog that cannot yet be phrased as a precise ticket question.>

## Out of scope

<Consciously excluded work, with links to any ticket closed as out-of-scope.>

## Resulting spec

<Added by /to-spec when the map becomes complete.>
```

Open tickets are discovered from the `tickets/` directory rather than duplicated in the map.

## Tickets

Each ticket is one precise question sized for one fresh context window:

```markdown
# <NNN> — <Ticket title>

## Wayfinder ticket

- Type: <research | prototype | grilling | task>
- State: open
- Blocked by: <relative ticket paths, or `None`>

## Question

<The decision, investigation, or prerequisite fact this ticket resolves.>

## Answer

<Appended only when resolved. Include links to assets instead of pasting large artifacts.>
```

A ticket is **unblocked** when every path under `Blocked by` is `resolved`. The **frontier** is the ordered set of `open`, unblocked tickets. Local Markdown work is sequential by default: claim and resolve one frontier ticket per session so map and ticket edits cannot overwrite one another.

Claim a ticket by changing its state to `claimed` and saving before beginning. If the session cannot finish, use `/handoff` and keep the claim only when the next session will resume it immediately; otherwise return it to `open` with a short note.

## Ticket types

- **Research** (AFK): inspect primary documentation, APIs, or local resources. Save a cited Markdown summary under `assets/` and link it from the answer.
- **Prototype** (HITL): create a rough artifact through `/prototype` so the human can react to behavior or appearance. Link the prototype evidence branch or asset; record the verdict in the ticket.
- **Grilling** (HITL): resolve a decision through `/grilling` and `/domain-modeling`, one user decision at a time. The agent may research facts but never answer the human's side of the decision.
- **Task** (AFK or HITL): perform prerequisite work needed before a later decision can be made, such as provisioning access or moving sample data. It earns a place only by unblocking a decision, not by delivering the destination.

## Fog of war

A map is deliberately incomplete. Put a topic in `Not yet specified` when it is in scope but cannot yet be stated as a precise question. Create a ticket as soon as the question can be stated clearly, even if another ticket blocks answering it.

Do not duplicate:

- resolved decisions belong in ticket answers and are linked from `Decisions so far`,
- precise open questions belong in ticket files,
- excluded work belongs in `Out of scope`,
- only genuinely unformulated in-scope uncertainty belongs in `Not yet specified`.

When a ticket turns out to lie beyond the destination, set it to `out-of-scope`, add one linked explanation under the map's `Out of scope`, and do not list it under `Decisions so far`.

## Invocation

Never resolve more than one ticket per session.

### Chart a map

Use this mode when the user invokes `/wayfinder` with a loose effort.

1. Read `AGENTS.md`, `docs/README.md`, `docs/agents/issue-tracker.md`, relevant owning documents, ADRs, and current code.
2. Use `/grilling` and `/domain-modeling` to name the destination first.
3. Explore breadth-first across the effort to identify precise initial questions and remaining fog.
4. If the whole route is already visible and fits one session, do not create a map; recommend `/grill-with-docs`, `/to-spec`, or `/implement` instead.
5. Create `map.md` with `State: active`.
6. Create every currently precise ticket under `tickets/`, blockers first, then add exact blocking paths in a second pass.
7. Report the initial frontier and stop. Charting and resolving are separate sessions.

### Work through a map

Use this mode when the user invokes `/wayfinder <map-path> [ticket-path]`.

1. Load the map as the low-resolution index. Do not preload every ticket answer.
2. Use the user-named ticket, or choose the first frontier ticket by number.
3. Set that ticket to `claimed` before doing work.
4. Resolve the question. Fetch linked answers and owning documents only as needed, and invoke the ticket type's skill.
5. Append the answer, asset links, and evidence to the ticket; set it to `resolved`.
6. Append only a one-line gist and link to the map's `Decisions so far`.
7. Create newly precise tickets, wire their blocking paths, and remove graduated text from `Not yet specified`.
8. Stop after this one ticket and report the next frontier.

### Complete a map

When no `open` or `claimed` tickets remain and `Not yet specified` contains no in-scope fog:

1. Set the map to `State: ready-for-spec` and `Next actor: /to-spec`.
2. Report the exact next command:

   ```text
   /to-spec docs/wayfinding/<effort-slug>/map.md
   ```

3. Do not write a parallel ad-hoc spec from the Wayfinder session.
4. `/to-spec` reads the linked resolved answers, writes the spec, adds it under `Resulting spec`, and changes the map to `complete`.
