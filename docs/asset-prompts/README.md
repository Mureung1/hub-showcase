# Asset Prompt Pack

`나를 믿는 너를 믿어`의 1차 프로토타입과 MVP 이후 확장을 위한 에셋 생성 프롬프트 모음이다. 목적은 이미지를 한 번 만들고 끝내는 것이 아니라, 동일한 세계관과 규격으로 계속 확장 가능한 에셋 파이프라인을 만드는 것이다.

## 사용 원칙

- UI 텍스트는 이미지에 넣지 않는다. 텍스트는 React 컴포넌트로 표시한다.
- 배경, 매니저, 소품, 보상 오브젝트는 PNG/WebP 에셋으로 분리한다.
- 픽셀 선명도 유지를 위해 최종 웹에서는 `image-rendering: pixelated`를 적용한다.
- 한 장짜리 예쁜 이미지보다, 잘라서 재사용 가능한 object sheet와 sprite sheet를 우선한다.
- 모든 에셋은 투명 배경이 필요한지, 고정 배경이 필요한지 먼저 정한다.

## 권장 저장 위치

```text
src/assets/pixel/manager/
src/assets/pixel/rooms/
src/assets/pixel/ui/
src/assets/pixel/rewards/
src/assets/pixel/social/
src/assets/pixel/fx/
```

## 권장 파일명

```text
manager_idle_sheet_v01.png
manager_work_sheet_v01.png
room_lofi_cabin_morning_v01.png
room_lofi_cabin_night_v01.png
ui_xp_window_9slice_v01.png
reward_memory_fragments_sheet_v01.png
social_space_fragments_sheet_v01.png
fx_completion_sparkle_sheet_v01.png
```

## 공통 네거티브 프롬프트

```text
no text, no letters, no logos, no watermark, no realistic photography, no 3d render, no vector flat illustration, no cyberpunk neon, no glossy mobile game UI, no excessive bloom, no horror mood, no cluttered composition, no unreadable tiny details
```

## 공통 스타일 키워드

```text
cozy pixel art, warm muted palette, hand placed pixels, soft evening light, nostalgic desktop game mood, gentle low fidelity room, small electronic creature companion, calm self growth atmosphere, readable silhouettes, limited color palette, 32-bit pixel art feeling
```
