# Stage 1 Pet Interaction Motion Contract

## Scope

This contract covers the first generated interaction animation pass for 9 Stage 1 pets.

Included pets:

- `pink-manager`
- `white-headed-long-tailed-tit`
- `costasiella-kuroshimae`
- `sea-bunny-slug`
- `platypus`
- `axolotl`
- `glass-frog`
- `fried-egg-jellyfish`
- `yeti-crab`

Excluded from this batch:

- `planaria`: keep the existing Stage 1 sample set.
- `satanic-leaf-tailed-gecko`: needs a separate simplified silhouette pass.
- `hover`: excluded for these 9 pets. Existing Planaria hover remains active.

## Output Layout

- Output directory: `public/assets/lumi/<pet-id>-stage-1/`
- File pattern: `<pet-id>-stage-1-<motion>-sheet.png`
- Frame cell: `64x64`
- Sheet height: `64`
- Sheet width: `sourceFrameCount * 64`
- Background: transparent PNG.
- Do not bake XP window chrome, ladder graphics, text, shadows, labels, or UI controls into the sprite.

Production review target:

- Review the actual production sprite sheets in `public/assets/lumi/<pet-id>-stage-1/`.
- Do not generate a separate direction/contact board as the source for later crop.
- Optional review pages or contact previews may display existing production sheets together, but they are not source assets and must not be cropped into runtime sheets.

Stage 1 extracted base references:

- `public/assets/lumi/animation-bases/<pet-id>-stage-1-base-reference.png`

## Motion Set

Each included pet has these 10 motions:

| Motion | Source frames | Runtime use |
|---|---:|---|
| `idle` | 4 | Calm waiting loop |
| `focused` | 4 | Quest-running concentration loop |
| `happy` | 6 | Completion bounce loop |
| `recovering` | 4 | Gentle rebalancing loop |
| `hanging` | 6 | Window-edge interaction loop |
| `hiding` | 6 | Window-behind peek loop |
| `run` | 6 | Fast pet movement loop; actual x/y movement is React/Canvas state |
| `jump` | 6 | One-shot hop arc; actual y movement can be layered in React/Canvas |
| `walk` | 6 | Slow pet movement loop with runtime neutral-frame repeats |
| `climbing` | 6 | Ladder/edge climbing loop; ladder is UI layer, not baked image |

## Playback Metadata

Manifest fields must describe both source frame geometry and runtime rhythm:

```ts
{
  frameWidth: 64,
  frameHeight: 64,
  frameCount: sourceFrameCount,
  sheetWidth: sourceFrameCount * 64,
  sheetHeight: 64,
  fps,
  loop,
  reducedMotionFrame: 0,
  playbackFrames?: [{ frame: 0 }, { frame: 1 }, ...],
}
```

`frameCount` is the number of source cells in the PNG. `playbackFrames` is the runtime sequence. It may repeat a neutral frame, play frames in reverse, hold a frame, or mirror a frame with `mirrorX`.

Examples:

```ts
walk: {
  frameCount: 6,
  playbackFrames: [
    { frame: 0 },
    { frame: 1 },
    { frame: 0 },
    { frame: 2 },
    { frame: 0, mirrorX: true },
    { frame: 3 },
    { frame: 0, mirrorX: true },
    { frame: 4 },
    { frame: 0 },
    { frame: 5 },
  ],
}

jump: {
  frameCount: 6,
  loop: false,
  playbackFrames: [
    { frame: 0 },
    { frame: 1 },
    { frame: 2, hold: 2 },
    { frame: 3 },
    { frame: 4 },
    { frame: 5, hold: 2 },
  ],
}
```

## Anchor Rules

- Default floating states: anchor around `x=32, y=58`.
- `hanging`: stable top grip anchor around `x=32, y=5`.
- `hiding`: stable peek edge around `x=53, y=32`.
- `climbing`: stable grip anchor; the ladder or window edge belongs to the UI layer.
- Keep the creature center, apparent scale, and lower baseline stable unless the state intentionally bounces or jumps.
- Within one PNG sheet, the character's visible body size must remain consistent across all source frames.
- For bounce, jump, hiding, or hanging, motion may change pose and position, but it must not change the character's scale. Use empty canvas space and anchor metadata for movement instead of making the pet larger or smaller.
- No frame may crop antennae, ears, glow, feet, tail, gills, claws, or other identity-defining parts unless the motion is intentionally a peek/hiding partial-visibility state.

## Creature Motion Direction

- `pink-manager`: preserve the egg-like pink/cream body, antenna bead, pointed cute ears, tiny rounded feet, blush, and warm brown cradle/base. Motions must be acted, not just nudged:
  - `idle`: front view, relaxed dot eyes, tiny breathing, antenna light pulse.
  - `focused`: front view, visibly focused eyes or small determined brow pixels, body leans slightly forward, antenna steady and brighter.
  - `happy`: front view, clear joy through crescent/closed happy eyes, stronger blush, ears perk up, small celebratory bounce. It must read happy even as frame `0`.
  - `recovering`: front view, gentle rebalancing, softened tired eyes, slight wobble or one paw/device-panel check. Do not make it punished, sick, or identical to idle.
  - `hanging`: front or slight top angle, tiny paws/ears gripping an implied top window edge. Do not draw the window.
  - `hiding`: partial side peek from behind an implied vertical edge, one eye and ear visible, playful/cautious.
  - `walk`: right-facing or right 3/4 view only, same direction in all frames, short-foot toddle cycle with alternating rounded feet.
  - `run`: right-facing or right 3/4 view only, same direction as `walk`, lower body lean and faster foot cycle. Do not mirror between left/right inside the source sheet.
  - `jump`: front or right 3/4 view, squash anticipation, airborne frame, soft landing.
  - `climbing`: rear or rear 3/4 view; the back of the head/body and rear ears must be visible, with small paws gripping an implied ladder/window edge. Do not face the camera, and do not draw a ladder.
- `white-headed-long-tailed-tit`: cotton-ball hop-walk, tiny feather flick, perch-like climb.
- `costasiella-kuroshimae`: leaf cerata wiggle, slow glide, sticky leaf-body climb.
- `sea-bunny-slug`: soft glide, rhinophore response, jelly-like bounce.
- `platypus`: awkward waddling, low fast run, bill/front-foot climbing.
- `axolotl`: slow water-walk, gill flick, soft floating jump.
- `glass-frog`: tiny crawl, toe-pad climbing, compact frog hop.
- `fried-egg-jellyfish`: bell pulse drift, swim dash, float-climb along an edge.
- `yeti-crab`: side scuttle, big fuzzy claw alternation, small cheering arm motion.

## Verification

Run:

```powershell
npm.cmd run verify:sprites
```

The verifier checks:

- Planaria sample sheets still exist.
- 9 pets x 10 motions exist.
- Sheet width equals `frameCount * 64`.
- Sheet height equals `64`.
- Runtime `playbackFrames` only reference valid source frame indexes.
- FPS, loop, and anchor metadata are present in the verification output.

Visual review checklist:

- Open the production sheet itself, for example `public/assets/lumi/<pet-id>-stage-1/<pet-id>-stage-1-<motion>-sheet.png`.
- Check 32/48/64px readability.
- Check that motion reads as pet behavior, not just a static icon.
- Check center, baseline, grip anchor, peek edge, and visible body-size drift.
- Confirm frame `0` still communicates the state for reduced motion.

## Pink Manager Regeneration Prompt V2

Use this when regenerating `pink-manager` motion art from the Stage 1 base reference.

Current selected review direction:

- Preferred board: `public/assets/_review/pink-manager-motion-board-v3-refined-from-call-pj.png`
- Jump replacement candidate: `public/assets/_review/pink-manager-jump-v2-right-facing.png`
- Combined review image: `public/assets/_review/pink-manager-motion-board-v3-jump-fixed-review.png`
- Extracted selected sheets: `public/assets/lumi/pink-manager-stage-1-v2/pink-manager-stage-1-*-sheet.png`
- Extracted selected contact: `public/assets/_review/pink-manager-stage-1-v2-contact.png`

These are review candidates, not canonical production sheets. The selected V3 board rows and right-facing jump replacement were extracted into `pink-manager-stage-1-v2/` for investigation, but that crop result should not be promoted. Use those files only as style/acting references while regenerating each motion as a direct production sprite sheet. See `animation-sheet-production-retrospective.md` for the production workflow correction.

Updated production decision:

- Do not use a generated motion board or contact sheet as the crop source.
- Regenerate each motion as its own production sprite sheet.
- The sheet itself is the review artifact.
- Keep every frame in the sheet at the same character scale, same canvas size, same pixel-art resolution, and same identity-defining silhouette size.
- If a sheet fails visual review, regenerate that motion sheet directly instead of editing a board and cropping again.

```text
Use case: stylized-concept
Asset type: production pixel art sprite sheet for one desktop pet motion
Input image role: Image 1 is the exact character identity reference for pink-manager Stage 1.

Create one clean production pixel art sprite sheet for the same character and one specified motion. Preserve the egg-like pink and cream body, warm brown cradle/base, tiny rounded feet, pointed cute ears, blush, small dot face, and antenna bead. The character must remain a cute animal-like desktop pet, not robotic, not humanoid, not older, and not larger.

Sheet layout:
- One horizontal row only, no text labels inside the image.
- Equal 64x64 frame cells.
- Sheet height exactly 64px.
- Sheet width equals sourceFrameCount * 64px.
- idle/focused/recovering use 4 frames.
- happy/hanging/hiding/run/jump/walk/climbing use 6 frames unless the manifest specifies a different count.
- Keep generous transparent or flat #00ff00 chroma-key padding around each frame.
- Character scale must stay identical across all frames in this PNG.
- The visible body bounding box should remain the same size across frames; pose may change, scale may not.
- Keep the same center, anchor, baseline, and frame padding unless the motion intentionally uses a documented top grip or peek edge anchor.

Motion acting:
- idle: front view, relaxed dot eyes, tiny breathing, antenna light pulse.
- focused: front view, visibly focused eyes or small determined brow pixels, slight forward lean, antenna steady and brighter.
- happy: front view, clearly happy crescent/closed eyes, stronger blush, ears perked, small bounce. Frame 0 must already read happy.
- recovering: front view, gentle rebalancing, softened tired eyes, tiny wobble or one paw checking the lower panel. Calm, not punished or sick.
- hanging: front or slight top angle, small paws gripping an implied top edge. Do not draw the edge or window.
- hiding: partial side peek from behind an implied vertical edge, one eye and one ear visible, playful/cautious. Do not draw the edge or window.
- run: right-facing or right 3/4 view only, all frames face the same direction, low fast toddle, body leans forward, tiny feet alternate. Do not mirror left/right inside the source row.
- jump: squash anticipation, airborne frame, soft landing, same character identity.
- walk: right-facing or right 3/4 view only, same direction as run, slower short-foot toddle, alternating tiny rounded feet. Do not mirror left/right inside the source row.
- climbing: rear or rear 3/4 view. Show the back of the body/head and rear ears, tiny paws reaching upward as if climbing an invisible ladder. Do not face the camera. Do not draw a ladder.

Style:
- crisp high-quality pixel art, readable at 32/48/64px
- soft pink, cream, warm brown palette
- no labels, no text, no watermark, no UI frame, no ladder, no XP window, no speech bubble, no shadow
- no random accessories, no large scale change, no adult proportions, no humanoid clothing
```
