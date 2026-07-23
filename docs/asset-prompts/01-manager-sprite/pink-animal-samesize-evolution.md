# Pink Animal Same-Size Evolution Prompt

## Purpose

This document records the approved direction from the 2026-07-17 character review session.
It is a replacement-character exploration branch, separate from the original electronic Lumi prompt.

The current best reference is:

- source generation: `call_z97P9uZ2ElI20evcQGicQRu9`
- local source file: `C:/Users/sun99/.codex/generated_images/019f6a9f-b65f-75c3-b6bd-4712fab8daee/call_z97P9uZ2ElI20evcQGicQRu9.png`
- `public/assets/lumi/character-2-pink-animal-cute-samesize-stage-1-4-v5.png`
- transparent/chroma-key processed copy: `public/assets/lumi/character-2-pink-animal-cute-samesize-stage-1-4-v5-chromakey.png`
- canonical manager slot reference copy: `public/assets/lumi/lumi-manager-reference-call-z97.png`

Planaria companion reference:

- source generation: `call_FC5eMPVVWE0EfZgjCbcenep4`
- local source file: `C:/Users/sun99/.codex/generated_images/019f6a9f-b65f-75c3-b6bd-4712fab8daee/call_FC5eMPVVWE0EfZgjCbcenep4.png`
- workspace copy: `public/assets/lumi/character-1-planaria-spirit-stage-1-4-v2-chromakey.png`

For animation production, use Stage 1 and Stage 2 only from both `call_z97P9uZ2ElI20evcQGicQRu9` and `call_FC5eMPVVWE0EfZgjCbcenep4`.

## Approved Direction

Use a cute pink-and-brown animal-like desktop pet based on the attached reference direction.
Do not make the evolution stages progressively larger. Keep all four stages close to the same body size and camera angle.

The evolution should feel like the same small companion becoming more polished, expressive, and lovable, not like a child creature growing into an adult.

## Core Traits

- Egg-like round body silhouette.
- Pink outer fur/body with cream face and belly.
- Warm brown lower cradle or diaper-like base.
- Small rounded paws and simple animal-like ears.
- Cute face with simple dark pixel eyes, tiny nose/mouth, and blush.
- Soft pixel shading, clean dark outline, readable at 64px.
- Pink/brown theme with gentle cream highlights.

## Evolution Rules

### Stage 1

Very simple egg-like baby form.
Minimal ears or side nubs, no visible feet or only tiny foot hints.
Keep the reference antenna/top charm if it helps continuity, but do not make it the focus.

### Stage 2

Base MVP form.
Add clear rounded ears, small front paws, and cute round feet.
Keep the same body scale as Stage 1.

### Stage 3

Do not enlarge the character.
Improve quality through animal traits: softer cheek fur, clearer paw pads, cleaner ears, better pixel shading, and a more refined silhouette.
Avoid adult proportions, long legs, body hair, or muscular limbs.

### Stage 4

Do not enlarge the character.
Add small premium-cute details only: tiny bow, subtle heart mark, softer tail, polished fur tufts, or cleaner highlights.
The character should still read as the same small mascot at the same age and size.

## Fixed View Rules

- Same front-facing or near-front-facing 3/4 angle across all stages.
- Same canvas size and character center.
- Same lower baseline.
- Same approximate silhouette height and width.
- No progressive zoom-in.
- No stage should look like a different species.

## Animation Readiness

- The final selected form must later support `idle`, `focused`, `happy`, `recovering`, `hover`, `hanging`, and `hiding` sprite sheets.
- Keep the body compact enough for a stable 64x64 frame and readable at desktop-icon scale.
- `hanging` should have an obvious small paw, ear, or body edge that can act as a stable grip point.
- `hiding` should support a cute full-body shy pose that can be placed behind an XP window layer; do not depend on cropped partial-peek art.
- Do not add loose accessories, dangling ribbons, oversized tails, or detached props that would jitter during window-edge animation.

## Prompt Template

```text
Create a production-quality pixel art character evolution sheet with four separate stages in one horizontal row. Use the pink animal-like egg-bodied desktop pet direction from public/assets/lumi/character-2-pink-animal-cute-samesize-stage-1-4-v5.png as the visual target. All four stages must keep nearly the same body size, same camera angle, same center point, and same lower baseline. Pink and cream fur body, warm brown cradle/diaper-like lower base, rounded cute ears, tiny paws, simple dark eyes, tiny nose and mouth, soft blush, clean dark outline, crisp pixel art. Stage 1 is a simple baby egg form, Stage 2 adds rounded ears and paws, Stage 3 adds refined animal cuteness and paw pads without getting bigger, Stage 4 adds small premium cute details such as a tiny bow, soft tail, or heart mark without getting bigger. No electronic decorations, no robot armor, no cyberpunk details, no adult body, no long legs, no body hair, no realistic animal anatomy, no text, no watermark, no UI elements.
```

## Negative Prompt

```text
progressively larger stages, adult form, long legs, hairy legs, muscular limbs, humanoid body, dress, skirt, anime girl, robot suit, electronic diaper panels, cyberpunk, neon circuitry, harsh sci-fi details, realistic animal, cat face, dog face, different species per stage, camera angle changes, zoom changes, inconsistent baseline, text, watermark, UI frame
```

## Acceptance Notes

- The v5 direction is preferred because it keeps the four-stage evolution cute without size escalation.
- Stage 3 and Stage 4 should communicate higher quality through polish, not larger scale.
- If a generated set feels like "a suddenly grown adult version," reject it and regenerate with stricter same-size constraints.
