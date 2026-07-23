# Sea Bunny Slug Stage 2 Motion Plan

## Reference

Use the second stage from:

```text
public/assets/lumi/candidate-sea-bunny-slug-stage-1-4-v2-chromakey.png
```

The extracted reference is:

```text
public/assets/lumi/sea-bunny-slug-stage-2-production-candidates/sea-bunny-slug-stage-2-reference-stage-2.png
```

The revised cute-back decoration reference is:

```text
public/assets/lumi/sea-bunny-slug-stage-2-production-candidates/sea-bunny-slug-stage-2-cute-back-reference-v1-chromakey.png
```

This Stage 2 form is the animation base. Do not use the older `sea-bunny-slug-stage-1` crop set.

## Identity

- Cute sea bunny nudibranch desktop pet.
- Soft cream and peach body.
- Ear-like rhinophores are the main cute silhouette feature.
- Rear gill tuft should stay small and flower-like.
- Small simple digital eyes.
- Slow, soft, curious, slightly shy personality.

## Back Decoration Revision

The current back bumps can read as creepy. Replace that feeling with cute, soft, body-integrated decoration:

- Use tiny peach-gold star freckles, pearl dots, or soft sugar-sprinkle pixels.
- Keep them flat and decorative, not raised bumps or insect-like nodules.
- Distribute them sparsely along the back so the body stays clean at `64px`.
- A few freckles may softly pulse in `focused` or `happy`, but they must not look like detachable accessories.
- Avoid dense pore texture, warts, clustered eggs, spikes, bead piles, or realistic biological bumps.

Prompt phrase:

```text
Replace creepy raised dorsal bumps with sparse cute peach-gold star freckles and soft pearl-like flat markings integrated into the body surface. Keep the back smooth and plush, not bumpy, not wart-like, not egg-like.
```

## Motion Acting

- `idle`: soft breathing, rhinophores gently sway, rear gill tuft barely flutters.
- `focused`: body leans forward, rhinophores angle forward as sensory scanners, eyes become tiny focused pixels.
- `happy`: jelly bounce, rhinophores perk up, soft freckles brighten, rear gill tuft flicks once.
- `recovering`: body lowers, rhinophores droop slightly, then returns to a balanced soft shape.
- `hanging`: the pet dangles from one ear-like rhinophore as if the soft ear is hooked over an invisible top UI edge. The other rhinophore flops freely and the body makes a gentle pendulum wobble. Avoid suction cups, mushroom-like caps, hooks, ropes, or detachable-looking parts.
- `hiding`: clearly shy, body tucks sideways as if behind a window, one rhinophore peeks first. It must not read as idle.
- `walk`: right-facing soft glide, underside ripples like a slow sea slug foot.
- `run`: right-facing quicker glide dash, lower and more stretched than walk.
- `jump`: squash, tiny float, soft landing. Do not rotate to face the camera mid-jump.
- `climbing`: rear 3/4 top-back view, body sticks and releases upward; show the long decorated back surface, rhinophores from behind/top, and rear gill tuft. Avoid a butt-only straight rear view.

## Output

Generate candidates first:

```text
public/assets/lumi/sea-bunny-slug-stage-2-production-candidates/
sea-bunny-slug-stage-2-<motion>-sheet-v1.png
```

Current reviewed candidate versions:

```text
sea-bunny-slug-stage-2-hanging-sheet-v2.png
sea-bunny-slug-stage-2-climbing-sheet-v2.png
```

Promote only after review:

```text
public/assets/lumi/sea-bunny-slug-stage-2/
sea-bunny-slug-stage-2-<motion>-sheet.png
```
