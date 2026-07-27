# Costasiella Kuroshimae Stage 2 Motion Plan

## Reference

Use the second stage from:

```text
public/assets/lumi/candidate-costasiella-kuroshimae-stage-1-4-v2-chromakey.png
```

The extracted reference is:

```text
public/assets/lumi/costasiella-kuroshimae-stage-2-production-candidates/costasiella-kuroshimae-stage-2-reference-stage-2.png
```

This Stage 2 form is the animation base. Keep the cream body, small digital eyes, pink-tipped feelers, and green leaf-like cerata.

## Identity

- Cute Costasiella kuroshimae desktop pet.
- Leaf-like cerata are the main silhouette and motion feature.
- Movement should feel like a tiny sea slug gliding, sticking, and gently leaf-wiggling.
- Cyber detail should be subtle: small cyan pixels integrated into leaf tips or cerata interiors.
- Avoid turning it into a generic hedgehog, cactus, caterpillar, or spiky creature.

## Motion Acting

- `idle`: calm breathing, tiny blink, soft cerata ripple.
- `focused`: body leans forward, cerata angle forward like sensory panels, cyan scan pixels pulse inside leaves.
- `happy`: small bounce, cerata fan open like cheering leaves, eyes brighten into cute happy pixels.
- `recovering`: body lowers, cerata droop, cyan pixels dim and return calmly.
- `hanging`: upper back cerata grips an invisible top UI edge; body stretches downward and pendulum-wobbles. Do not elongate pink-tipped feelers like a rope.
- `hiding`: left-edge peek. A feeler appears first, then one eye and half face, then it retreats. Do not draw the window.
- `walk`: right-facing slow sea-slug glide, underside ripple, cerata sway. Candidate v1 has some angle drift; v2 should keep right-facing direction more strictly.
- `run`: right-facing low dash, body slightly stretched, cerata stream backward.
- `jump`: right-facing jelly bounce. Do not rotate to face the camera at apex.
- `climbing`: rear 3/4 top-back view; show a lush, full leaf-cerata back while climbing upward. Avoid front-facing, butt-only rear view, and sparse/bald-looking cream back areas.

## Output

Generate candidates first:

```text
public/assets/lumi/costasiella-kuroshimae-stage-2-production-candidates/
costasiella-kuroshimae-stage-2-<motion>-sheet-v1.png
```

Current reviewed candidate versions:

```text
costasiella-kuroshimae-stage-2-hanging-sheet-v2.png
costasiella-kuroshimae-stage-2-climbing-sheet-v2.png
```

Promote only after review:

```text
public/assets/lumi/costasiella-kuroshimae-stage-2/
costasiella-kuroshimae-stage-2-<motion>-sheet.png
```
