---
name: run-fridge-recipe-app
description: Run, preview, and screenshot the 자취생 냉장고 레시피 mobile mockup and its vintage hand-drawn stylesheet (styles.css). Use when asked to run / open / launch / preview / render / screenshot the fridge-recipe-app, or to reuse/verify the vintage-sketch design tokens (muted mustard/terracotta/olive palette, hand-drawn rough borders, Gaegu handwriting font).
---

# run-fridge-recipe-app

Static, single-screen phone mockup (390×844) for the 자취생 냉장고 레시피 app.
It's a **static web page** — no build, no server. The design lives in `styles.css`
(a drop-in stylesheet: tokens + all component classes). `index.html` is the same
screen with the CSS inlined; `.claude/skills/run-fridge-recipe-app/demo.html` is the
same markup but `<link>`-ing `styles.css` to prove the stylesheet works standalone.

Because it's static, the "driver" is **headless Chrome/Edge → PNG**, wrapped in
`screenshot.ps1`. All paths below are relative to the unit
(`C:\Users\user\.local\bin\fridge-recipe-app`).

## Prerequisites

Chrome or Edge (either works). Both are present on this machine; the driver
auto-detects them. No npm/node, no server, no other installs.

## Run — agent path (screenshot the mockup)

Render `styles.css` via the standalone demo and view `preview.png`:

```powershell
$d = ".claude\skills\run-fridge-recipe-app"
powershell -File "$d\screenshot.ps1" -Html "$d\demo.html" -Out "$d\preview.png"
```

Or screenshot the self-contained `index.html` (default when `-Html` is omitted):

```powershell
powershell -File ".claude\skills\run-fridge-recipe-app\screenshot.ps1"
```

Then open the PNG that lands next to the script (`preview.png`) — it renders the
full phone frame at 2× (960×1880). Options: `-Width`, `-Height` (CSS px of the
headless window), `-Html`, `-Out`.

The driver: finds Chrome/Edge, renders in a throwaway profile with
`--headless=new --force-device-scale-factor=2 --virtual-time-budget=4000`
(the budget lets the Gaegu webfont and the SVG `#roughen` filter settle before
the shot), writes the PNG, cleans up the temp profile.

## Run — human path

```powershell
Start-Process ".\index.html"     # opens in the default browser
```

Useful for scrolling/interaction a single screenshot can't show; not scriptable.

## Reusing the style (styles.css) in a new page

`styles.css` is self-contained but needs two companions in the HTML — both are
in `demo.html` to copy from:

1. Gaegu font in `<head>`:
   `<link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap" rel="stylesheet">`
2. The `#roughen` SVG filter inline at the top of `<body>` (the `.thumb`,
   `.tab.center`, and `.banner::before` rules reference it for the hand-drawn edges).

Design language, in short: muted toned-down primaries (mustard `#E4DB6C`,
terracotta, olive, ocher, denim, cream) on a muted-teal background; warm charcoal
text (never pure black); every fill gets a **darker same-hue** border via a
`--line-*` token; irregular/blob `border-radius`; chunky `Npx Npx 0` offset shadows
(deeper `8px 8px 0` on the hero card + center button). Full token list is the
`:root` block at the top of `styles.css`.

## Gotchas

- **The SVG `#roughen` filter must be inline in the same document.** `styles.css`
  references `filter: url(#roughen)`; without the `<svg><filter id="roughen">…`
  block in `<body>`, thumbnails/banner render as plain rectangles (no crash, just
  flat). `demo.html` includes it.
- **`demo.html` links `styles.css` with `../../../styles.css`** — three levels up
  from the skill dir to the unit root. If you move either file, fix that path.
- **Gaegu is a Google webfont → needs network.** Offline, headless Chrome silently
  falls back to a system sans and the handwriting look is lost (layout unaffected).
  `--virtual-time-budget=4000` is what makes the font reliably appear when online.
- **`--screenshot` captures the window viewport, not the full scrollable page.**
  The phone's `.screen` scrolls internally, so one shot shows the top of the list
  plus the fixed bottom tab bar; the last recipe rows sit below the fold. Increase
  `-Height`, or rely on the human path, to see them. (Default 460×940 frames the
  whole phone frame nicely.)
- **`--force-device-scale-factor=2`** means the PNG is 2× the `-Width`/`-Height`
  numbers. Drop it to 1 for pixel-exact sizing.

## Troubleshooting

- `No Chrome/Edge found` → edit the `$candidates` list in `screenshot.ps1` to your
  browser's path.
- Blank / all-white PNG → the HTML path was wrong or the file URL didn't resolve;
  the script prints the resolved `file:///…` — confirm it points at a real file.
- Fonts look like a plain sans → you're offline (see Gotchas); the render is still
  valid, just without Gaegu.
