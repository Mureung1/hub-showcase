# Dynamic Asset Requirements

## Purpose

기간 내 구현으로 승격된 확장 기능을 React 웹앱에서 동적으로 적용하기 위한 에셋, manifest, 상태 연결 요구사항이다. 다음 에셋 제작 세션은 이 문서를 기준으로 결과물을 만든다.

## Scope

기간 내 구현 대상:

- 개인화 AI 매니저
- 하루의 흐름을 WEB에 반영
- 현실 픽셀화 TV
- Single-plane Pepper projection mode
- 공개 퀘스트 탐색
- 웹캠 손 제스처 탐색
- 캐릭터 애니메이션
- 외적 성장
- 데스크톱 배경 테마
- 창 테마
- 기억 조각
- 사운드
- blink focus scene
- 사다리/평지/창탈출 interaction object
- Stage 회귀 외형 선택
- 퀘스트 능력치 growth

## Common Asset Rules

- UI 텍스트, 버튼 라벨, 입력값은 이미지에 넣지 않는다.
- Pixel art는 transparent PNG 또는 WebP를 우선한다.
- 작은 아이콘은 48x48, 루미 기본 sprite는 64x64 기준으로 제작한다.
- Sprite sheet는 동일한 frame size, 동일한 여백, 동일한 scale을 유지한다.
- 모든 asset은 `public/assets/` 아래 역할별 폴더에 저장한다.
- React는 asset path를 직접 하드코딩하지 않고 manifest data를 통해 참조한다.
- `prefers-reduced-motion`에서는 animation을 정지하거나 1 frame fallback을 사용한다.
- Camera, microphone, public data 기능은 명시적 동의와 fallback UI가 필요하다.
- Character interaction object는 sprite에 UI chrome을 굽지 않고 React/CSS object layer에서 위치, resize, collision을 처리한다.
- Sound assets must not autoplay before user interaction.

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
public/assets/projection/
public/assets/social-world/
public/assets/gestures/
public/assets/interaction-objects/
public/assets/fx/blink/
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
  states: Array<"idle" | "focused" | "happy" | "recovering" | "resting" | "hover" | "hanging" | "hiding" | "climbing" | "jumping" | "landing" | "walking_outside">;
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
- `lumi-hanging-sheet.png`: window-edge hanging interaction
- `lumi-hiding-sheet.png`: full-body hiding interaction rendered behind a window layer
- `lumi-climbing-sheet.png`: ladder climbing interaction
- `lumi-jumping-sheet.png`: platform jump interaction
- `lumi-landing-sheet.png`: platform landing interaction
- `lumi-walking-outside-sheet.png`: window escape overlay interaction
- level or growth variants: `lumi-growth-01.png`, `lumi-growth-02.png`, `lumi-growth-03.png`
- accessory overlays: small hat, badge, glow, memory shard, theme charm

Window interaction notes:

- `hanging` and `hiding` are interaction states, not manager mood states.
- Do not bake full XP window chrome into the sprite sheet.
- React/CSS should provide the window edge, z-index layer, and optional clipping mask.
- `hanging` keeps a stable grip or top-anchor point across frames.
- `hiding` keeps the full character inside each frame; React/CSS places it behind the window by z-index so the window occludes the sprite.
- `climbing` keeps stable hand/foot contact points so ladder resize can preserve progress ratio.
- `jumping` and `landing` should keep a predictable floor anchor.
- `walking_outside` uses the desktop overlay coordinate system, not the manager window coordinate system.

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
- 픽셀 TV projection-connected variant

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
- Projection jar or transparent plate prop
- Wallpaper roll
- Window theme chip
- Meadow badge
- Memory fragment
- Recovery seed or repair part
- Ladder object
- Flat platform object
- Stage return token
- Stat badge

### Sound

```ts
interface SoundAsset {
  id: string;
  src: string;
  event: "complete" | "recovery" | "level_up" | "hover" | "open_window" | "cyber_purr" | "blink_transition" | "climb" | "jump" | "window_escape";
  defaultVolume: number;
}
```

Needed sounds:

- Quest complete
- Recovery success
- Level up
- Window open
- Gentle hover or select
- Default cyber-purr voice for each manager/persona
- Blink transition soft focus sound
- Ladder climb
- Platform jump/land
- Window escape

Default behavior:

- sound is muted until the user enables it.
- no autoplay BGM before user interaction.

### Interaction Object

```ts
interface InteractionObjectAsset {
  id: string;
  type: "ladder" | "platform" | "window_escape_edge";
  src: string;
  hoverSrc?: string;
  resizeAxis: "vertical" | "horizontal" | "none";
  anchorPoints: Array<"top" | "bottom" | "left" | "right" | "center">;
}
```

Needed objects:

- Ladder: vertical resize, climb progress ratio preserved during resize.
- Flat platform: horizontal resize only, jump/land target.
- Window escape edge: trigger area for leaving the window into desktop overlay.

### Blink Focus FX

```ts
interface BlinkFocusEffectAsset {
  id: string;
  mode: "start_day" | "end_day";
  overlaySrc?: string;
  durationMs: number;
  blurFrom: number;
  blurTo: number;
  reducedMotion: "fade" | "none";
}
```

## Feature Requirements

### Personalized AI Manager

Needs data more than images:

- ManagerContext from `/api/manager-context`
- recent Quest Events
- user profile preferences
- failure/recovery summary
- reward hints
- rule fallback line when LLM is unavailable
- persona id, tone, boundaries, preferred choice style
- direct choices selected by the user
- indirect preference signals from completion/failure/recovery history

Optional assets:

- thinking indicator sprite
- memory fragment glow
- gentle response FX
- persona-specific cyber-purr sound

### Web Day Flow

Needs:

- theme by local time: morning, afternoon, evening, night
- quest state overlay: draft, active, success, failed, recovery
- wallpaper and Lumi idle variation for each state
- CSS variable mapping for window/taskbar color
- blink focus transition at day start/end or manager focus scenes

### Character Interaction Objects

Needs:

- object rect state: x, y, width, height
- resize constraint: ladder vertical, platform horizontal
- proximity trigger between Lumi and object
- state transitions: idle -> climbing -> transfer/jump -> landing -> idle
- resize during climbing preserves normalized progress, not absolute pixel position
- desktop overlay layer for window escape

Implementation notes:

- Start with deterministic anchor/collision checks, not a full physics engine.
- Keep mouse/touch controls as the primary interaction.
- Use `prefers-reduced-motion` to replace climb/jump with short pose changes.

### Stage Return and Stats

Needs:

- unlocked stage list from level/reward history
- selected appearance stage setting
- stat taxonomy: diligence, persistence, creativity, knowledge, strength, agility, stamina, charm
- Quest Event metadata mapping quest type/difficulty to stat deltas
- UI summary that explains growth without turning quests into pressure

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

### Single-plane Pepper Projection Mode

Needs:

- black fullscreen or windowed projection layout
- single-view Lumi sprite/video with bright glow and transparent-safe edges
- optional projection jar/plate guide asset
- `pixel-tv` icon transform state: default TV -> projection-connected app icon
- right-click context action plan: TV icon -> properties -> transform
- minimum controls: exit, brightness hint, mute
- no 4-way pyramid layout for this mode

Interaction rules:

- The transform action should not appear in visible UI until implemented.
- The transform should be reversible or represented as a mode binding.
- Projection output should avoid UI labels inside the reflected area.
- Use high contrast: black background, bright character, minimal UI chrome.
- Reduced motion fallback should use one frame plus fade.

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
8. Blink focus scene prototype
9. Character interaction object prototype: ladder/platform/window escape
10. Stage return and stat growth mapping
11. AI manager adapter using ManagerContext and Persona data
12. Pixel TV canvas prototype
13. Single-plane Pepper projection mode prototype
14. Public quest exploration prototype
15. Gesture input adapter prototype

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run build`
- Manual check: hover icons, Lumi animation, theme switch, reduced motion, muted sound
- Manual check: camera permission denied path
- Manual check: public quest exploration never shows private records
