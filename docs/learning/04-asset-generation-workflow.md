# Asset Generation Workflow

## Keywords

- pixel art asset
- sprite sheet
- canonical runtime folder
- production candidate
- asset manifest
- sprite review tool
- contact sheet
- idle/hover icon pair
- interaction object tiles
- transparent background
- alpha cleanup
- animation placement
- reduced-motion fallback

## Why It Matters

생성한 PNG를 앱에서 안정적으로 쓰려면 파일명, 프레임 수, 투명 배경, 중심축, runtime 경로가 맞아야 한다. 특히 캐릭터 얼굴이나 몸통 alpha가 약하면 배경이 sprite에 비쳐 보일 수 있다.

## Reference Code Paths

- `src/data/assetManifest.ts`
- `src/data/spriteReviewAssets.ts`
- `src/components/SpriteSheetReviewTool.tsx`
- `src/components/CanvasSpriteAnimator.tsx`
- `src/data/windowPetPlacements.ts`
- `scripts/verify-sprite-sheets.mjs`
- `docs/dynamic-asset-requirements.md`
- `docs/asset-prompts/README.md`
- `docs/asset-prompts/08-interaction-objects/window-platform-ladder-tiles.md`
- `public/assets/lumi/`
- `public/assets/interaction-objects/`
- `public/assets/_review/`

## Parts To Check

- `SpriteAnimationAsset`: `frameWidth`, `frameHeight`, `frameCount`, `fps`, `playbackFrames`, `anchor`
- `CanvasSpriteAnimator`: canvas draw, mirrorX, reduced motion frame
- `getPetAnimationAsset()` and `getRenderablePetStage()`
- `getInteractionObjectAsset()`: ladder/platform tile asset mapping
- review tool placement localStorage와 runtime `WindowPetInteraction`
- sprite 얼굴/몸통의 불투명도와 transparent background 품질
- ladder/platform tile이 repeat-x 또는 repeat-y에 적합한지

## ChatGPT Questions

- sprite sheet에서 중심축과 바닥선이 흔들리면 React canvas 재생에서 어떤 문제가 생겨?
- production candidate와 canonical runtime folder를 나누는 이유를 이 프로젝트 기준으로 설명해줘.
- ladder/platform 같은 반복 타일 asset을 만들 때 어떤 조건을 지켜야 해?
- PNG alpha가 약해서 배경이 비쳐 보일 때 asset 쪽과 CSS 쪽에서 각각 어떻게 보정할 수 있어?
