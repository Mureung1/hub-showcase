---
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts. If the question is genuinely ambiguous and the user is not reachable, default to the branch that matches the surrounding code (backend module → logic; page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate prototype code close to where it would be used so context is obvious, but name it so a casual reader cannot mistake it for production. Follow the project's existing routing convention.
2. **One command to run.** Use the repository's existing task runner so the user can start it without remembering a file path.
3. **No persistence by default.** Keep state in memory. When persistence is the question, use a scratch database or local file with a clear `PROTOTYPE` name.
4. **Skip the polish.** Add only the error handling and structure required to make the prototype runnable and inspectable.
5. **Surface the state.** After every action or variant switch, render the full relevant state.
6. **Capture the decision and the primary source.** Fold the validated decision into the real spec or implementation, and preserve the full prototype on a non-integration evidence branch.

## Repository branch capture

This repository's normal implementation branches are `codex/...`; `/camp-pr` integrates only those branches. Preserve prototype evidence separately:

1. Create or retain a `prototype/<short-slug>` branch containing the complete prototype and its run instructions.
2. Record the question, verdict, and evidence branch URL or ref in the relevant Wayfinder ticket, spec, or implementation ticket.
3. Return to the selected `codex/...` working branch and carry over only the adopted decision, rewritten production code, and tests.
4. Do not merge a `prototype/...` evidence branch through `/camp-pr` or into `N180_하성욱` unless the user explicitly reclassifies that code as production work.

The main integration branch keeps the validated result; the evidence branch keeps the cheap artifact that produced the result.
