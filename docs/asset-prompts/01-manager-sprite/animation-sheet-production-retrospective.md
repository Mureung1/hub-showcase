# Animation Sheet Production Retrospective

## Summary

The current harness and folder structure are good enough for connecting sprite sheets to React, but they were not yet strict enough for producing high-quality animation sheets with AI image generation.

The main issue was not just folder organization. The issue was that source assets, prompts, generated review boards, final sprite sheets, and verification criteria were treated as if they were one linear pipeline. In practice, the final review target should be the production sprite sheet itself.

## What Went Wrong

### 1. The folders separate asset types, but not production stages

Current structure:

```text
public/assets/lumi/
public/assets/lumi/<pet-id>-stage-1/
public/assets/lumi/animation-bases/
public/assets/_review/
docs/asset-prompts/01-manager-sprite/
```

This is useful, but the boundary was not explicit enough:

- `animation-bases/` contains extracted references.
- `<pet-id>-stage-1/` looks like production-ready sheets.
- `_review/` contains candidates, contact sheets, and generated boards.

Because of that, procedural placeholder sheets and final-intent sheet candidates can look equally official once they land in `public/assets/lumi/<pet-id>-stage-1/`.

Correction:

- Keep final canonical sheets in `public/assets/lumi/<pet-id>-stage-1/`.
- Keep experiments in `public/assets/_review/<pet-id>/` or versioned review filenames.
- Use `public/assets/lumi/<pet-id>-stage-1-v2/` only for a selected replacement candidate, not early drafts.
- Do not promote any image that was cropped from a loose review board into canonical production.

### 2. The first generation optimized geometry before acting

The procedural sheet generator created valid PNG geometry:

- `64x64` cells
- expected sheet width and height
- stable center and baseline
- manifest-compatible paths

But it only transformed one static base image. That produced motion sheets that passed technical verification but failed character acting:

- `happy` did not look happy.
- `focused` looked like idle.
- `recovering` looked like idle.
- `walk`, `run`, and `climbing` had weak silhouette changes.
- `climbing` did not show the back.

Correction:

- Treat procedural generation as a layout smoke test only.
- Final candidate generation must be prompt-driven by motion acting requirements.
- Technical verification and visual acting verification must be separate checklist items.

### 3. The prompt was too broad for a production sheet

The all-in-one 10-row prompt produced the best unified style, but it did not produce a crop-safe grid. The image looked good as a motion board, but rows and cells were not strict enough for automatic `64x64` extraction.

The individual motion prompts produced clearer motion direction, but they risked style drift because each motion was generated separately.

Correction:

- Do not use generated direction boards as production sources.
- Generate the actual production sprite sheet for one motion at a time.
- Review that production sheet directly at native size, zoomed size, and runtime playback speed.
- If a motion fails, regenerate that motion sheet directly instead of cropping from a larger board.

### 4. Motion direction rules were under-specified

The plan said `run`, `walk`, `jump`, and `climbing`, but did not specify enough camera rules at first.

Examples of missing constraints:

- `run` and `walk` must face the same direction.
- `jump` should keep the same side direction and must not rotate to rear view in the middle.
- `climbing` should be rear or rear 3/4 and must not face the camera.
- `happy`, `focused`, and `recovering` must read correctly in frame `0` for reduced motion.

Correction:

- Every motion needs:
  - view direction
  - forbidden view direction
  - frame `0` meaning
  - silhouette change target
  - whether travel is baked or handled by React/Canvas

### 5. Verification checked dimensions before visual quality

`npm.cmd run verify:sprites` is useful, but it can only confirm structural correctness. It cannot decide whether a pet looks focused, happy, or climbing.

Correction:

- Keep `verify:sprites` for file existence and dimensions.
- Add visual review against the production sheet itself:
  - native sheet preview
  - runtime playback preview
  - frame `0` preview
  - 32/48/64px scale preview
  - per-frame bounding box and anchor overlay when possible
- Do not promote a sheet to canonical paths until both checks pass.

## Recommended Production Workflow

### Step 1. Approve the character base

Use:

```text
public/assets/lumi/animation-bases/<pet-id>-stage-1-base-reference.png
```

Check:

- no extra components
- correct Stage 1 only
- readable at 64px
- identity preserved

### Step 2. Generate one production motion sheet

Save to:

```text
public/assets/lumi/<pet-id>-stage-1/<pet-id>-stage-1-<motion>-sheet.png
```

Purpose:

- runtime-ready source frames
- visual acting
- state distinction
- direction consistency
- stable character scale inside the PNG

Rules:

- one motion per PNG
- one horizontal row
- exact `64x64` cells
- transparent background
- sheet width equals `sourceFrameCount * 64`
- character scale and visible body size stay consistent across every source frame in the sheet

### Step 3. Regenerate weak sheets directly

Save replacements to the same motion path or a versioned candidate path:

```text
public/assets/lumi/<pet-id>-stage-1/<pet-id>-stage-1-<motion>-sheet.png
public/assets/_review/<pet-id>-<motion>-sheet-vN.png
```

For example:

- `pink-manager-jump-v2-right-facing.png`

### Step 4. Verify twice

Run technical verification:

```powershell
npm.cmd run verify:sprites
```

Then visual verification:

- production sheet at native size
- 4x zoom
- 32/48/64px preview
- frame `0` reduced-motion preview
- motion direction review
- scale and anchor drift review

## Pink Manager Current Decision

Accepted direction:

- Base reference: `public/assets/lumi/animation-bases/pink-manager-stage-1-base-reference.png`
- Preferred board: `public/assets/_review/pink-manager-motion-board-v3-refined-from-call-pj.png`
- Jump replacement: `public/assets/_review/pink-manager-jump-v2-right-facing.png`

Reason:

- V3 keeps the best overall style, expression, and motion separation.
- The separate jump candidate fixes the V3 jump row's rear-view mistake and keeps the side direction consistent with `run` and `walk`.

Do not promote the cropped V3 board output to canonical production. Use V3 only as acting/style reference, then regenerate each pink-manager motion as a direct production sprite sheet.
