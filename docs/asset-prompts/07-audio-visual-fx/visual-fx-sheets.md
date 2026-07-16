# Visual FX Sheets

## 목적

퀘스트 완료, 레벨업, 복구 퀘스트 성공, 성장 정체 상태를 표현하는 작은 효과 에셋 프롬프트다.

## 출력 규격

- 권장 크기: `1024x1024`
- 구성: 4행 x 4열 sprite sheet
- 배경: transparent
- 텍스트 없음
- Lumi sprite sheet와 별도 레이어로 렌더링한다.
- FX 프레임의 glow가 캐릭터 baseline이나 중심점을 바꾸는 방식으로 합쳐지면 안 된다.
- `prefers-reduced-motion`에서는 첫 프레임만 보여도 의미가 읽혀야 한다.

## 완료 효과 프롬프트

```text
Create a 4 by 4 transparent pixel art sparkle animation sheet for completing a small quest in a cozy self-growth web app. Gentle warm sparkles, tiny stars, soft dust pixels, not explosive, not arcade-like, calm satisfying feedback, warm yellow and mint highlights, no text, no logo, consistent frame spacing.
```

## 레벨업 효과 프롬프트

```text
Create a 4 by 4 transparent pixel art level-up glow animation for a small electronic creature manager. Soft circular glow, tiny floating memory shards, warm light rising gently, celebratory but quiet, no text, no numbers, no logo, cozy lofi palette.
```

## 복구 성공 효과 프롬프트

```text
Create a 4 by 4 transparent pixel art recovery success animation. A tiny dim light becomes warm again, small seed sprout opens, repaired gear sparkles softly, calm hopeful mood, no shame, no punishment, no text, no logo.
```

## 성장 정체 상태 효과 프롬프트

```text
Create subtle pixel art idle effects for growth plateau state: slow breathing glow, quiet lamp flicker, small waiting dots without text, gentle blue warm light, calm and patient mood, transparent background, no sad face, no failure warning.
```

## Manifest 연결

- `quest-complete-sheet.png`: quest completion, reward hover, happy reaction
- `recovery-success-sheet.png`: recovery completion, memory fragment hover
- `level-up-sheet.png`: level up, growth unlock
- FX는 `public/assets/fx/`에 저장하고 캐릭터 이미지 안에 합치지 않는다.

## 검수 메모

- `asset-quality-verifier` skill로 sheet grid, 투명 배경, 텍스트 없음, 작은 크기 인식성을 확인한다.
- FX가 너무 강해서 XP 창 텍스트나 Lumi 표정을 가리면 재생성한다.
