# Electronic Manager Sprite Sheet Prompt

## Purpose

Create dynamic animation assets for Lumi, the electronic lifeform manager in the Windows XP desktop quest app. The canonical character reference is `public/assets/lumi-manager.png`; all generated animation sheets must preserve that identity.

For the separate pink animal-like replacement-character exploration, use `pink-animal-samesize-evolution.md` instead of this document.

## Canonical Lumi Reference

Use `public/assets/lumi-manager.png` as the primary visual source.

Preserve these traits:

- Pink electronic-biological outer body, cream face/body core, small blush pixels.
- Dark pixel outline and soft XP-era pixel shading.
- Small antenna with a glowing pixel module above the head.
- Side pink/ear-like modules and lower mechanical or wooden base pieces.
- Small glowing device panel near the lower body.
- Electronic lifeform feel: not a real animal, not a generic round mascot, not a robot suit.

## Fixed Animation Sheet Rules

- One state per file.
- Each state is a `4 frames x 1 row` horizontal sprite sheet.
- Each frame cell is exactly `64x64`.
- Lumi must keep the same scale, same center x, same lower baseline y, and same silhouette bounding box across all frames.
- Do not change camera angle, crop, perspective, or character proportions between frames.
- Keep movement subtle: 1 to 2 pixels for breathing, antenna glow, tiny facial shifts, or small base/device glow.
- Do not bake dialogue, UI text, labels, fake buttons, shadows, or background scenery into the sprite.
- Window interaction states use the same 4-frame `64x64` sheet rule, but they anchor to a window edge instead of a standing baseline.
- For `hanging` and `hiding`, do not bake a full XP window into the sprite. The React/CSS window layer should provide the edge, z-index occlusion, or optional clipping surface.
- For `hanging`, keep the same grip point or top anchor across all frames.
- For `hiding`, keep Lumi fully inside every frame. The app places the complete sprite behind the XP window layer, so the window hides part of the character at runtime.

## State Prompts

### `lumi-idle-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi in idle waiting state. Preserve the same pink electronic-biological body, cream core, side modules, lower mechanical/wooden base, small glowing lower device panel, and antenna light. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Gentle breathing and tiny antenna glow only. Keep identical character scale, center x, lower baseline y, silhouette bounding box, and frame padding in all frames. No text, no UI frame, no speech bubble.
```

### `lumi-focused-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi in focused quest-running state. Preserve Lumi's original silhouette, side modules, lower mechanical/wooden base, antenna light, pink and cream palette, and small glowing device panel. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Focused state should show gentle concentration through eyes, antenna glow, or tiny device-panel pulse; do not make Lumi angry. Keep identical scale, center x, lower baseline y, bbox, and padding across all frames.
```

### `lumi-happy-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi in happy completion state. Preserve the original electronic lifeform design, not a new mascot. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Happy state may use a tiny 1px bounce, warmer device glow, and soft pixel sparkle near the antenna. Keep same center x, lower baseline y, character scale, silhouette bbox, and frame padding in all frames.
```

### `lumi-recovering-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi in gentle recovering and rebalancing state. Preserve original silhouette, side modules, lower base pieces, antenna, and lower device panel. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Show calm repair/rebalance through a subtle device-panel pulse or tiny circular light; do not make Lumi sick, punished, weak, or sad. Keep same center x, baseline y, scale, bbox, and padding in every frame.
```

### `lumi-hover-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi reacting to hover attention. Preserve original electronic lifeform identity exactly. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Hover state should show a tiny antenna wiggle, eye attention, or soft lower-device glow. Do not scale up or shift the body. Keep identical center x, lower baseline y, scale, bbox, and padding across all frames.
```

### `lumi-resting-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi resting. Preserve original body, antenna, side modules, lower base, and device panel. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Resting state should feel calm with dim antenna/device glow and relaxed eyes. No letters, no Z text, no speech bubble. Keep exact center x, baseline y, scale, bbox, and padding.
```

### `lumi-hanging-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi hanging from the edge of an app window. Preserve Lumi's original electronic lifeform identity, pink and cream palette, side modules, antenna light, and small lower device panel. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. Lumi should look like it is gently gripping or draping over an implied window edge; the full XP window must not be drawn into the sprite. Keep the same scale, same center x, same top grip anchor point, same visible silhouette bbox, and same frame padding across all frames. Motion is a tiny 1 to 2 pixel sway, antenna wiggle, or device glow only. No text, no UI frame, no speech bubble, no shadow.
```

### `lumi-hiding-sheet.png`

```text
Using public/assets/lumi-manager.png as the exact character reference, create a production-quality 4-frame horizontal pixel art sprite sheet of Lumi doing a full-body shy hiding motion for placement behind an app window. Preserve the same electronic lifeform design, pink and cream body, side modules, antenna light, and small glowing lower device panel. One row, four equal 64x64 frame cells. Transparent background or flat removable chroma-key background. The full Lumi character must remain visible inside each frame; do not crop the body and do not draw the window edge. React/CSS will place this complete sprite behind the XP window by z-index so the window occludes part of it at runtime. Show a cautious but playful tuck, lean, blink, antenna wiggle, or tiny device glow movement. Keep the same scale, same center x, same visible bbox, and same frame padding across all frames. No text, no UI frame, no speech bubble, no shadow.
```

## Growth Images

- `lumi-growth-01.png`: the current canonical Lumi form.
- `lumi-growth-02.png`: same Lumi with one subtle accessory or brighter device glow.
- `lumi-growth-03.png`: same Lumi with a small memory charm or stronger antenna glow.

Growth images are single `64x64` transparent PNGs. They are registered in the manifest before any visible UI use.

## Negative Prompt

```text
generic round mascot, different character design, realistic animal, cat, dog, monster, human, anime girl, robot armor, cyberpunk, neon, 3d render, text, labels, UI frame, speech bubble, watermark, camera zoom, inconsistent scale, inconsistent baseline, inconsistent center point, cropped antenna, missing lower mechanical base, missing glowing lower device panel, changed side modules
```

## Verification

Use `asset-quality-verifier` before accepting an asset:

- Compare against `public/assets/lumi-manager.png`.
- Confirm identity traits are preserved.
- Confirm frame geometry, center, baseline, and bbox are stable.
- Confirm first frame works as a reduced-motion fallback.
