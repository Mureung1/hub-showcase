---
name: asset-quality-verifier-reference
description: Repository reference copy for reviewing generated pixel assets, sprite sheets, desktop icons, reward objects, FX sheets, or dynamic asset manifests for the XP desktop electronic manager project.
---

# Asset Quality Verifier

## Purpose

Verify that generated assets can be used in the React XP desktop app without visual drift, broken paths, baked text, or state mismatch.

## Inputs

- Prompt document path
- Generated asset path
- Related manifest entry
- Target frame size or icon size
- Canonical reference path, when available
- Character direction, when applicable:
  - `electronic-lumi`
  - `pink-animal-samesize`
  - `real-creature-cyber-pet`

## Procedure

1. Confirm the asset belongs under `public/assets/` and matches the manifest `src`.
2. For animation sheets, verify fixed frame geometry:
   - one state per sheet
   - equal frame width and height
   - consistent row/column layout
   - same character center x across frames
   - same lower baseline y across frames
   - no cropped antenna, halo, glow, or accessory
3. Check reference fidelity for Lumi assets:
   - compare against `public/assets/lumi-manager.png`
   - preserve the pink electronic-biological body, cream core, side modules, antenna light, lower base pieces, and small glowing device panel
   - reject generic round mascots or designs that lose the electronic lifeform identity
4. Check reference fidelity for the pink animal same-size candidate:
   - compare against `public/assets/lumi/character-2-pink-animal-cute-samesize-stage-1-4-v5.png`
   - preserve the egg-like body, pink/cream face, warm brown lower cradle or diaper-like base, rounded paws, simple animal-like ears, tiny face, blush, and soft pixel shading
   - keep Stage 1-4 close to the same body size, same camera angle, same center point, and same lower baseline
   - evolution should add animal cuteness and polish, not size, adult proportions, long legs, body hair, humanoid clothing, or electronic decoration
   - reject sets where later stages look like a larger adult version of the character
5. Check visual style:
   - pixel art, crisp edges, readable at 32/48/64px
   - Windows XP palette compatibility
   - electronic Lumi remains an electronic lifeform, not a real animal
   - pink animal candidate remains animal-like and cute, not electronic/cyberpunk
   - no text, watermark, fake UI controls, signature, or logo
6. Check real creature cyber pet candidates:
   - Stage 1 is intentionally smaller than Stage 2
   - Stage 2, Stage 3, and Stage 4 stay close in body size, camera angle, center, lower baseline, and visual weight
   - creature-specific identity remains readable before cyber decoration
   - cyber details are subtle and integrated into the body, not loose accessories
   - later stages improve through detail polish, not adult proportions or animation-hostile complexity
   - Stage 3 and Stage 4 must visibly improve detail over Stage 2 without changing the footprint
   - if Stage 3 and Stage 4 look like Stage 2 with only tiny dots added, request regeneration
   - for satanic leaf-tailed gecko candidates, prefer a simplified animation-ready silhouette over realistic scale/toe detail
7. Check state meaning:
   - idle is calm waiting
   - focused is quest-running concentration
   - happy is completion feedback
   - recovering is gentle rebalancing, not punishment
   - hover is attention without scale jump
   - hanging is a window-edge interaction with a stable grip/top anchor
   - hiding is a window-behind or peek interaction with stable peek-edge alignment
   - disabled icons are muted but still recognizable
8. Check implementation fit:
   - transparent PNG/WebP for sprites/icons/rewards/FX
   - `prefers-reduced-motion` first frame still communicates the state
   - manifest frame metadata matches the actual sheet
   - hanging/hiding sprites do not bake a full XP window into the image; the app should provide the edge, layer, or clipping mask

## Quick Pixel Checks

- Open the PNG and inspect at native size and 4x zoom.
- For sprite sheets, mentally overlay frame cells: body center and lower baseline should not wander.
- For same-size evolution sheets, compare each stage's bounding box. Stage 3 and Stage 4 may become more detailed but should not become noticeably taller, wider, older, or more humanoid.
- For real-creature cyber pet sheets, allow Stage 1 to be smaller, then compare Stage 2-4 for same-size stability.
- For window interaction sheets, overlay the grip point or peek edge instead of only the lower baseline.
- If the sheet jitters in preview, reject it even if the art is attractive.

## Output

- Pass/fail
- Asset paths checked
- Any drift or style issues
- Required prompt or asset regeneration notes
