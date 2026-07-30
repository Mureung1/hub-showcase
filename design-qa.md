# Today Learning Track Table Design QA

## Source

- User-provided desktop learning-track table reference image.
- Target route: `/today`.
- Compared states: desktop `1440 × 1200`, mobile `390 × 844`.

## Comparison

- The card header keeps `학습 목록` on the left and `전체 보기` on the right.
- Desktop rows expose all six columns: 트랙, 진행률, 현재 단계, 최근 학습, 다음 학습, 상태.
- Git, React, and Docker use recognizable library icons with the existing ICU badge treatment.
- Progress combines a numeric value and compact bar.
- Status remains a non-color text badge.
- Mobile rows switch to labeled two-column cards and keep the track identity full width.

## Issues And Resolution

- P1: The first desktop pass used a `760px` table minimum inside a `559px` card, hiding 다음 학습 and 상태 behind horizontal scroll.
- Resolution: Reduced the desktop grid minimum to `500px`, tightened column gaps, and retained the mobile card breakpoint.

## Verification

- Desktop table client width: `517px`.
- Desktop table scroll width: `517px`.
- Mobile table client width: `272px`.
- Mobile table scroll width: `272px`.
- Browser console errors: `0`.
- All three titles and all six cells remain inside the card bounds.

final result: passed
