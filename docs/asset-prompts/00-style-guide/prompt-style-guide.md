# Prompt Style Guide

## 핵심 시각 방향

서비스의 이미지는 “전자 생물이 나를 기다리는 조용한 방”을 중심으로 한다. 너무 사이버틱한 AI 비서가 아니라, 사용자의 루틴과 실패를 같이 받아들이는 페이스메이커다.

- 감성: 고즈넉함, 따뜻함, 기다림, 성장, 복구
- 금지 감성: 감시, 압박, 경고, 과도한 게임 HUD, 화려한 사이버펑크
- 공간: 픽셀 로파이 방, 작은 오두막, Windows XP풍 데스크톱 셸
- 매니저: 현실 생물이 아니라 작은 전자 생물
- 조명: 하루 흐름을 표현하는 창밖 색과 실내 램프

## 마스터 프롬프트

```text
A cozy pixel art self-growth web app world, a small electronic creature manager waiting in a quiet lofi room, warm muted colors, nostalgic desktop game mood, gentle light from a window, wooden desk, tiny TV screen, books, calendar, soft blanket, calm atmosphere, readable silhouettes, hand placed pixel details, limited palette, no text, no logo, no watermark
```

## 마스터 네거티브 프롬프트

```text
photorealistic, 3d render, anime illustration, vector art, cyberpunk neon, dark horror, aggressive mascot, mobile gacha UI, noisy interface, text, letters, numbers, logo, watermark, blurry pixels, over-detailed clutter
```

## 색상 기준

- Base wood: `#8a5a37`, `#b8794a`, `#e0b373`
- Warm light: `#f6d78a`, `#fff1bc`
- Night blue: `#31445f`, `#5f7796`
- Grass/plant: `#6ea75d`, `#3f7f4c`
- XP shell accent: `#2f67d8`, `#5da8ff`, `#ece9d8`
- Manager glow: `#86f7d1`, `#f3fff7`

## 생성 후 체크리스트

- 2배/4배 확대했을 때 형태가 읽히는가?
- 텍스트가 이미지 안에 섞여 있지 않은가?
- UI 버튼으로 써도 잘리지 않는가?
- React에서 배치할 때 배경과 캐릭터를 분리할 수 있는가?
- 실패 상태가 우울/처벌처럼 보이지 않고 “기다림/리밸런싱”처럼 보이는가?
