# Electronic Manager Sprite Sheet

## 목적

전자 생물 매니저의 기본 상태를 만들기 위한 sprite sheet 프롬프트다. 매니저는 반려동물이 아니라 “사용자의 목표를 기다리고 같이 성장하는 작은 전자 생물”이다.

## 출력 규격

- 권장 크기: `1024x1024`
- 구성: 4행 x 4열 sprite sheet
- 각 칸: 동일한 크기, 동일한 중심축
- 배경: transparent 또는 단색 크로마키
- 텍스트: 없음

## 기본 프롬프트

```text
Create a 4 by 4 pixel art sprite sheet of a small electronic creature manager for a cozy self-growth web app. The creature is not a real animal; it feels like a tiny digital life form made of soft light, rounded pixels, small antenna-like ears, a simple expressive face, and a warm screen-like glow. Include these states: idle waiting, happy quest complete, focused work mode, thinking, gentle rebalance after failure, sleepy night mode, cheering, holding a tiny quest card, looking at a small calendar, tiny hop animation, sitting beside a lamp, looking at the user, recovering energy, level up glow, calm standby, and neutral profile pose. Warm muted palette, readable silhouette, no text, no logo, transparent background, consistent character design across all frames, hand placed pixel art, 32-bit cozy game feeling.
```

## 네거티브 프롬프트

```text
real animal, dog, cat, human mascot, robot with hard metal armor, scary creature, cyberpunk, aggressive expression, text, numbers, watermark, logo, realistic fur, 3d render, anime character sheet, inconsistent character, tiny unreadable details
```

## 변형 프롬프트: 단호한 페이스메이커

```text
Same character sprite sheet, but the electronic creature manager has a calm and firm pacemaker personality. The expression is supportive but not overly cute, posture is upright, gestures are concise, warm screen glow, tiny quest clipboard, no scolding mood, no text, transparent background.
```

## 변형 프롬프트: 실패 후 복구 상태

```text
A small electronic creature manager in a gentle recovery state after the user missed a quest. It waits quietly beside a warm lamp, holding a smaller recovery quest card, expression calm and steady, not disappointed, not sad, warm muted pixel art, transparent background, no text.
```
