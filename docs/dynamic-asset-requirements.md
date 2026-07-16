# Dynamic Asset Requirements

## Purpose

기간 내 구현으로 승격된 확장 기능을 React 웹앱에서 동적으로 적용하기 위한 에셋, manifest, 상태 연결 요구사항이다. 다음 에셋 제작 세션은 이 문서를 기준으로 결과물을 만든다.

## Scope

기간 내 구현 대상:

- 개인화 AI 매니저
- 하루의 흐름을 WEB에 반영
- 현실 픽셀화 TV
- 공개 퀘스트 탐색
- 웹캠 손 제스처 탐색
- 캐릭터 애니메이션
- 외적 성장
- 데스크톱 배경 테마
- 창 테마
- 기억 조각
- 사운드

## Common Asset Rules

- UI 텍스트, 버튼 라벨, 입력값은 이미지에 넣지 않는다.
- Pixel art는 transparent PNG 또는 WebP를 우선한다.
- 작은 아이콘은 48x48, 루미 기본 sprite는 64x64 기준으로 제작한다.
- Sprite sheet는 동일한 frame size, 동일한 여백, 동일한 scale을 유지한다.
- 모든 asset은 `public/assets/` 아래 역할별 폴더에 저장한다.
- React는 asset path를 직접 하드코딩하지 않고 manifest data를 통해 참조한다.
- `prefers-reduced-motion`에서는 animation을 정지하거나 1 frame fallback을 사용한다.
- Camera, microphone, public data 기능은 명시적 동의와 fallback UI가 필요하다.

## Recommended Folders

```text
public/assets/lumi/
public/assets/icons/
public/assets/themes/wallpapers/
public/assets/themes/window-skins/
public/assets/rewards/
public/assets/memory-fragments/
public/assets/fx/
public/assets/sounds/
public/assets/pixel-tv/
public/assets/social-world/
public/assets/gestures/
```

## Manifest Types

### Sprite Animation

```ts
interface SpriteAnimationAsset {
  id: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  states: Array<"idle" | "focused" | "happy" | "recovering" | "resting" | "hover">;
  reducedMotionFrame: number;
}
```

Needed assets:

- `lumi-idle-sheet.png`
- `lumi-focused-sheet.png`
- `lumi-happy-sheet.png`
- `lumi-recovering-sheet.png`
- `lumi-resting-sheet.png`
- `lumi-hover-sheet.png`
- level or growth variants: `lumi-growth-01.png`, `lumi-growth-02.png`, `lumi-growth-03.png`
- accessory overlays: small hat, badge, glow, memory shard, theme charm

### Desktop Icon

```ts
interface DesktopIconAsset {
  id: string;
  idleSrc: string;
  hoverSrc: string;
  activeSrc?: string;
  disabledSrc?: string;
}
```

Needed icons:

- 오늘의 퀘스트
- QuestRunner.exe
- 매니저
- 내 프로필
- 기록 노트
- 휴지통
- 보상함
- 테마 설정
- 공개 퀘스트 탐색
- 픽셀 TV

### Theme

```ts
interface ThemeAsset {
  id: string;
  name: string;
  unlockCondition: {
    type: "level" | "event_count" | "reward";
    value: number | string;
  };
  wallpaperSrc: string;
  previewSrc: string;
  windowSkin: {
    titlebarTop: string;
    titlebarBottom: string;
    border: string;
    surface: string;
    taskbar: string;
  };
}
```

Needed themes:

- XP meadow default
- Morning sky
- Afternoon work mode
- Sunset review
- Night recovery
- Pixel room hybrid

### Reward Item

```ts
interface RewardAsset {
  id: string;
  type: "object" | "theme" | "accessory" | "memory_fragment" | "sound";
  src: string;
  unlockedBy: string;
  hoverFx?: string;
}
```

Needed rewards:

- Lamp
- Plant
- CRT pixel TV
- Wallpaper roll
- Window theme chip
- Meadow badge
- Memory fragment
- Recovery seed or repair part

### Sound

```ts
interface SoundAsset {
  id: string;
  src: string;
  event: "complete" | "recovery" | "level_up" | "hover" | "open_window";
  defaultVolume: number;
}
```

Needed sounds:

- Quest complete
- Recovery success
- Level up
- Window open
- Gentle hover or select

Default behavior:

- sound is muted until the user enables it.
- no autoplay BGM before user interaction.

## Feature Requirements

### Personalized AI Manager

Needs data more than images:

- ManagerContext from `/api/manager-context`
- recent Quest Events
- user profile preferences
- failure/recovery summary
- reward hints
- rule fallback line when LLM is unavailable

Optional assets:

- thinking indicator sprite
- memory fragment glow
- gentle response FX

### Web Day Flow

Needs:

- theme by local time: morning, afternoon, evening, night
- quest state overlay: draft, active, success, failed, recovery
- wallpaper and Lumi idle variation for each state
- CSS variable mapping for window/taskbar color

### Reality Pixel TV

Needs:

- CRT TV frame asset
- transparent screen mask
- scanline/noise overlay
- default fallback video/image
- canvas pixelizer config: scale, palette, dithering option

Privacy rules:

- webcam frames stay local
- no raw frame upload
- permission prompt before camera use

### Public Quest Exploration

Needs:

- world background or tile sheet
- quest fragment object sprites
- hover/selected object state
- small anonymous quest card UI
- report/block placeholder policy before public release

Data rules:

- default visibility is private
- only `anonymous_public` records appear
- personal names and sensitive text must be filtered before public display

### Webcam Hand Gesture Exploration

Needs:

- pointer/hand cursor asset
- gesture states: open hand, pinch/select, fist/grab, lost tracking
- calibration overlay
- mouse/touch fallback controls

Implementation notes:

- MediaPipe Hand Landmarker can run in a worker or throttled loop.
- Gesture state should update UI state, not replace clickable controls.

## Implementation Order

1. Asset manifest types and sample data
2. Lumi sprite animation component
3. Desktop icon hover/active variants
4. Theme provider for wallpaper/window/taskbar skin
5. Reward inventory and memory fragment rendering
6. Sound manager with mute setting
7. Web day flow state mapping
8. AI manager adapter using ManagerContext
9. Pixel TV canvas prototype
10. Public quest exploration prototype
11. Gesture input adapter prototype

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- Manual check: hover icons, Lumi animation, theme switch, reduced motion, muted sound
- Manual check: camera permission denied path
- Manual check: public quest exploration never shows private records
