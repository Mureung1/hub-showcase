# CLAUDE.md

## 재생 컨트롤 기본 속도

Step[] 미리 계산 + player 훅 패턴(`useSortPlayer.ts`, `useTreePlayer.ts`, `useMechanismPlayer.ts` 등, 기능 A 계열)의 기본 `speed`(스텝 간 딜레이 ms)는 각 컨트롤 속도 슬라이더의 게이지 기준 **약 30% 지점**에 오도록 맞춘다.

슬라이더는 `value={OFFSET - speed}` 형태로 반전되어 있음(오른쪽으로 갈수록 빠르게 느껴지도록) — 새 player 훅을 추가할 때도 절대 ms 값이 아니라 "게이지 30%"를 기준으로 기본값을 정할 것.

계산 방법: `sliderTarget = min + 0.3 * (max - min)`을 슬라이더 `step`에 맞게 반올림한 뒤, `speed = OFFSET - sliderTarget`.

현재 적용된 값:
- `src/features/sorting/hooks/useSortPlayer.ts`: `speed = 700` (슬라이더 min 50 / max 1000 / step 50 / offset 1050, `SortControls.tsx`)
- `src/features/tree/hooks/useTreePlayer.ts`: `speed = 900` (슬라이더 min 100 / max 1200 / step 100 / offset 1300, `TreeControls.tsx`)
- `src/features/organicMechanism/hooks/useMechanismPlayer.ts`: `speed = 2200` (슬라이더 min 500 / max 3000 / step 100 / offset 3500, `MechanismControls.tsx`)
