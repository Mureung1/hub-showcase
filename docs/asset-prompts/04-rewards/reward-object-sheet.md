# Reward Object Sheet Prompt

## 목적

퀘스트 완료, 복구 성공, 외적 성장, 기억 조각, 테마 해금에 연결할 보상 오브젝트를 만든다. 결과물은 `RewardAsset` manifest와 연결하며, UI 텍스트는 이미지에 넣지 않는다.

## 출력 규격

- 파일명: `public/assets/rewards/reward-object-sheet.png`
- 권장 구성: `4 columns x 2 rows`
- 개별 오브젝트 기준: `48x48`
- 배경: transparent
- 텍스트, 숫자, 라벨 없음
- 오브젝트는 같은 시점, 같은 outline 두께, 같은 조명 방향을 유지한다.

## 프롬프트

```text
Create a cozy Windows XP pixel art reward object sheet for a desktop electronic pet quest app. Transparent background, 4 columns by 2 rows, each object readable at 48x48. Objects: small desk lamp, potted plant, tiny CRT pixel TV, wallpaper roll, window theme chip, meadow badge, glowing memory fragment, recovery seed or repair part. Warm beige, XP blue, meadow green, and soft gold palette. Crisp pixel edges, consistent outline thickness, consistent light from top-left, no text, no numbers, no UI labels, no watermark.
```

## 기억 조각 프롬프트

```text
Create a transparent pixel art memory fragment sheet for completed and recovered quest events. Small collectible shards, gentle glow, warm yellow and mint highlights, readable at 32px and 48px, no text, no faces, no logos. Each shard should feel like a saved effort record, calm and encouraging.
```

## Manifest 연결

- 완료 보상: `reward-object-sheet`, `hoverFx: /assets/fx/quest-complete-sheet.png`
- 복구 보상: `memory-fragment-sheet`, `hoverFx: /assets/fx/recovery-success-sheet.png`
- 테마 보상: `type: "theme"` 또는 `type: "accessory"`로 확장한다.
- 개별 보상은 Quest Event `id` 또는 `result`에서 파생한 `rewardId`로 연결한다.

## Negative Prompt

```text
realistic object, 3d render, neon, cyberpunk, complex clutter, text labels, watermark, blurry, huge shadows, modern flat vector, inconsistent object scale, inconsistent perspective, UI card, speech bubble
```

## 검수 메모

- `asset-quality-verifier` skill로 48px, 32px 축소 인식성을 확인한다.
- hover FX는 보상 오브젝트 안에 굽지 않고 `public/assets/fx/` sprite sheet로 분리한다.
