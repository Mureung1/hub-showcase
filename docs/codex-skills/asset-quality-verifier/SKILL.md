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

## Procedure

1. Confirm the asset belongs under `public/assets/` and matches the manifest `src`.
2. For animation sheets, verify fixed frame geometry:
   - one state per sheet
   - equal frame width and height
   - consistent row/column layout
   - same character center x across frames
   - same lower baseline y across frames
   - no cropped antenna, halo, glow, or accessory
3. Check visual style:
   - pixel art, crisp edges, readable at 32/48/64px
   - Windows XP palette compatibility
   - Lumi remains an electronic lifeform, not a real animal
   - no text, watermark, fake UI controls, signature, or logo
4. Check state meaning:
   - idle is calm waiting
   - focused is quest-running concentration
   - happy is completion feedback
   - recovering is gentle rebalancing, not punishment
   - hover is attention without scale jump
   - disabled icons are muted but still recognizable
5. Check implementation fit:
   - transparent PNG/WebP for sprites/icons/rewards/FX
   - `prefers-reduced-motion` first frame still communicates the state
   - manifest frame metadata matches the actual sheet

## Quick Pixel Checks

- Open the PNG and inspect at native size and 4x zoom.
- For sprite sheets, mentally overlay frame cells: body center and lower baseline should not wander.
- If the sheet jitters in preview, reject it even if the art is attractive.

## Output

- Pass/fail
- Asset paths checked
- Any drift or style issues
- Required prompt or asset regeneration notes
