---
title: Dynamic Asset Animation Pipeline
type: synthesis
status: active
updated: 2026-07-22
source_paths:
  - docs/dynamic-asset-requirements.md
  - docs/asset-prompts/README.md
  - docs/asset-prompts/01-manager-sprite/electronic-manager-sprite-sheet.md
  - docs/asset-prompts/01-manager-sprite/real-creature-cyber-pet-v2-prompts.md
  - docs/asset-prompts/01-manager-sprite/planaria-stage-1-animation-sample.md
  - .agents/skills/asset-quality-verifier/SKILL.md
confidence: high
tags:
  - assets
  - animation
  - sprite-sheet
  - dynamic-mvp
  - wiki
---

# Dynamic Asset Animation Pipeline

This page summarizes the current source-backed decision for generating and using dynamic desktop-pet assets. It does not replace the source prompt documents; use it to choose which source document to open and what contract must remain true across generation, review, and React playback.

## Source Vs Wiki Boundary

- `docs/asset-prompts/` is the working prompt library. Put exact prompts, generation references, output paths, and per-asset rules there.
- `docs/dynamic-asset-requirements.md` is the implementation contract for manifest types, canonical folders, state names, and feature requirements.
- `docs/wiki/` is for source-backed synthesis: decisions, current workflow, and where to look next. Do not paste every prompt into the Wiki.

## Current Animation Decision

- Character candidates use only Stage 1 and Stage 2 as animation bases.
- Real-creature candidates use `call_5sUTBQlinROYVyU6ME7HGChS` for the 9 real-creature Stage 1/2 bases.
- Pink manager uses `call_z97P9uZ2ElI20evcQGicQRu9` for Stage 1/2.
- Planaria uses `call_FC5eMPVVWE0EfZgjCbcenep4` for Stage 1/2.
- Stage 3 and Stage 4 are not active animation bases for now because they risk extra regeneration without enough visible gameplay value.

## Sprite Sheet Contract

Every generated character state should be reviewed as the production sprite sheet itself. Direction boards or contact sheets may help compare assets, but they are not production sources and should not be cropped into runtime sheets.

| Rule | Current contract |
|---|---|
| Sheet size | `256x64` |
| Frame grid | `4 frames x 1 row` |
| Frame cell | `64x64` |
| Frame order | left to right, indexes `0`, `1`, `2`, `3` |
| Reduced motion | frame `0` only |
| Default anchors | center x + lower float anchor |
| `hanging` anchor | stable top grip anchor |
| `hiding` anchor | stable peek edge |
| Expected drift after normalization | about `1px` or less |

Within one PNG sheet, the character must keep the same apparent scale and visible body-size footprint across frames. Bounces, jumps, hanging, and hiding may move the pose inside the canvas, but they must not make the pet look larger or smaller from frame to frame.

## State Set

The active sample set is:

- `idle`
- `focused`
- `happy`
- `recovering`
- `hover`
- `hanging`
- `hiding`

`resting` exists in the original Lumi manifest and prompt path, but the current 11-creature expansion request focuses on the seven states above.

## Playback Defaults

Use these defaults when wiring sample sheets into React or when checking whether a generated sheet has plausible timing.

| State | FPS | Loop | Anchor |
|---|---:|---|---|
| `idle` | 4 | yes | center x + lower float anchor |
| `focused` | 6 | yes | center x + lower float anchor |
| `happy` | 6 | yes | center x + lower float anchor |
| `recovering` | 4 | yes | center x + lower float anchor |
| `hover` | 7 | yes | center x + lower float anchor |
| `hanging` | 6 | yes | top grip anchor |
| `hiding` | 5 | yes | peek edge |

When using CSS background animation, frame positions are:

```text
frame 0:    0px 0
frame 1:  -64px 0
frame 2: -128px 0
frame 3: -192px 0
```

## Where To Put Details

| Detail | Put it in |
|---|---|
| Exact image generation prompt | `docs/asset-prompts/...` |
| Output paths and reference image paths | `docs/asset-prompts/...` |
| Manifest type, runtime state names, canonical folders | `docs/dynamic-asset-requirements.md` and `src/data/assetManifest.ts` |
| Generated PNG/WebP files | `public/assets/...` |
| Optional review previews | `public/assets/_review/...` |
| Reusable verification rules | `.agents/skills/asset-quality-verifier/SKILL.md` and `docs/codex-skills/asset-quality-verifier/SKILL.md` |
| Cross-document decision summary | `docs/wiki/synthesis/...` |

## When To Use The Wiki

Use the Wiki when an agent or teammate needs the current project decision without rereading every source document.

Good Wiki use cases:

- Choosing which source document controls an asset workflow.
- Answering "what is the current decision?" after several prompt iterations.
- Onboarding a new agent to source-backed project context.
- Checking whether a summary has traceable `source_paths`.
- Comparing source documents and spotting gaps or stale decisions.

Do not use the Wiki as the only source when:

- Writing a final image prompt. Open the actual prompt doc.
- Editing code or manifest types. Open the actual source file.
- Verifying generated PNG geometry. Inspect the actual asset files.
- Handling secrets, private data, or raw external material.

## Current Gap

The Wiki now has a synthesis page for the dynamic asset animation pipeline, but it is still intentionally thin. As more of the 11 creature animation sets are approved, add only durable decisions here and keep per-creature prompt detail in `docs/asset-prompts/`.
