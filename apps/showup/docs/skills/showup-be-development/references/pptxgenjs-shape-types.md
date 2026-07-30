# pptxgenjs Shape Type Names — lowercase, not enum-style

## Problem

pptxgenjs `addShape()` uses lowercase shape type names:
- `pres.ShapeType.roundRect` — NOT `ROUNDED_RECTANGLE`
- `pres.ShapeType.rect` — NOT `RECTANGLE`
- `pres.ShapeType.ellipse` — NOT `OVAL`

Using the uppercase form throws: `Missing/Invalid shape parameter!`

## Fix

```js
// WRONG — throws at runtime
slide.addShape(pres.ShapeType.ROUNDED_RECTANGLE, { x: 1, y: 1, w: 2, h: 0.5 });

// CORRECT
slide.addShape(pres.ShapeType.roundRect, { x: 1, y: 1, w: 2, h: 0.5 });
```

## Also: .cjs extension in ESM projects

If the project `package.json` has `"type": "module"`, a `.js` file using `require()` will fail with `ReferenceError: require is not defined in ES module scope`. Rename the generator script to `.cjs` to force CommonJS interpretation.

## Context

Encountered while generating the ShowUp Week 3 presentation deck (`outputs/weeks3/generate-deck.cjs`). The pptxgen powerpoint skill documents the API but doesn't mention the lowercase shape type names — they're easy to get wrong because the rest of the API uses camelCase properties but the shape types look like they should be enum constants.