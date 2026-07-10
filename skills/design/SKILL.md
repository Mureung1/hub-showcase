---
name: icu-product-ui
description: Product UI design and implementation guidance for this repository's ICU/DevChat React app. Use when Codex designs, redesigns, audits, or implements ICU screens, especially Today Learning Hub, Learning Workspace IDE, Git Branching Lab, onboarding, learning lists, review/mistake views, desktop app shells, light/dark theme tokens, and coding-tutor UX.
---

# ICU Product UI

## Product Context

ICU is an AI coding tutor desktop app. DevChat is the repository/planning name; use `ICU` in user-facing UI copy, title bars, app chrome, and onboarding.

The product helps beginner and intermediate developers decide what to study today, follow a curriculum, practice in a code editor, run code, receive feedback, and keep review history. Treat it as a focused learning tool, not a marketing landing page.

## Source Documents

Read `AGENTS.md` first for repository-wide engineering rules. Then read these project docs when the task touches the corresponding area:

- `docs/design/design-brief.md`: product principles, visual direction, default scenario.
- `docs/design/screen-spec.md`: required sections, states, and accessibility notes.
- `docs/design/figma-handoff.md`: design tokens, frame sections, component candidates.
- `docs/features/today-learning.md`: Today Learning Hub behavior and data.
- `docs/features/learning-workspace.md`: Learning Workspace IDE behavior and data.
- `docs/features/git-branching-lab.md`: Git Branching Lab simulator behavior, graph goals, supported commands, and UI constraints.
- `docs/plan.md`: product scope, roadmap, RAG/source policy, technical stack.
- `AGENTS.md`: repository-wide tech decisions, directory conventions, commit rules, and guardrails.

Some older Korean docs may contain mojibake. Prefer readable docs and current feature docs when text conflicts.

## Implementation Context

- Current app: Vite + React + TypeScript + TSX.
- Routing: React Router.
- State management: Zustand for shared screen state when needed.
- Styling: CSS Modules for new component-scoped styles.
- Global styling: keep app-wide reset, typography, fonts, and theme tokens in `src/styles` and `src/components/fonts`.
- Current structure:
  - `src/app`: router, shell, app-level providers.
  - `src/pages`: route-level pages.
  - `src/features`: product feature areas such as Today Learning, Learning Workspace, Git Lab, Onboarding, and Review.
  - `src/components`: shared UI components.
  - `src/data`: mock data and static presets.
  - `src/stores`: Zustand stores.
  - `src/styles`: global CSS and theme tokens.
  - `src/types`: shared TypeScript types.
- Keep changes compatible with this structure unless the user asks for a larger refactor.
- Use semantic HTML and accessible labels for navigation, status, forms, editor controls, terminal logs, graph views, and test results.

## Core Workflow

1. Scan the relevant React and CSS files plus the matching docs.
2. Identify which ICU screen or state is being changed.
3. Preserve the product flow: onboarding or Today Hub first, workspace after starting or resuming learning.
4. Implement focused UI changes using existing project patterns before adding new dependencies.
5. Verify responsive behavior, keyboard focus states, contrast, and Korean copy readability.

## Product Principles

- Today first: the first learning screen should answer "what should I do now?"
- Learning before files: curriculum, missions, and review matter more than a file explorer.
- IDE when needed: make the editor central only inside an active learning session.
- Clear current step: every screen should show the current learning step and next action.
- Trust through sources: official documentation references should be visible when AI explanations appear.
- Beginner-safe density: keep the interface efficient, but avoid overwhelming panels and vague labels.
- Theme-ready UI: design core surfaces so light and dark modes can share semantic tokens.

## Required Screen Patterns

### Today Learning Hub

Use this as the first product screen, not a chatbot-only start page.

Include:

- Left navigation: Today, Learning List, Review, Settings.
- Header: today's learning title, date, short schedule summary, search or command input.
- Today's Focus: active track, current step, mission, estimated time, progress, primary continue action.
- Today Queue: concept explanation, quick quiz, code mission, test execution, AI code review.
- Learning List Preview: React, Python, FastAPI, BFS tracks with status, progress, last studied date, next action.
- Review and Mistakes Summary: review due count, weak concepts, recent wrong answers, next review date.

Support states:

- No active learning: prompt for a learning goal.
- Learning paused: show resume point and last activity.
- All done today: show completion summary and next review schedule.

### Learning Workspace IDE

Use this for active study. It should feel like a simplified IDE for learners, not a generic dashboard.

Include:

- Top bar: current track, step number, today progress, remaining time, navigation back to learning list/today.
- Curriculum panel: today's steps, current mission, pass criteria, review shortcut.
- AI Tutor panel: explanation, mission, hint, code review, official sources.
- Code Editor panel: file tab, language selector, run button, editor/preview area, starter code.
- Test Results panel: not run, running, passed, failed, timeout states.

Failed state should show the failed test, plain-language reason, hint action, and re-run action. Passed state should show pass count, short feedback, code review action, and next step action.

### Git Branching Lab

Use this for Git command simulation and branch graph learning. It should feel like a focused learning tool, not a game clone.

Include:

- Top bar: current level title, clear state, goal visibility toggle, and route back to learning.
- Terminal panel: macOS-style header, command input, log history, hint output, and level command feedback.
- Current graph panel: SVG commit graph with circular commit nodes, parent arrows, branch labels, and current branch marker.
- Goal panel: compact target graph, goal description, accepted commands, and clear/mismatch feedback.
- Clear modal: short confirmation, next level action, and restart option.

For `/git-lab`, keep the terminal dark, graph panel light, goal panel softly pink, commit nodes green (`#90EE90`), parent arrows black, and command/commit text monospace. Use the brand background from the learning screens rather than a separate game-like theme.

## Visual Direction

- Use calm productivity surfaces, not decorative hero sections.
- Use radius `8px` or less.
- Use the project font component globally when available; fall back to Inter/system sans for UI and `SFMono-Regular`, Consolas, or monospace for code.
- Keep editor and terminal areas dark in both themes, inspired by VS Code.
- Avoid nested cards, large gradients behind dense panels, oversized marketing sections, and purely ornamental images.
- Do not make the UI dominated by one color family. The workspace should stay neutral with controlled accents.
- The Git Lab page may use the Workday-inspired brand background directly behind panels, but dense panels must remain readable and restrained.

Suggested tokens:

```css
:root {
  --color-light-bg: #f4f6f8;
  --color-light-surface: #ffffff;
  --color-light-surface-subtle: #fbfcfe;
  --color-light-text: #172033;
  --color-light-text-strong: #101828;
  --color-light-text-muted: #64748b;
  --color-light-border: #d3dce8;

  --color-dark-bg: #07111f;
  --color-dark-surface: #0f1b2d;
  --color-dark-surface-subtle: #13243a;
  --color-dark-text: #e5edf7;
  --color-dark-text-strong: #f8fafc;
  --color-dark-text-muted: #94a3b8;
  --color-dark-border: #25364d;

  --color-brand-orange: #ff8a1c;
  --color-brand-pink: #f3b8d8;
  --color-brand-cyan: #35c8f4;
  --color-brand-blue: #0b4bb3;
  --color-brand-navy: #112b5f;
  --color-editor-bg: #151a24;
  --color-editor-text: #dbe4ef;
}
```

Use cyan/deep blue for primary actions, focus rings, progress, and selected states. Use warm orange sparingly for completion, friendly onboarding, or important highlights. In Git Lab, reserve green for commit nodes/current branch success states, not for every action.

## Korean Copy Rules

- Use natural Korean for user-facing text.
- Keep labels concrete: `오늘 학습`, `이어 학습하기`, `계획 조정`, `오늘 복습 시작`, `실행`, `힌트 보기`, `코드 리뷰 요청`, `다시 실행`.
- Keep honorific tone consistent with `-합니다` / `-해보세요`.
- For Git Lab, prefer action-oriented labels such as `목표 보기`, `목표 숨기기`, `힌트`, `레벨 불러오기`, `다시 시작`, `다음 레벨`.
- Do not invent fake metrics. Use mock data only when the UI is explicitly a prototype, and make it plausible without implying real production usage.
- Do not use English placeholder copy in visible UI unless it is a code term, file name, API name, or official source title.

## Interaction And Accessibility

- Primary buttons should be at least 44px tall where possible.
- Preserve visible keyboard focus states on every interactive control.
- Do not rely on color alone for progress, graph, or test states; pair color with text or icon labels.
- Long tutor text should have readable line length.
- Official source references should be visible but secondary to the current mission.
- Use `aria-label`, headings, lists, and regions where they clarify screen structure.
- For narrow widths, collapse navigation carefully and convert workspace panels into tabs such as `튜터`, `코드`, `결과`.
- For Git Lab, keep terminal logs screen-reader readable with live status text, and label SVG graph groups so commit IDs, branches, and current HEAD are not color-only information.

## Code Quality

- Prefer structured React data arrays for tracks, curriculum steps, status labels, test results, level data, and graph fixtures.
- Put reusable mock learning data in `src/data`; keep feature-specific level data inside the feature folder when it is not shared.
- Use semantic sections for app shell, navigation, panels, articles, forms, terminal regions, graph regions, and result lists.
- Use typed props and shared TypeScript types when UI data crosses component or feature boundaries.
- Use CSS Modules for component-level styling and keep global CSS limited to reset, typography, layout primitives, and theme tokens.
- Add comments only for non-obvious behavior.
- Do not add Tailwind, icon libraries, Monaco, Electron, Express, RAG, Notion API integration, or other new dependencies unless the user explicitly asks or the task requires it.

## Validation Checklist

Before finishing UI work:

- The screen still communicates the active learning goal and next action.
- The Today Hub, Workspace, and Git Lab flows match the docs.
- Text does not overflow buttons, cards, panels, graph labels, or narrow layouts.
- Light/dark token choices remain feasible even if only one theme is implemented.
- Buttons, inputs, terminal controls, graph labels, and interactive rows have hover/focus/active states.
- Korean copy is readable and not mojibake.
- `npm run build` passes when code changed.