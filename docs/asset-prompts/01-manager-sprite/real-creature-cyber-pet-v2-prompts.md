# Real Creature Cyber Pet V2 Prompts

## Purpose

V2 generation queue for the 9 real-creature candidates.

## Animation Base Selection

Use `call_5sUTBQlinROYVyU6ME7HGChS` as the official source contact sheet for the 9 real-creature candidates.

- Local source file: `C:/Users/sun99/.codex/generated_images/019f6a9f-b65f-75c3-b6bd-4712fab8daee/call_5sUTBQlinROYVyU6ME7HGChS.png`
- Workspace review copy: `public/assets/_review/real-creature-candidates-stage-1-4-v2-contact.png`
- For animation production, use only Stage 1 and Stage 2 from this sheet as base forms.
- Stage 3 and Stage 4 are no longer active animation bases because the forms are too similar or risk unnecessary regeneration.
- Stage 1 and Stage 2 remain the animation bases. The current implemented batch expands Stage 1 only for 9 selected pets, excluding planaria, gecko, and `hover`.
- Use `planaria-stage-1-animation-sample.md` as the reference contract for animation sheet generation, post-alignment, playback metadata, reduced-motion frame `0`, and placement anchors.
- Use `stage-1-pet-interaction-motion-contract.md` for the 9-pet Stage 1 interaction batch: `idle`, `focused`, `happy`, `recovering`, `hanging`, `hiding`, `run`, `jump`, `walk`, and `climbing`.

Shared rule:

- Preserve the V1 Stage 1 and Stage 2 direction.
- Stage 1 remains intentionally small.
- Stage 2, Stage 3, and Stage 4 keep the same size, center, lower baseline, camera angle, and rough footprint.
- For 8 non-gecko candidates, Stage 3 and Stage 4 need a visibly stronger detail upgrade without getting bigger.
- For the leaf-tailed gecko, V2 needs a much simpler silhouette.
- Choose silhouettes that can later support the shared dynamic MVP states and pet interaction motions: `idle`, `focused`, `happy`, `recovering`, `hover`, `hanging`, `hiding`, `run`, `jump`, `walk`, and `climbing`.
- `hanging` needs a stable top/grip anchor. `hiding` must stay full-body inside the frame; the app window will occlude the complete sprite with z-index. Do not add loose accessories that would jitter or be hard to place behind a window.
- Planaria sample sheets stay `256x64` with four `64x64` frames. The 9-pet Stage 1 interaction batch uses variable source frame counts: every cell is `64x64`, sheet height is `64`, and sheet width is `sourceFrameCount * 64`. Default states align by center x and lower float anchor; `hanging` and `climbing` align by top grip anchor; `hiding` keeps a stable full-body bbox for behind-window placement. Keep anchor drift within about 1px after normalization.

Use a flat `#00ff00` chroma-key background and save raw plus `-chromakey.png` variants under `public/assets/lumi/`.

## Output Names

| Candidate | V2 output |
|---|---|
| White-headed long-tailed tit | `candidate-white-headed-long-tailed-tit-stage-1-4-v2.png` |
| Costasiella kuroshimae | `candidate-costasiella-kuroshimae-stage-1-4-v2.png` |
| Sea bunny slug / Jorunna parva | `candidate-sea-bunny-slug-stage-1-4-v2.png` |
| Platypus | `candidate-platypus-stage-1-4-v2.png` |
| Axolotl | `candidate-axolotl-stage-1-4-v2.png` |
| Glass frog | `candidate-glass-frog-stage-1-4-v2.png` |
| Fried egg jellyfish | `candidate-fried-egg-jellyfish-stage-1-4-v2.png` |
| Yeti crab | `candidate-yeti-crab-stage-1-4-v2.png` |
| Satanic leaf-tailed gecko | `candidate-satanic-leaf-tailed-gecko-stage-1-4-v2.png` |

Contact sheet:

- `public/assets/_review/real-creature-candidates-stage-1-4-v2-contact.png`

## Shared Negative Prompt

```text
larger Stage 3, larger Stage 4, adult form, humanoid body, long legs, clothing, detachable accessories, loose hats, loose bags, realistic animal anatomy, creepy biology, cyberpunk armor, robot suit, heavy circuitry, different species per stage, camera angle changes, zoom changes, inconsistent baseline, text, watermark, UI frame, background scenery, shadow, gradient background
```

## Prompts

### White-headed Long-Tailed Tit V2

```text
Revise the V1 fluffy white bird evolution sheet into V2. Keep Stage 1 as a small fluffy chick seed and Stage 2 as the base cotton-ball bird. Stage 2, Stage 3, and Stage 4 must remain the same size, center, lower baseline, and near-front 3/4 angle. Strengthen Stage 3 and Stage 4 detail without growth: clearer lower feather tufts, better tiny wing patch, more readable short tail-feather hint, integrated pastel-cyan feather glow marks, cleaner outline, richer pixel shading. Stage 4 should look premium and polished but not older or larger. Simple bead/digital eyes, tiny beak, white/cream/gray palette, flat #00ff00 background.
```

### Costasiella Kuroshimae V2

```text
Revise the V1 leaf-sheep sea slug evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and footprint. Strengthen Stage 3 and Stage 4 detail without growth: more distinct leaf cerata rows, cleaner tiny face, clearer rhinophore tips, subtle pink/mint glow freckles integrated into the leaf body, better leaf vein pixels, cleaner underside silhouette. Keep animation-friendly cerata count and avoid making the back taller.
```

### Sea Bunny Slug V2

```text
Revise the V1 sea bunny slug evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and footprint. Strengthen Stage 3 and Stage 4 detail without growth: clearer ear-like rhinophores, tiny tail nub polish, sparse peach-gold star freckles or soft pearl-like flat markings integrated into the body surface, cleaner belly edge, better shading. Keep the back smooth and plush. Avoid creepy raised dorsal bumps, wart texture, clustered eggs, spikes, or bead piles. Keep it soft and simple, not a mammal rabbit.
```

### Platypus V2

```text
Revise the V1 platypus evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and lower baseline; tighten Stage 3 so it does not grow. Strengthen Stage 3 and Stage 4 detail without growth: clearer bill shape, more readable webbed feet, better broad tail pattern, subtle teal glow markings integrated into tail and feet, cleaner brown fur shading, more polished outline. Preserve bill, webbed feet, and tail equally.
```

### Axolotl V2

```text
Revise the V1 axolotl evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and footprint. Strengthen Stage 3 and Stage 4 detail without growth: clearer but still simple external gills, refined tail fin, tiny cyan glow freckles integrated into body and fin, smoother pink shading, cleaner small limbs, more polished outline. Keep gills animation-friendly and avoid overcomplex branches.
```

### Glass Frog V2

```text
Revise the V1 glass frog evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and lower baseline; tighten Stage 3 so it does not grow. Strengthen Stage 3 and Stage 4 detail without growth: cuter translucent belly pattern, clearer rounded toe pads, subtle blue/yellow glow marks inside the belly, cleaner eye highlights, smoother green body shading, refined compact frog silhouette. Avoid realistic organs or long limbs.
```

### Fried Egg Jellyfish V2

```text
Revise the V1 fried egg jellyfish evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and tentacle baseline. Strengthen Stage 3 and Stage 4 detail without growth: clearer jelly bell rim, richer yolk center highlights, more elegant short tentacle tips, subtle cyan glow droplets integrated into the bell and tentacle ends, cleaner cream edge shading, more polished outline. Do not add long tangled tentacles.
```

### Yeti Crab V2

```text
Revise the V1 yeti crab evolution sheet into V2. Keep Stage 1 and Stage 2 direction. Stage 2, Stage 3, and Stage 4 must stay the same size and footprint; do not let the large arms expand beyond the Stage 2 footprint. Strengthen Stage 3 and Stage 4 detail without growth: clearer oversized fuzzy claw silhouette, cleaner shell plates, subtle mint glow at claw tips, better small leg read, richer cream shading, polished outline. Fur texture should remain simplified and animation-friendly.
```

### Satanic Leaf-Tailed Gecko V2

```text
Revise the V1 leaf-tailed gecko evolution sheet into a much simpler V2. Keep the cute tiny gecko identity but reduce detail. Stage 1 remains small. Stage 2, Stage 3, and Stage 4 must stay the same size, center, lower baseline, and angle. Preserve only the most important features: one big simple digital eye style, small rounded gecko body, clear leaf-shaped tail, tiny simplified legs, a few teal body glow marks. Remove most scale texture, toe detail, jagged limb detail, and dense body markings. Stage 3 and Stage 4 add only subtle polish and clearer leaf-tail readability without becoming larger. The silhouette should be animation-ready and much simpler than V1.
```
