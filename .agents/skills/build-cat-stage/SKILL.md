---
name: build-cat-stage
description: Build or update the 답냥이 Three.js and React Three Fiber 2.5D cat character stage. Use when adding or replacing cat PNG/WebP assets, connecting cat motion to guided-chat state, changing the persistent brand-panel character, or validating WebGL, reduced-motion, static fallback, mobile layout, accessibility, and rendering performance. Do not use for unrelated generic 3D scenes or full rigged-model work.
---

# Build the 답냥이 cat stage

Implement the provided cat artwork as a restrained 2.5D assistant without weakening the message-writing flow. Treat repository documents as the source of truth; do not duplicate their requirements here.

## 1. Check the contract and dependency

1. Read `AGENTS.md` and the T29 row in `docs/CHECKLIST.md`.
2. Read only the linked sections in `docs/MVP.md`, `docs/DESIGN.md`, `docs/SCREENS.md`, and `docs/SPEC.md`.
3. Follow `/task-start`. Do not implement T29 while T28 implementation or automated verification remains incomplete. If only the real-browser evidence is missing, proceed code-first solely after explicit approval, keep T28/T29 unchecked, and defer both browser gates to T31.
4. Preserve `any` prohibition, MVP boundaries, FSD-lite public APIs, and the existing DOM interaction flow.

## 2. Inspect the asset before editing

1. List `public/cats` and inspect each target image with `file` and the image-viewing tool.
2. Prefer transparent PNG/WebP at 1024×1024 or larger with the whole silhouette inside the canvas.
3. Keep user-provided originals unchanged. Reference them from `/cats/<name>`.
4. For one flattened image, limit motion to breathing, floating, entry, tilt, and shallow parallax. Require separate layers or a rigged model before promising eye, ear, paw, or tail articulation.

## 3. Keep one rendering surface

1. Put one `Canvas` in the persistent `.brand-panel`; retain the brand copy as semantic DOM.
2. Keep relation-card avatars as ordinary `<img>` elements. Never create a Canvas per card.
3. Expose a narrow state contract such as `idle | selected | generating | result` and derive it from existing application state.
4. Keep the camera, lights, texture plane, and animation local to `src/features/cat-stage` and export through that slice's `index.ts`.
5. Add Three.js/R3F dependencies only when missing and do not add a general UI or animation library.

## 4. Make failure invisible to the task flow

1. Render the same asset as a static `<img>` before the WebGL scene is ready and whenever WebGL initialization/rendering fails.
2. Render the static image instead of Canvas when `prefers-reduced-motion: reduce` matches.
3. Mark the visual stage decorative and keep the assistant name/state in DOM text.
4. Do not let loading, Canvas exceptions, pointer handling, or animation cover or block selection, input, result, or copy controls.
5. Use subtle motion only. Avoid continuous spin, strong pointer tracking, fake typing, physics, multi-scene effects, and full 3D reconstruction from a single image.

## 5. Validate proportionally

1. Test state mapping, static fallback, reduced-motion behavior, and failure fallback without requiring real WebGL in jsdom.
2. Verify a single Canvas in the rendered page and no Canvas in relation cards.
3. Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
4. Record production bundle size before/after Three.js and lazy-load the stage if the initial route grows materially.
5. Use the in-app browser at 320×568 and 375×667. Check no horizontal overflow, visible first choice, keyboard flow, non-blocking Canvas, state changes, and reduced-motion static output.
6. Mark T29 complete only after automated and real-browser checks pass; record the evidence in `docs/LOG.md`.
