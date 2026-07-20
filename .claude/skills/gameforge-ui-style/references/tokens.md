# Design Tokens

Source of truth: `references/prototype.html` `:root` block (also already ported to `client/src/styles/tokens.css`). If the two ever drift, the prototype is canonical — update `tokens.css` to match, not the other way around.

```css
--bg-page: #161618;
--panel: #1e1e21;
--panel-2: #242428;
--panel-3: #2b2b30;
--border: #38383e;
--border-strong: #4a4a52;
--text: #e9e9ec;
--text-dim: #9c9ca4;
--text-mute: #6c6c74;
--teal: #3ecf9a;
--teal-bg: rgba(62, 207, 154, 0.12);
--amber: #f0a942;
--amber-bg: rgba(240, 169, 66, 0.12);
--red: #e5615f;
--red-bg: rgba(229, 97, 95, 0.12);
--radius: 8px;
--mono: 'JetBrains Mono', ui-monospace, monospace;
--sans: 'Inter', -apple-system, sans-serif;
```

## Surface hierarchy

Four background layers, each one step lighter than the last, used to show nesting depth (not for branding or decoration):

| Token | Used for |
|---|---|
| `--bg-page` | page background, outside all panels |
| `--panel` | top-level containers: appbar, cards, sidebar, file-list |
| `--panel-2` | content wells inside a panel: `ws-main`, stat tiles, code blocks, chat bubbles (agent side) |
| `--panel-3` | interactive surface hover/active states, disabled selects, tab pill background |

## Text hierarchy

| Token | Used for |
|---|---|
| `--text` | primary content, values, active labels |
| `--text-dim` | secondary descriptions, diff context lines |
| `--text-mute` | mono labels, placeholders, disabled/pending text |

## Status color semantics — fixed meanings, do not repurpose

This is the one rule in this design system that is load-bearing rather than aesthetic: **teal / amber / red always mean the same three things everywhere in the app**, per `docs/GameForge_Agent_UI_Spec_1.md` section 5. A user scanning the sidebar or a diff should be able to read color alone without reading labels.

| Color | Fixed meaning | Where it shows up |
|---|---|---|
| `--teal` | done / success / approved / new (added) | done step rows, success badges, primary button accent, `new` change-badge, diff `add` lines |
| `--amber` | active / in-progress / warning | active step rows, warning badges, `modified` change-badge |
| `--red` | error / danger / deleted | danger badges, `deleted` change-badge, diff `del` lines |
| `--text-mute` (gray) | pending / locked / disabled | pending step rows, disabled inputs |

If you need a new status indicator, map it to one of these three meanings rather than inventing a fourth color — the whole point of fixing the palette is that color alone carries meaning across the app.

## Fonts

- `--sans` (Inter) — all body text, labels, buttons, chat bubbles.
- `--mono` (JetBrains Mono) — anything technical/precise: step numbers, file paths, code blocks, diffs, `label-mono` micro-labels, badge-like counters (`STEP 02 / 16`).

Rule of thumb: if a human wrote it (a sentence, a description), use `--sans`. If it's a path, number, identifier, or code, use `--mono`.

## Dark-only, not adaptive

This is a single fixed dark theme (Unity inspector panel aesthetic), not a light/dark toggle. Don't add `prefers-color-scheme` branching or a light variant — there isn't one, and building one isn't in scope.
