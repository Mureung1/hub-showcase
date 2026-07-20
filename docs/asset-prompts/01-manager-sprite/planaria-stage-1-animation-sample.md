# Planaria Stage 1 Animation Sample

## Purpose

Pilot asset set for expanding one selected creature base into the shared dynamic MVP animation states before generating all 11 creatures.

## Source

- Base source call: `call_FC5eMPVVWE0EfZgjCbcenep4`
- Local generated source: `C:/Users/sun99/.codex/generated_images/019f6a9f-b65f-75c3-b6bd-4712fab8daee/call_FC5eMPVVWE0EfZgjCbcenep4.png`
- Extracted reference: `public/assets/lumi/animation-bases/planaria-stage-1-base-reference.png`
- Review reference: `public/assets/_review/planaria-stage-1-base-reference-review.png`

## Output

Each output is a `4 frames x 1 row` sprite sheet normalized to `256x64`, with each frame occupying a `64x64` cell.

- `public/assets/lumi/planaria-stage-1/planaria-stage-1-idle-sheet.png`
- `public/assets/lumi/planaria-stage-1/planaria-stage-1-focused-sheet.png`
- `public/assets/lumi/planaria-stage-1/planaria-stage-1-happy-sheet.png`
- `public/assets/lumi/planaria-stage-1/planaria-stage-1-recovering-sheet.png`
- `public/assets/lumi/planaria-stage-1/planaria-stage-1-hover-sheet.png`
- `public/assets/lumi/planaria-stage-1/planaria-stage-1-hanging-sheet.png`
- `public/assets/lumi/planaria-stage-1/planaria-stage-1-hiding-sheet.png`

Review sheet:

- `public/assets/_review/planaria-stage-1-animation-sheets-sample-contact.png`

Reference frames:

- Contact sheet: `public/assets/_review/planaria-stage-1-reference-frames-contact.png`
- Individual frame-0 PNGs: `public/assets/lumi/planaria-stage-1/reference-frames/`
- Contact sheet order: `idle`, `focused`, `happy`, `recovering`, `hover`, `hanging`, `hiding`

## Prompt Pattern

Use the extracted Stage 1 base reference as the exact character reference for every state.

Common constraints:

- Preserve the tiny floating planaria Stage 1 identity: teardrop or leaf body, cream core, mint/cyan translucent shell, tiny digital eyes, small antenna bead.
- One state per file.
- Exactly four horizontal frames.
- Each frame is designed for a `64x64` cell.
- Keep the same scale, center x, lower float anchor, bbox, and padding across frames.
- Limit motion to 1-2 pixels.
- Use flat `#00ff00` chroma-key background for removal.
- No text, labels, UI frame, speech bubble, scenery, cast shadow, or loose accessory.

State notes:

- `idle`: gentle floating and antenna glow.
- `focused`: steadier eyes, brighter inner core pulse, not angry.
- `happy`: tiny buoyant bounce, warm core glow, small antenna sparkle.
- `recovering`: calm repair or rebalance pulse, not sick or punished.
- `hover`: attention response through antenna wiggle and eye/core glow.
- `hanging`: stable top grip anchor; do not bake a full XP window into the sprite.
- `hiding`: stable peek edge alignment for React/CSS clipping.

## Verification Notes

- After generation, the source images were sliced into four frames, chroma-key removed, and normalized to `256x64`.
- Frame centers were post-aligned to reduce animation jitter.
- `hiding` uses a stable right-side peek edge instead of center alignment.
- This is a sample set for visual review, not yet registered as the runtime canonical Lumi manifest.

## Runtime Playback Contract

Use this contract when connecting the sample to React or when producing the same state set for the other 10 creatures.

### Frame Geometry

- Sprite sheet size: `256x64`.
- Frame count: `4`.
- Frame order: left to right, frame indexes `0`, `1`, `2`, `3`.
- Frame cell: `64x64`.
- Frame `0` is the reference frame and reduced-motion fallback for every state.
- Rendered CSS box should be fixed at `64px x 64px`; do not let image bbox resize the layout.
- Use nearest-neighbor image scaling when enlarged:

```css
.pet-sprite {
  width: 64px;
  height: 64px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
```

### Background Position

If the sheet is used as a CSS background image, advance frames by shifting `background-position-x`.

```text
frame 0: background-position:    0px 0;
frame 1: background-position:  -64px 0;
frame 2: background-position: -128px 0;
frame 3: background-position: -192px 0;
```

Equivalent frame crop rectangles:

```text
frame 0: x=0,   y=0, width=64, height=64
frame 1: x=64,  y=0, width=64, height=64
frame 2: x=128, y=0, width=64, height=64
frame 3: x=192, y=0, width=64, height=64
```

### Recommended Timing

Use subtle looping. These are implementation defaults, not art-generation requirements.

| State | FPS | Loop | Placement anchor |
|---|---:|---|---|
| `idle` | 4 | yes | center x + lower float anchor |
| `focused` | 6 | yes | center x + lower float anchor |
| `happy` | 6 | yes | center x + lower float anchor |
| `recovering` | 4 | yes | center x + lower float anchor |
| `hover` | 7 | yes | center x + lower float anchor |
| `hanging` | 6 | yes | top grip anchor |
| `hiding` | 5 | yes | right peek edge |

### Placement Rules

Default states (`idle`, `focused`, `happy`, `recovering`, `hover`) should be placed inside the manager character slot as a `64x64` element. Align the element by its fixed box, not by the transparent bbox inside the PNG.

```text
manager slot center x == sprite element center x
manager slot baseline/float anchor == sprite element bottom reference line
```

For this sample, the normalized default-state first frames use a visible bbox bottom around `y=60`, leaving a small transparent safety margin below. Keep that safety margin when generating the other creatures so bounce/floating motion does not clip.

`hanging` is an interaction state. Place the `64x64` sprite so its top grip anchor meets the React/CSS window edge. The sprite may visually overlap the edge, but the full XP window chrome must be rendered by the app, not baked into the sheet.

```text
window edge y == sprite element top + 5px approximate grip line
window edge x == sprite element center x
```

`hiding` is a peek interaction state. Place the `64x64` sprite behind a window layer or clipping mask. For this sample, the visible right peek edge is stable around `x=53` in frame 0.

```text
window mask edge x == sprite element left + 53px approximate peek edge
```

### Reduced Motion

When `prefers-reduced-motion: reduce` is active, render only frame `0` for the selected state.

```text
state frame = 0
background-position = 0px 0
animation-play-state = paused
```

Do not swap to a different PNG for reduced motion unless the manifest explicitly provides one.

### Sample Metadata

```ts
const planariaStage1Animations = {
  idle: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-idle-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 4, loop: true, reducedMotionFrame: 0 },
  focused: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-focused-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 6, loop: true, reducedMotionFrame: 0 },
  happy: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-happy-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 6, loop: true, reducedMotionFrame: 0 },
  recovering: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-recovering-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 4, loop: true, reducedMotionFrame: 0 },
  hover: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-hover-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 7, loop: true, reducedMotionFrame: 0 },
  hanging: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-hanging-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 6, loop: true, reducedMotionFrame: 0 },
  hiding: { src: "/assets/lumi/planaria-stage-1/planaria-stage-1-hiding-sheet.png", frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 5, loop: true, reducedMotionFrame: 0 },
} as const;
```

### Quality Gate For The Next 10 Creatures

- The first frame must match the extracted Stage 1 or Stage 2 base identity.
- Every state must remain a `256x64` sheet with four `64x64` frames.
- Default states should keep center x within about `1px` after normalization.
- Default states should keep the lower float anchor within about `1px`.
- `hanging` should keep its top grip anchor within about `1px`.
- `hiding` should keep its peek edge within about `1px`.
- If generation creates a large ring, sparkle, or window-edge mark that changes the bbox too much, either regenerate that state or post-align it before accepting.
