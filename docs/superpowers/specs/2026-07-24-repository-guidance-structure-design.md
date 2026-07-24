# Repository Guidance Structure Design

## Goal

Reduce repository noise and duplicated instructions while keeping ICU product guidance easy for Codex and contributors to discover.

## Chosen Structure

```text
AGENTS.md
skills/
  design/
    SKILL.md
    references/
docs/
  design/
  features/
.gitignore
```

### `AGENTS.md`

Keep only repository-wide requirements:

- product identity and current priority
- approved technology and directory conventions
- mandatory design-workflow trigger
- commit and safety rules
- source-of-truth routing

Do not copy detailed screen requirements, tokens, interaction guidance, or feature behavior into `AGENTS.md`.

### `skills/design`

Keep the design skill as a workflow router:

- when the skill applies
- which design and feature documents to read
- the order for inspecting, designing, implementing, and validating
- when to load `references/desktop.md` or `references/landing-interactions.md`

Remove duplicated product principles, screen specifications, tokens, copy rules, accessibility rules, and engineering conventions from `SKILL.md`. The two reference files remain because they provide conditional workflow guidance rather than ICU product facts.

### `docs/design`

Use design documents as the canonical source for shared product UI knowledge:

- product and visual principles
- shared tokens and typography
- common interaction and accessibility rules
- Korean copy guidance
- Figma-specific handoff instructions
- source user-flow diagrams

Consolidate shared rules into `design-brief.md`. Keep `figma-handoff.md` limited to Figma handoff. Move unique screen behavior from `screen-spec.md` and `wireframes.md` into the corresponding feature documents, then remove those duplicated documents.

### `docs/features`

Keep each feature's behavior, states, API contracts, and screen-specific accessibility requirements in its feature document. Today Hub, Workspace, Git Lab, curriculum, mistake notes, and other features should not depend on duplicated copies inside the design skill.

## Derived Asset Policy

Documentation images are generated outputs, not source files.

- Ignore `docs/**/*.png`.
- Ignore `docs/**/*.svg`.
- Remove already tracked documentation PNG and rendered SVG files from Git.
- Keep reproducible sources such as Mermaid `.mmd` files.
- Keep Figma source links and handoff documentation instead of exported frames.
- Do not delete unrelated local showcase assets as part of this cleanup.

The currently tracked Figma export PNG files and the rendered user-flow PNG/SVG are removal targets.

## Migration Order

1. Add documentation image ignore rules and remove tracked derived assets.
2. Consolidate shared design guidance into `docs/design/design-brief.md`.
3. Move unique screen requirements into matching `docs/features` documents.
4. Reduce `skills/design/SKILL.md` to workflow and document routing.
5. Update references from `AGENTS.md`, `docs/design/README.md`, and `figma-handoff.md`.
6. Remove superseded `screen-spec.md` and `wireframes.md`.
7. Verify links, ignored files, formatting, tests, and build.

## Non-Goals

- Do not introduce nested `AGENTS.md` files yet.
- Do not delete the design skill or its reference guides.
- Do not change product UI behavior.
- Do not commit server logs, showcase files, screenshots, or other unrelated local artifacts.

## Success Criteria

- Every durable rule has one canonical location.
- The root `AGENTS.md` remains the reliable repository-wide entry point.
- The design skill contains procedure and routing, not duplicated product specifications.
- Feature documents own feature-specific behavior.
- Documentation PNG/SVG derivatives no longer appear in Git status or future commits.
- All retained document links resolve.
