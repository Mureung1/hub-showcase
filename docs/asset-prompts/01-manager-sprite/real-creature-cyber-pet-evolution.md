# Real Creature Cyber Pet Evolution Prompt

## Purpose

This document records the 2026-07-17 direction for manager-character candidates inspired by unusual real creatures.
Each candidate is a cute desktop pet with a small amount of mysterious cyber-lifeform flavor.

## Global Evolution Rule

- Each creature uses one horizontal four-stage sheet.
- Stage 1 is intentionally smaller: seed, hatchling, larva, baby, or simple core form.
- Stage 1 may grow slightly into Stage 2.
- Stage 2, Stage 3, and Stage 4 must keep a similar body size, camera angle, center point, lower baseline, and visual weight.
- Stage 3 and Stage 4 communicate evolution through detail polish, cleaner silhouette, creature-specific traits, and subtle cyber-biological accents, not through size growth.
- Do not make later stages taller, wider, older, more humanoid, or harder to animate.

## Animation Base Selection

- Official 9-creature source: `call_5sUTBQlinROYVyU6ME7HGChS`
- Local source file: `C:/Users/sun99/.codex/generated_images/019f6a9f-b65f-75c3-b6bd-4712fab8daee/call_5sUTBQlinROYVyU6ME7HGChS.png`
- Workspace review copy: `public/assets/_review/real-creature-candidates-stage-1-4-v2-contact.png`
- For actual animation production, use Stage 1 and Stage 2 only.
- Keep Stage 3 and Stage 4 as design exploration references, not animation targets.

## Style Direction

- Production-quality pixel art.
- Cute desktop pet, not a realistic animal illustration.
- Preserve each real creature's iconic trait first.
- Add about 20% mysterious cyber-lifeform feeling: soft glow pixels, bioluminescent dots, circuit-like natural markings, or small integrated body panels.
- Cyber details must look like part of the creature's body. Avoid loose accessories unless they are fused with the body concept.
- Keep simple digital eyes or species-appropriate simplified eyes.
- Expression may be minimal; communicate state through silhouette, glow, posture, frills, fins, fur, or tail.
- Use each creature's natural color direction, with one additional accent color for character identity.
- Use a clean dark outline and readable silhouettes at 64px.
- Chroma-key source images should use a flat `#00ff00` background for removal.

## Candidate Creature Notes

| Candidate | Core traits to preserve | Color direction |
|---|---|---|
| White-headed long-tailed tit | fluffy cotton-ball bird silhouette, tiny beak, small wings, soft tail hint | white/cream/black with one pastel accent |
| Costasiella kuroshimae | leaf-sheep sea slug shape, leafy cerata, tiny face feel | green/cream with mint or pink accent |
| Sea bunny slug / Jorunna parva | small bunny-like sea slug, rhinophore ear shapes, soft oval body | white/cream/yellow with one warm accent |
| Platypus | bill, webbed feet, broad tail all remain visible | brown/tan with teal or soft blue accent |
| Axolotl | simple body, external gills, soft aquatic pet feel | pale pink/cream with cyan or coral accent |
| Glass frog | cute transparent belly motif, rounded frog shape, simple limbs | lime/transparent cream with blue or yellow accent |
| Fried egg jellyfish | yolk-like center, soft jelly bell, short tentacles | white/cream/yellow with peach or cyan accent |
| Yeti crab | oversized fuzzy arms/claws, compact crab body | white/cream with warm yellow or mint accent |
| Satanic leaf-tailed gecko | leaf tail, big but simple eyes, leaf camouflage, softened non-scary silhouette | brown/leaf/cream with pink or teal accent |

## Prompt Template

```text
Create a production-quality pixel art character evolution sheet with four separate stages in one horizontal row on a perfectly flat solid #00ff00 chroma-key background. Subject: [candidate creature]. Make it a cute desktop pet inspired by the real creature, with about 20% mysterious cyber-biological lifeform flavor. Preserve the creature's iconic traits: [traits]. Stage 1 is intentionally smaller, like a seed, hatchling, larva, baby, or simple core form. Stage 1 may grow slightly into Stage 2. Stage 2, Stage 3, and Stage 4 must keep almost the same body size, same camera angle, same center point, same lower baseline, and similar visual weight. Stage 3 and Stage 4 evolve only through cleaner pixel polish, sharper creature traits, subtle body-integrated glow markings, and refined silhouette, not through becoming larger or older. Use simple digital eyes or species-appropriate simplified eyes. Use [palette] with one additional accent color. Clean dark outline, crisp readable 64px pixel art, no text, no watermark, no UI, no floor plane, no shadow, no gradient background.
```

## Negative Prompt

```text
progressively larger stages after Stage 2, adult form, humanoid body, long legs, arms like a person, clothing, detachable accessories, loose hats, loose bags, realistic animal anatomy, creepy biology, too much fur texture, cyberpunk armor, robot suit, heavy circuitry, unrelated decorations, different species per stage, camera angle changes, zoom changes, inconsistent baseline, text, watermark, UI frame, background scenery
```

## Acceptance Notes

- Reject any candidate where Stage 3 or Stage 4 grows substantially beyond Stage 2.
- Reject any candidate where creature identity is lost to a generic round mascot.
- Reject any candidate where cyber details make animation difficult or look like separate accessories.
- Prefer candidates that would animate cleanly with idle, hover, focused, happy, recovering, hanging, and hiding states.
- Hanging and hiding motions should preserve each creature's silhouette and use stable window anchors or peek edges rather than changing size.
- Stage 1 and Stage 2 may remain simple and cute, but Stage 3 and Stage 4 must show a clearly visible detail upgrade.
- Stage 3 and Stage 4 detail upgrades should be creature-specific: better feather tufts, cerata, rhinophores, webbed feet, gills, belly pattern, tentacle tips, fuzzy claws, or leaf-tail read.
- Detail upgrades must not rely on making the character bigger.
- Satanic leaf-tailed gecko candidates should be simpler than V1: preserve the big eye, tiny body, and leaf tail, but reduce scale texture, toes, limb complexity, and body pattern density.

## Generated V1 Review Set

Generated on 2026-07-17 under `public/assets/lumi/`.

| Candidate | Raw PNG | Transparent/chroma-key PNG |
|---|---|---|
| White-headed long-tailed tit | `candidate-white-headed-long-tailed-tit-stage-1-4-v1.png` | `candidate-white-headed-long-tailed-tit-stage-1-4-v1-chromakey.png` |
| Costasiella kuroshimae | `candidate-costasiella-kuroshimae-stage-1-4-v1.png` | `candidate-costasiella-kuroshimae-stage-1-4-v1-chromakey.png` |
| Sea bunny slug / Jorunna parva | `candidate-sea-bunny-slug-stage-1-4-v1.png` | `candidate-sea-bunny-slug-stage-1-4-v1-chromakey.png` |
| Platypus | `candidate-platypus-stage-1-4-v1.png` | `candidate-platypus-stage-1-4-v1-chromakey.png` |
| Axolotl | `candidate-axolotl-stage-1-4-v1.png` | `candidate-axolotl-stage-1-4-v1-chromakey.png` |
| Glass frog | `candidate-glass-frog-stage-1-4-v1.png` | `candidate-glass-frog-stage-1-4-v1-chromakey.png` |
| Fried egg jellyfish | `candidate-fried-egg-jellyfish-stage-1-4-v1.png` | `candidate-fried-egg-jellyfish-stage-1-4-v1-chromakey.png` |
| Yeti crab | `candidate-yeti-crab-stage-1-4-v1.png` | `candidate-yeti-crab-stage-1-4-v1-chromakey.png` |
| Satanic leaf-tailed gecko | `candidate-satanic-leaf-tailed-gecko-stage-1-4-v1.png` | `candidate-satanic-leaf-tailed-gecko-stage-1-4-v1-chromakey.png` |

Review contact sheet:

- `public/assets/_review/real-creature-candidates-stage-1-4-v1-contact.png`

Quick review:

- Stronger first-pass candidates: white-headed long-tailed tit, sea bunny slug, axolotl, fried egg jellyfish.
- Needs possible same-size tightening: platypus, glass frog, yeti crab.
- Good creature identity but may need silhouette simplification for animation: Costasiella kuroshimae, satanic leaf-tailed gecko.

V2 user feedback:

- Keep Stage 1 and Stage 2 direction.
- Increase the visible detail upgrade in Stage 3 and Stage 4 for all non-gecko animals.
- Simplify the satanic leaf-tailed gecko substantially.
- Do not solve detail by enlarging Stage 3 or Stage 4.

V2 prompt queue:

- `docs/asset-prompts/01-manager-sprite/real-creature-cyber-pet-v2-prompts.md`
