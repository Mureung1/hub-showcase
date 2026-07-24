# Repository Guidance Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tracked documentation render outputs and establish one canonical location for repository rules, shared design guidance, feature behavior, and design workflow instructions.

**Architecture:** Keep repository-wide enforcement in the root `AGENTS.md`, shared ICU design knowledge in `docs/design`, feature-specific behavior in `docs/features`, and procedural routing in `skills/design/SKILL.md`. Treat documentation PNG/SVG files as regenerated outputs while retaining Mermaid and written sources.

**Tech Stack:** Markdown, Git ignore rules, Mermaid source, Codex `AGENTS.md` and local skills

## Global Constraints

- Do not introduce nested `AGENTS.md` files.
- Do not delete `skills/design` or its two reference guides.
- Do not change React or backend behavior.
- Do not stage server logs, `showcase/`, or unrelated local deletions.
- Before every commit, report the exact staged files and core changes to the user.
- Use Korean Conventional Commit messages.

---

### Task 1: Remove Documentation Render Outputs

**Files:**
- Modify: `.gitignore`
- Modify: `docs/design/README.md`
- Delete: `docs/design/figma/export/icu-today-dark.png`
- Delete: `docs/design/figma/export/icu-today-light.png`
- Delete: `docs/design/figma/export/icu-workspace-dark.png`
- Delete: `docs/design/figma/export/icu-workspace-light.png`
- Delete: `docs/design/flows/icu-user-flow.png`
- Delete: `docs/design/flows/icu-user-flow.svg`

**Interfaces:**
- Consumes: `docs/design/flows/icu-user-flow.mmd` as the retained diagram source.
- Produces: a repository where docs PNG/SVG outputs stay ignored and are not tracked.

- [ ] **Step 1: Replace duplicate and narrow image ignore entries**

Add these exact rules once:

```gitignore
dist-preview/
docs/**/*.png
docs/**/*.svg
```

Keep environment, database, font, and temporary-reference rules unchanged.

- [ ] **Step 2: Remove tracked documentation render outputs**

Run:

```powershell
git rm --ignore-unmatch -- docs/design/figma/export/*.png docs/design/flows/*.png docs/design/flows/*.svg
```

Expected: the four Figma exports plus the rendered user-flow PNG/SVG are staged for deletion; `icu-user-flow.mmd` remains tracked.

- [ ] **Step 3: Update the design index**

Replace exported-image links with a short policy:

```markdown
## 시각 자료 원본

- 사용자 흐름 원본: [icu-user-flow.mmd](./flows/icu-user-flow.mmd)
- Figma 화면은 `figma-handoff.md`의 파일 링크와 프레임 이름을 기준으로 확인합니다.
- PNG와 SVG export는 파생 산출물이므로 Git에 저장하지 않습니다.
```

- [ ] **Step 4: Verify ignore and tracking behavior**

Run:

```powershell
git check-ignore -v docs/design/example.png docs/design/flows/example.svg
git ls-files "docs/**/*.png" "docs/**/*.svg"
```

Expected: both example paths match `.gitignore`; `git ls-files` produces no output after the staged deletions are committed.

- [ ] **Step 5: Commit**

Stage only `.gitignore`, `docs/design/README.md`, and the six documentation image deletions.

Commit:

```text
chore: 문서 파생 이미지 추적 제거
```

### Task 2: Consolidate Canonical Design Guidance

**Files:**
- Modify: `docs/design/design-brief.md`
- Modify: `docs/design/figma-handoff.md`
- Modify: `docs/design/README.md`
- Modify: `docs/features/today-learning.md`
- Modify: `docs/features/learning-workspace.md`
- Delete: `docs/design/screen-spec.md`
- Delete: `docs/design/wireframes.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: shared rules currently duplicated across `screen-spec.md`, `wireframes.md`, `figma-handoff.md`, and `skills/design/SKILL.md`.
- Produces: `design-brief.md` as the shared UI source and feature docs as the screen-behavior sources.

- [ ] **Step 1: Expand `design-brief.md` into the shared design source**

Retain product context and add canonical sections for:

```markdown
## Product Principles
## Shared Visual System
## Design Tokens
## Korean Copy
## Interaction and Accessibility
## Responsive Behavior
## Validation
```

Use the current ICU values: radius at most `8px`, cyan/deep blue primary accents, restrained orange, dark editor surfaces, visible focus, minimum 44px primary controls where possible, and text labels alongside color.

- [ ] **Step 2: Preserve unique screen behavior in feature docs**

Add Today Hub shell, focus, queue, list, review, empty, paused, completed, and narrow-width requirements to `docs/features/today-learning.md`.

Add Workspace top bar, curriculum, tutor, editor, result states, accessibility, and narrow-width tab behavior to `docs/features/learning-workspace.md`.

Do not duplicate Git Lab requirements because `docs/features/git-branching-lab.md` already owns them.

- [ ] **Step 3: Limit `figma-handoff.md` to Figma handoff**

Keep frame sizes, frame composition, naming, component candidates, and prototype interaction notes. Replace copied tokens and theme notes with links to:

```markdown
- Shared visual rules: [design-brief.md](./design-brief.md)
- Today behavior: [today-learning.md](../features/today-learning.md)
- Workspace behavior: [learning-workspace.md](../features/learning-workspace.md)
```

- [ ] **Step 4: Remove superseded design documents**

Delete:

```text
docs/design/screen-spec.md
docs/design/wireframes.md
```

Update `docs/design/README.md` to list only `design-brief.md`, `figma-handoff.md`, feature docs, and the Mermaid flow source.

- [ ] **Step 5: Clarify source routing in `AGENTS.md`**

Keep the root file and state:

```markdown
- Repository-wide enforcement: `AGENTS.md`.
- Shared UI principles and tokens: `docs/design/design-brief.md`.
- Screen behavior and API contracts: `docs/features`.
- Design workflow and document routing: `skills/design/SKILL.md`.
```

- [ ] **Step 6: Verify removed references**

Run:

```powershell
rg -n "screen-spec\.md|wireframes\.md|icu-.*\.(png|svg)" AGENTS.md docs skills
```

Expected: no links to removed documents or render outputs.

- [ ] **Step 7: Commit**

Stage only the documentation consolidation and `AGENTS.md`.

Commit:

```text
docs: ICU 디자인 규칙의 단일 원본 정리
```

### Task 3: Reduce the Design Skill to Workflow Routing

**Files:**
- Modify: `skills/design/SKILL.md`
- Retain unchanged: `skills/design/references/desktop.md`
- Retain unchanged: `skills/design/references/landing-interactions.md`

**Interfaces:**
- Consumes: canonical design and feature docs established by Task 2.
- Produces: a concise skill that routes tasks without copying product specifications.

- [ ] **Step 1: Replace duplicated skill sections**

Keep:

```markdown
# ICU Product UI
## When to Use
## Required Reading
## Optional References
## Workflow
## Validation
```

The required reading must route shared design decisions to `docs/design/design-brief.md`, feature behavior to the matching `docs/features` file, repository constraints to `AGENTS.md`, and Figma work to `docs/design/figma-handoff.md`.

- [ ] **Step 2: Remove copied product knowledge**

Remove the in-skill copies of product context, technology structure, product principles, screen patterns, tokens, Korean copy, accessibility details, and code-quality conventions. Retain only concise checks that direct the worker back to their canonical documents.

- [ ] **Step 3: Verify the skill and canonical docs**

Run:

```powershell
rg -n "^## " skills/design/SKILL.md
rg -n "Product Principles|Suggested tokens|Required Screen Patterns|Korean Copy Rules|Code Quality" skills/design/SKILL.md
```

Expected: only routing/workflow headings remain; duplicated section names produce no output.

- [ ] **Step 4: Run repository verification**

Run:

```powershell
npm test
npm run lint
npm run build
git diff --check
git status --short
```

Expected: 155 tests pass, lint exits 0, app and preview builds exit 0, and only intentionally excluded local artifacts remain unstaged.

- [ ] **Step 5: Commit**

Stage only `skills/design/SKILL.md`.

Commit:

```text
docs: ICU 디자인 Skill을 문서 라우터로 경량화
```
