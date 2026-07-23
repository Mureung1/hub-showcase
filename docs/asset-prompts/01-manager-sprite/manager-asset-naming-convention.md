# Manager Asset Naming Convention

## Purpose

This convention separates accepted runtime assets from candidate and review assets before generating more managers.

Current accepted Stage 2 managers:

- `pink-manager`
- `glass-frog`

These two are treated as canonical references for later manager generation.

## Canonical Runtime Folders

Accepted runtime animation sheets live directly under:

```text
public/assets/lumi/<pet-id>-<stage-id>/
```

Examples:

```text
public/assets/lumi/pink-manager-stage-2/
public/assets/lumi/glass-frog-stage-2/
```

Canonical runtime files never include version suffixes:

```text
<pet-id>-<stage-id>-<motion>-sheet.png
```

Examples:

```text
pink-manager-stage-2-idle-sheet.png
pink-manager-stage-2-hiding-sheet.png
glass-frog-stage-2-idle-sheet.png
glass-frog-stage-2-hiding-sheet.png
```

React manifest entries should point only to these canonical paths.

## Candidate Folders

Generated candidates must not overwrite canonical runtime assets.

Use a candidate folder while reviewing:

```text
public/assets/lumi/<pet-id>-<stage-id>-production-candidates/
```

Candidate files include a version suffix:

```text
<pet-id>-<stage-id>-<motion>-sheet-v<number>.png
```

Examples:

```text
pink-manager-stage-2-idle-sheet-v3.png
glass-frog-stage-2-idle-sheet-v1.png
```

Only promote a candidate after visual review. Promotion means copying the selected candidate into the canonical folder and removing the version suffix.

## Review Assets

Contact sheets, motion boards, placement screenshots, and visual comparison images live under:

```text
public/assets/_review/
```

Review files are not runtime assets. Do not crop runtime sheets from loose review/contact boards unless the board already satisfies the exact production grid rules.

## Motion File Set

For Stage 2 canonical manager folders, the expected motion file set is:

```text
<pet-id>-stage-2-idle-sheet.png
<pet-id>-stage-2-focused-sheet.png
<pet-id>-stage-2-happy-sheet.png
<pet-id>-stage-2-recovering-sheet.png
<pet-id>-stage-2-hanging-sheet.png
<pet-id>-stage-2-hiding-sheet.png
<pet-id>-stage-2-run-sheet.png
<pet-id>-stage-2-jump-sheet.png
<pet-id>-stage-2-walk-sheet.png
<pet-id>-stage-2-climbing-sheet.png
```

`hover` is excluded from the creature motion batch unless explicitly requested.

## Promotion Checklist

Before promoting a candidate:

- The candidate visually matches the accepted manager identity.
- The sheet size matches manifest metadata.
- Each frame cell is `64x64`.
- The character scale is consistent inside the sheet.
- The motion reads clearly at runtime size.
- `hiding` keeps the accepted hiding personality and does not become a generic idle wobble.
- No text, watermark, UI chrome, ladder, or window is baked into the sprite.
- `npm.cmd run verify:sprites` passes after promotion.
