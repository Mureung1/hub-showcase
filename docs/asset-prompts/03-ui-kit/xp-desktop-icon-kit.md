# XP Desktop Icon Kit Prompt

## 목적

Windows XP 데스크톱형 퀘스트 매니저의 바탕화면 아이콘을 동적 상태별 PNG로 만든다. React manifest는 `idle`, `hover`, `active`, `disabled` 네 상태를 참조한다.

## 공통 출력 규격

- 파일 크기: `48x48`
- 배경: transparent
- 아이콘 내부 텍스트 없음
- 라벨은 React 텍스트로 렌더링한다.
- 모든 상태는 같은 실루엣, 같은 위치, 같은 크기를 유지한다.
- hover/active/disabled는 색, 하이라이트, 1px 눌림 느낌만 바꾼다.
- active 상태에서 아이콘 자체가 커지거나 crop이 바뀌면 안 된다.

## 필요한 아이콘 ID

- `quest`
- `runner`
- `recovery`
- `manager`
- `profile`
- `journal`
- `trash`
- `rewards`
- `theme-settings`

각 ID는 다음 네 파일로 분리한다.

```text
{id}-idle.png
{id}-hover.png
{id}-active.png
{id}-disabled.png
```

## 기본 프롬프트

```text
Create a Windows XP inspired pixel art desktop icon set for a quest manager web app. Transparent background, each icon exactly 48x48 pixels, crisp pixel edges, warm beige and blue XP palette, consistent outline thickness, consistent top-left light source, readable at small size. Icons needed: today quest clipboard, quest runner executable, recovery quest plus symbol, electronic manager gem, profile folder, record notebook, empty recycle bin, reward inventory box, theme settings chip. No text, no letters, no watermark, no fake UI labels.
```

## 상태별 변형 규칙

### idle

```text
Idle state: normal Windows XP desktop icon, balanced contrast, no glow, no movement, no label text.
```

### hover

```text
Hover state: same icon silhouette, same size, same transparent canvas. Add a subtle 1px bright highlight and a tiny warm sparkle near the top edge. Do not change the icon position, crop, perspective, or scale.
```

### active

```text
Active pressed state: same icon silhouette, same size, same transparent canvas. Slightly darker lower edge and 1px inset pressed feeling, as if selected in Windows XP. Do not shift the icon outside the 48x48 alignment grid.
```

### disabled

```text
Disabled state: same icon silhouette, same size, same transparent canvas. Lower saturation, gray-beige tint, still recognizable at 32px. Do not blur the icon and do not add text.
```

## Negative Prompt

```text
modern flat icon, lucide outline style, photorealistic, 3d glossy app icon, macOS icon, neon, text, letters, watermark, inconsistent perspective, inconsistent scale, icon moves between states, cropped edge, large glow, blurred antialiasing
```

## 검수 메모

- `asset-quality-verifier` skill로 네 상태를 한 줄에 놓고 위치, 크기, 실루엣 차이를 확인한다.
- taskbar 축소 사용 가능성을 고려해 20~24px에서도 의미가 남아야 한다.
