# Fried Egg Jellyfish Stage 2 Motion Plan

## Reference

Use the second stage from:

```text
public/assets/lumi/candidate-fried-egg-jellyfish-stage-1-4-v2-chromakey.png
```

The extracted reference is:

```text
public/assets/lumi/fried-egg-jellyfish-stage-2-production-candidates/fried-egg-jellyfish-stage-2-reference-stage-2.png
```

This Stage 2 form is the animation base. Keep it cute, simple, and readable at `64px`.

## Identity

- Cute fried egg jellyfish desktop pet.
- Translucent cream bell with a soft yellow yolk-like core.
- Short rounded tentacles with small cyan water-light tips.
- Small simple digital eyes.
- Buoyant, calm, slightly dreamy personality.

## Motion Acting

- `idle`: soft bell pulse, tentacles drift down and return, yolk core glows gently.
- `focused`: bell rim tightens, body leans into attention, digital eyes become tiny focused pixels.
- `happy`: crescent eyes, buoyant jelly bounce, tentacles wiggle like a tiny celebration.
- `recovering`: bell droops and compresses, yolk core lowers, tentacles relax, then the body regains balance.
- `hanging`: upper bell rim catches on an invisible top UI edge. Body elongates downward like soft jelly while tentacles dangle. Keep the top grip stable and do not draw a hook, rope, ladder, or window.
- `hiding`: full body tucks and peeks as if behind a window layer. The sprite remains whole; the app window mask/layer creates the hidden effect.
- `walk`: right-drifting bell pulse. No legs; movement reads as a slow pulsing glide.
- `run`: faster right-facing swim dash, lower and slightly compressed compared with walk.
- `jump`: buoyant hop with squash, float, and soft landing. Do not flip direction or turn to face front mid-jump.
- `climbing`: side or rear 3/4 float-climb along an invisible vertical UI edge. Show the bell side and tentacle grip rhythm, not a butt-only rear view.

## Output

Generate candidates first:

```text
public/assets/lumi/fried-egg-jellyfish-stage-2-production-candidates/
fried-egg-jellyfish-stage-2-<motion>-sheet-v1.png
```

Promote only after review:

```text
public/assets/lumi/fried-egg-jellyfish-stage-2/
fried-egg-jellyfish-stage-2-<motion>-sheet.png
```
