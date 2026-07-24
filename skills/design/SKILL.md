---
name: icu-product-ui
description: Product UI workflow for designing, auditing, or implementing ICU screens. Use for Today Hub, Learning Workspace, Git Lab, onboarding, curriculum, review, mistake-note, profile, and shared app-shell work.
---

# ICU Product UI

## When to Use

Use this skill whenever a task designs, redesigns, audits, or implements a user-facing ICU screen or shared UI behavior.

This skill defines the work sequence and routes to canonical documents. Product rules, screen behavior, and engineering conventions stay in their source documents rather than being copied here.

## Required Reading

Always read:

1. `AGENTS.md` for repository-wide technology, safety, and commit rules.
2. `docs/design/design-brief.md` for shared product principles, visual tokens, copy, interaction, accessibility, and responsive rules.
3. The matching document under `docs/features` for screen behavior, states, data, and API contracts.

Read only when applicable:

- `docs/design/figma-handoff.md` for Figma frame, component, prototype, or handoff work.
- `docs/design/flows/icu-user-flow.mmd` when a change affects navigation or cross-feature learning flow.
- `docs/plan.md` when a change affects MVP scope or sequencing.
- `prototype.html` and `prototype.css` when comparing with the static prototype.

### Feature Routing

- Today Hub: `docs/features/today-learning.md`
- Learning Workspace: `docs/features/learning-workspace.md`
- Git Lab: `docs/features/git-branching-lab.md`
- Curriculum generation and history: the matching curriculum documents under `docs/features`
- Mistake notes and review: the matching mistake-note or review documents under `docs/features`
- Profile and onboarding: the matching profile or onboarding documents under `docs/features`

If no matching feature document exists, use `docs/design/design-brief.md` and the current implementation as the baseline. Add a focused feature document only when the behavior is durable and cannot be explained by an existing source.

## Optional References

Load a reference only when its topic is part of the task:

- `references/desktop.md`: dense desktop application shells, IDE panels, editor interactions, AI streaming, execution feedback, and restrained motion.
- `references/landing-interactions.md`: onboarding, landing, carousel, CTA, and marketing-style interactions.

Do not apply landing interaction patterns to dense Workspace or Git Lab screens unless the user explicitly asks for that direction.

## Workflow

1. Read the required sources for the affected feature.
2. Inspect the existing React, state, data, API, and CSS flow before proposing a change.
3. Identify the current learner goal, current step, primary action, and required states.
4. Reuse existing components, tokens, data shapes, and interaction patterns before adding new structures.
5. Keep feature behavior in the matching feature document and shared visual rules in `docs/design/design-brief.md`.
6. Implement the smallest change that satisfies the task and repository constraints.
7. Validate behavior, accessibility, responsive layout, Korean copy, and repository checks.

## Document Ownership

- `AGENTS.md`: mandatory repository-wide rules.
- `docs/design/design-brief.md`: shared ICU UI principles and design system.
- `docs/design/figma-handoff.md`: Figma-specific handoff workflow.
- `docs/features`: feature behavior, states, data, and API contracts.
- `skills/design/SKILL.md`: workflow and document routing only.
- `skills/design/references`: optional reusable interaction guidance.

When guidance conflicts, follow the most specific current source without duplicating the resolution across files. Update the canonical owner and replace other copies with links.

## Validation

For every UI task:

- confirm the active learning context and next action remain clear;
- check keyboard focus, semantic labels, text wrapping, and non-color state cues;
- check the relevant empty, loading, success, failure, disabled, and narrow-width states;
- confirm Korean text is readable UTF-8 and user-facing terminology uses `ICU`;
- confirm no generated documentation PNG/SVG is staged.

When code changes, run:

```bash
npm run lint
npm test
npm run build
```

When only documentation changes, run:

```bash
git diff --check
rg -n "\]\([^)]*(screen-spec|wireframes|docs/design/[^)]*\.(png|svg))" AGENTS.md docs skills
```
