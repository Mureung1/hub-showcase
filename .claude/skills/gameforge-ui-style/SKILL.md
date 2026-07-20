---
name: gameforge-ui-style
description: Design system and component reference for the GameForge Agent React frontend (client/), extracted from docs/gameforge-agent-prototype.html. Use this whenever building, styling, or reviewing ANY screen or component in client/ — repo connect, analysis report, agent workspace/sidebar, chat Q&A, markdown preview/edit, or the commit review/diff screen — even if the user just says "make this screen" or "add a button" without mentioning design or the prototype. Also consult it before inventing any new color, spacing, or component pattern for this app, to keep it visually consistent with the prototype instead of improvising a new look.
---

# GameForge UI Style

This app's whole visual language (colors, spacing, component shapes, states) was designed once in a single static prototype file, `docs/gameforge-agent-prototype.html`. The job of this skill is to let you build the real React components without re-reading that 777-line file from scratch every time — the tokens and patterns are already extracted below.

## When you're building something new

1. Check `references/components.md` first — it's organized by component (buttons, cards, badges, preset picker, stat grid, code blocks, workspace sidebar, chat bubbles, commit/diff screen). If the thing you're building resembles one of these, copy its CSS and adapt the markup to React (`className` instead of `class`, controlled state instead of the prototype's raw DOM manipulation).
2. Check `references/tokens.md` for which color/font token applies. The important constraint here isn't "which colors exist" (that's a five-second lookup) — it's that **teal/amber/red have fixed meanings** (done·success / active·warning / error·danger) used consistently across the sidebar, badges, and diff view. Don't pick a color because it looks nice for a new use case; pick it because it matches one of those three meanings, or reuse a neutral (`--text-dim`, `--panel-*`) if it's none of them.
3. If neither reference covers the exact case, open `references/prototype.html` directly and search for the closest analogous screen — it's the full original source, kept verbatim so you can check exact markup structure or JS behavior (e.g. how the progressive-lock or edit-mode toggle actually works) rather than guessing.

## The tokens, already ported

`client/src/styles/tokens.css` already contains these as CSS custom properties — import it once at the app root (already done in `main.tsx`) and reference the variables directly (`var(--teal)`, `var(--panel-2)`, etc.) rather than hardcoding hex values in component styles. Full token list and semantics: `references/tokens.md`.

## Things that are true about this design system and worth knowing before you improvise

- **Dark-only.** This is not a light/dark adaptive theme — there's a single fixed dark palette (Unity inspector panel aesthetic). Don't add `prefers-color-scheme` handling.
- **Two font families, not a type scale.** Inter (`--sans`) for anything a human wrote (labels, descriptions, chat text). JetBrains Mono (`--mono`) for anything technical/precise (paths, step numbers, code, diffs). There's no third font.
- **Progressive lock, not hidden.** Screens/fields that aren't available yet (e.g. branch select before a repo is chosen) are shown *disabled*, not hidden — the user should see the whole shape of the flow with future steps visibly locked, per `docs/GameForge_Agent_UI_Spec_1.md` §2.
- **One primary action per view.** Only the single forward-moving button (Approve, 로그인, 전송, 연결 및 분석 시작) gets `.primary` (teal outline/text). Everything else — cancel, back, logout, reject — stays as a plain button. If you're tempted to make two buttons primary in the same view, that's a sign one of them isn't actually the primary action.
- **Read/edit toggle, not an always-editable field.** Markdown documents (analysis report, per-step docs) default to a read-only `pre.code` preview; clicking "✎ 수정" swaps in a `.code-editor` textarea whose border turns teal to signal "live editing now." See `references/components.md` for the exact swap pattern from the prototype's `enterEditMode`/`exitEditMode`.

For the full CSS and example markup for every component, see `references/components.md`. For the raw source if you need to check exact behavior or markup not covered above, see `references/prototype.html`.
