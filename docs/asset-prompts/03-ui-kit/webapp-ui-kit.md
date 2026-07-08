# Webapp Pixel UI Kit

## 목적

React로 직접 그리는 UI와 PNG 에셋을 섞어 쓸 수 있는 버튼, 창, 패널, 아이콘 세트 프롬프트다.

## 출력 규격

- 권장 크기: `1024x1024`
- 구성: object sheet
- 배경: transparent
- 텍스트: 없음
- 잘라 쓰기 쉬운 여백 유지

## 기본 프롬프트

```text
Create a transparent pixel art UI asset sheet for a cozy self-growth quest web app. Include blank panel frames, small quest card frames, progress bar frames, rounded pixel buttons, checkbox icons, calendar icon, clock icon, small book icon, tiny lamp icon, reward box icon, profile badge icon, recovery quest icon, privacy toggle icon, and tiny folder icon. Warm lofi cabin palette with a subtle early desktop UI influence, readable at small size, no text, no numbers, no logos, no watermark, consistent pixel thickness, reusable web UI components.
```

## 네거티브 프롬프트

```text
text, numbers, logo, watermark, glossy 3d buttons, neon cyber UI, realistic icons, vector flat icons, inconsistent icon sizes, too many colors, thin unreadable lines
```

## React 결합 메모

- 버튼/카드 텍스트는 반드시 React 텍스트로 표시한다.
- PNG는 장식 프레임, 아이콘, 배경 질감으로만 사용한다.
- 9-slice가 필요한 패널은 모서리/가로/세로/중앙 타일을 따로 잘라둔다.
