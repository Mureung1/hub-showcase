# XP Desktop Design System

기준 이미지: `docs/design-references/concept.png` (600 x 515)

이 문서는 기준 이미지의 색, 타이포그래피, 모서리, 여백, 창, 목록과 보상 슬롯을 현재 전자 생물 매니저 서비스에 맞게 재구성한 시각 규칙이다.

## 1. 시각 방향

- XP 데스크톱 자체가 앱 셸이다.
- 자연 배경 위에 작은 시스템 창을 겹쳐 배치한다.
- 파란 제목 표시줄, 베이지 창 본문, 1px 입체 테두리를 기본 문법으로 사용한다.
- 현대적인 대형 카드, 넓은 여백, 흐린 그림자와 과도한 둥근 모서리를 사용하지 않는다.
- 픽셀 캐릭터와 아이콘은 선명하게, 텍스트와 폼은 실제 UI 요소로 렌더링한다.
- 정보 밀도는 중간 수준으로 유지하고 한 창에는 한 작업만 둔다.

## 2. CSS 토큰

```css
:root {
  /* Typography */
  --font-ui: Tahoma, "Malgun Gothic", "Gulim", sans-serif;
  --font-pixel: "Galmuri11", "DungGeunMo", "Gulim", monospace;

  --font-size-2xs: 10px;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 15px;
  --font-size-xl: 18px;
  --font-size-display: 22px;

  --font-weight-normal: 400;
  --font-weight-strong: 700;

  --line-height-tight: 1.2;
  --line-height-ui: 1.4;
  --line-height-copy: 1.6;
  --letter-spacing: 0;

  /* Desktop environment */
  --desktop-sky-top: #0879db;
  --desktop-sky-mid: #59c5ef;
  --desktop-sky-bottom: #c9f1ff;
  --desktop-grass-deep: #438a37;
  --desktop-grass: #69aa45;
  --desktop-grass-light: #9acb55;
  --desktop-icon-text: #ffffff;
  --desktop-icon-shadow: #174d81;

  /* XP chrome */
  --xp-blue-950: #003c74;
  --xp-blue-900: #0645a5;
  --xp-blue-800: #0a58bd;
  --xp-blue-700: #1673dd;
  --xp-blue-600: #2a8bf2;
  --xp-blue-500: #4aa3ff;
  --xp-blue-highlight: #7fc5ff;
  --xp-blue-inactive: #7388a7;

  --xp-title-text: #ffffff;
  --xp-title-shadow: #00356b;
  --xp-focus: #316ac5;

  /* Window and content surfaces */
  --surface-window: #ece9d8;
  --surface-window-warm: #f4f0e5;
  --surface-raised: #f8f6ee;
  --surface-inset: #d6d0c4;
  --surface-dialog: #f1ede2;
  --surface-selected: #d7e8ff;
  --surface-disabled: #e3e0d5;

  /* Text */
  --text-primary: #1f1f1f;
  --text-secondary: #55514a;
  --text-muted: #77736c;
  --text-disabled: #9b978e;
  --text-link: #0b54b5;
  --text-on-blue: #ffffff;

  /* Borders and bevels */
  --border-window: #003c74;
  --border-strong: #245ea8;
  --border-control: #7f9db9;
  --border-dark: #716f64;
  --border-mid: #aca899;
  --border-light: #ffffff;
  --border-soft: #c8c2b5;

  /* Semantic colors */
  --status-success: #339943;
  --status-success-dark: #17752c;
  --status-warning: #d58b00;
  --status-danger: #d94735;
  --status-info: #1673dd;
  --reward-exp: #c98300;
  --exp-track: #c8c3b9;
  --exp-fill: #43a54b;

  /* Spacing: compact XP rhythm */
  --space-0: 0;
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 6px;
  --space-4: 8px;
  --space-5: 12px;
  --space-6: 16px;
  --space-7: 20px;
  --space-8: 24px;
  --space-9: 32px;

  /* Geometry */
  --radius-none: 0;
  --radius-control: 2px;
  --radius-panel: 4px;
  --radius-window: 7px;
  --radius-window-bottom: 3px;
  --radius-round: 999px;

  --border-width: 1px;
  --window-title-height: 26px;
  --window-control-size: 18px;
  --control-height-sm: 22px;
  --control-height-md: 26px;
  --taskbar-height: 34px;
  --desktop-icon-width: 72px;
  --inventory-slot-size: 54px;

  /* Elevation: hard, compact, non-modern */
  --shadow-window: 3px 4px 0 rgb(0 35 84 / 28%);
  --shadow-control: 1px 1px 0 rgb(65 62 54 / 35%);
  --shadow-inset: inset 1px 1px 0 #716f64,
                  inset -1px -1px 0 #ffffff;
  --shadow-raised: inset 1px 1px 0 #ffffff,
                   inset -1px -1px 0 #716f64;

  /* Motion */
  --duration-fast: 80ms;
  --duration-ui: 140ms;
  --duration-window: 180ms;
  --duration-reaction: 700ms;
  --ease-ui: steps(2, end);
  --ease-window: ease-out;

  /* Layers */
  --z-desktop: 0;
  --z-icons: 10;
  --z-pet-world: 20;
  --z-window: 100;
  --z-active-window: 200;
  --z-reaction: 240;
  --z-taskbar: 300;
  --z-dialog: 400;
}
```

## 3. 타이포그래피

### 기본 UI

```css
body,
button,
input,
select,
textarea {
  font-family: var(--font-ui);
  font-size: var(--font-size-md);
  line-height: var(--line-height-ui);
  letter-spacing: var(--letter-spacing);
  color: var(--text-primary);
}
```

- 창 제목: 12px, 700, 흰색, 한 줄.
- 데스크톱 아이콘: 12px, 흰색, 짙은 파란 1px 그림자.
- 폼 라벨과 목록: 12~13px.
- 버튼: 12px, 400. 주 행동만 700 사용 가능.
- 매니저 레벨: 18px, 700.
- 매니저 대사: 13px, 줄높이 1.6, 최대 2줄.
- EXP와 보조 정보: 10~11px.
- 화면 너비에 따라 글자 크기를 확대하지 않는다.

픽셀 폰트는 캐릭터 이름, 레벨, 짧은 상태 라벨처럼 게임성이 필요한 짧은 텍스트에만 사용한다. 긴 설명과 입력 필드에는 `--font-ui`를 사용한다. `Galmuri11` 또는 `DungGeunMo`를 사용할 경우 라이선스를 확인한 로컬 WOFF2 에셋으로 제공한다.

## 4. 데스크톱 배경

- 상단 55~60%는 선명한 파란 하늘, 하단은 초원 이미지로 구성한다.
- CSS 그라디언트만으로 최종 배경을 만들지 않는다. 생성하거나 확보한 픽셀 배경 에셋을 사용한다.
- 하늘은 아이콘과 창을 읽기 위한 여백 영역이다.
- 초원은 매니저가 창 밖에서 걸어 다닐 수 있는 월드 레이어다.
- 배경 위에 어두운 틴트나 블러를 추가하지 않는다.
- 배경은 `cover`보다 주요 지평선이 유지되는 `center bottom / cover`를 우선한다.

```css
.desktop {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background-color: var(--desktop-sky-mid);
  background-image: var(--desktop-wallpaper);
  background-position: center bottom;
  background-size: cover;
  image-rendering: pixelated;
}
```

## 5. XP 창

창은 앱의 기본 컨테이너다. 페이지 섹션을 별도 카드로 감싸지 않는다.

```css
.xp-window {
  position: absolute;
  overflow: hidden;
  color: var(--text-primary);
  background: var(--surface-window);
  border: 1px solid var(--border-window);
  border-radius: var(--radius-window) var(--radius-window)
    var(--radius-window-bottom) var(--radius-window-bottom);
  box-shadow: var(--shadow-window);
}

.xp-window__titlebar {
  height: var(--window-title-height);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-2) 0 var(--space-3);
  color: var(--xp-title-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-strong);
  text-shadow: 1px 1px 0 var(--xp-title-shadow);
  background: linear-gradient(
    180deg,
    var(--xp-blue-600) 0%,
    var(--xp-blue-700) 18%,
    var(--xp-blue-800) 72%,
    var(--xp-blue-900) 100%
  );
  border-bottom: 1px solid var(--xp-blue-950);
}

.xp-window__body {
  padding: var(--space-5);
  background: var(--surface-window);
}
```

- 활성 창만 선명한 파란 제목 표시줄을 사용한다.
- 비활성 창은 `--xp-blue-inactive` 기반으로 채도를 낮춘다.
- 창 본문 패딩은 기본 12px, 복잡한 퀘스트 폼은 16px까지 허용한다.
- 창 바깥 모서리만 7px다. 내부 패널에 같은 곡률을 반복하지 않는다.
- 창 그림자는 흐린 현대식 그림자 대신 짧고 단단한 하드 섀도를 사용한다.

## 6. 창 제어 버튼

```css
.xp-window-control {
  width: var(--window-control-size);
  height: var(--window-control-size);
  display: grid;
  place-items: center;
  padding: 0;
  color: #ffffff;
  background: var(--xp-blue-600);
  border: 1px solid #ffffff;
  border-radius: var(--radius-control);
  box-shadow: inset 1px 1px 0 var(--xp-blue-highlight),
    inset -1px -1px 0 var(--xp-blue-950);
}

.xp-window-control--close {
  background: var(--status-danger);
}
```

- 최소화, 최대화, 닫기는 익숙한 기호만 사용한다.
- 아이콘 버튼에는 시각 텍스트를 넣지 않는다.
- 클릭 영역은 시각 크기보다 넓게 확보하되 제목 표시줄 높이는 유지한다.

## 7. 버튼과 입력 컨트롤

```css
.xp-button {
  min-width: 76px;
  height: var(--control-height-md);
  padding: 0 var(--space-5);
  color: var(--text-primary);
  background: var(--surface-raised);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-raised);
}

.xp-button:active,
.xp-button[aria-pressed="true"] {
  background: var(--surface-inset);
  box-shadow: var(--shadow-inset);
}

.xp-button:focus-visible,
.xp-input:focus-visible {
  outline: 1px dotted var(--text-primary);
  outline-offset: -4px;
}

.xp-input,
.xp-select,
.xp-textarea {
  min-height: var(--control-height-md);
  padding: var(--space-2) var(--space-3);
  background: #ffffff;
  border: 1px solid var(--border-control);
  border-radius: var(--radius-none);
  box-shadow: inset 1px 1px 0 rgb(0 0 0 / 12%);
}
```

- 기본 행동은 오른쪽 아래에 둔다.
- 한 창의 주요 버튼은 1개를 원칙으로 한다.
- 비활성 버튼은 회색 표면과 흐린 텍스트로 표시한다.
- 버튼에 강한 그라디언트, 알약 모서리, 큰 아이콘을 사용하지 않는다.

## 8. 목록, 체크박스와 퀘스트

```css
.quest-row {
  min-height: 34px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-soft);
}

.quest-row[aria-selected="true"] {
  background: var(--surface-selected);
}

.quest-row__reward {
  color: var(--reward-exp);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
```

- 퀘스트는 카드가 아니라 한 창 안의 행 목록으로 표시한다.
- 체크 상태는 녹색 픽셀 체크 아이콘으로 표시한다.
- 완료, 진행, 실패는 색상만으로 구분하지 않고 아이콘과 텍스트를 함께 사용한다.
- EXP는 오른쪽 정렬하고 한 줄로 유지한다.

## 9. 패널과 카드 사용 규칙

이 디자인에서 카드는 기본 레이아웃이 아니다. 필요한 경우 다음 두 종류만 사용한다.

### 인셋 정보 패널

매니저 대화, 프로필 요약, 실패 이유처럼 창 내부에서 정보 영역을 구분할 때 사용한다.

```css
.xp-inset-panel {
  padding: var(--space-4);
  background: var(--surface-dialog);
  border: 1px solid var(--border-mid);
  border-radius: var(--radius-panel);
  box-shadow: inset 1px 1px 0 var(--border-soft),
    inset -1px -1px 0 var(--border-light);
}
```

### 보상 슬롯

보상 인벤토리에서 반복 아이템 하나를 표시할 때만 사용한다.

```css
.reward-slot {
  width: var(--inventory-slot-size);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  position: relative;
  background: var(--surface-raised);
  border: 1px solid var(--border-mid);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-inset);
}
```

금지:

- 창 안에 다시 큰 카드 컨테이너 넣기
- 모든 기능을 둥근 카드로 나누기
- 카드마다 독립적인 그림자 사용
- 8px를 넘는 카드 곡률
- 흰색 카드가 바탕화면 위에 직접 떠 있는 구조

## 10. 매니저 창

- 캐릭터가 가장 큰 시각 요소다.
- 레벨과 EXP는 캐릭터 아래 또는 옆 한 줄에 둔다.
- 상태는 픽셀 아이콘과 2~5글자 라벨로 압축한다.
- 대사는 창 하단의 고정된 2줄 인셋 패널에 표시한다.
- 대화 패널에 `루미`라는 화자 이름을 반복하지 않는다.
- 완료 순간의 빈 말풍선은 캐릭터 위 반응 효과 슬롯에 잠깐 나타난다.
- 말풍선 안에는 문장을 넣지 않는다.

```css
.manager-dialogue {
  min-height: 52px;
  max-height: 52px;
  padding: var(--space-4) var(--space-5);
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-md);
  line-height: var(--line-height-copy);
  background: var(--surface-dialog);
  border: 1px solid var(--border-mid);
  border-radius: var(--radius-panel);
  box-shadow: inset 1px 1px 0 var(--border-soft),
    inset -1px -1px 0 var(--border-light);
}

.manager-reaction-slot {
  width: 40px;
  height: 28px;
  pointer-events: none;
  image-rendering: pixelated;
}
```

## 11. EXP와 상태

```css
.exp-bar {
  width: 112px;
  height: 10px;
  overflow: hidden;
  background: var(--exp-track);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius-round);
  box-shadow: inset 1px 1px 0 rgb(0 0 0 / 20%);
}

.exp-bar__fill {
  height: 100%;
  background: var(--exp-fill);
  border-right: 1px solid var(--status-success-dark);
}
```

- EXP는 녹색 단색을 기본으로 한다.
- 보상 EXP 텍스트는 금색을 사용한다.
- 실패 상태에 붉은 화면, 캐릭터 쇠약, EXP 감소 연출을 사용하지 않는다.
- 복구 상태는 회전 또는 수리 형태의 픽셀 아이콘으로 표현한다.

## 12. 데스크톱 아이콘

```css
.desktop-icon {
  width: var(--desktop-icon-width);
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  color: var(--desktop-icon-text);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-tight);
  text-align: center;
  text-shadow: 1px 1px 0 var(--desktop-icon-shadow);
  background: transparent;
  border: 0;
}

.desktop-icon:focus-visible,
.desktop-icon[aria-selected="true"] {
  background: rgb(49 106 197 / 52%);
  outline: 1px dotted #ffffff;
}
```

- 아이콘은 픽셀 PNG/WebP 또는 스타일이 일치하는 전용 아이콘을 사용한다.
- 일반 Lucide 아이콘을 큰 데스크톱 아이콘으로 그대로 사용하지 않는다.
- 아이콘 사이 세로 간격은 12~16px로 유지한다.

## 13. 작업표시줄

```css
.xp-taskbar {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--z-taskbar);
  height: var(--taskbar-height);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  color: var(--text-on-blue);
  background: linear-gradient(
    180deg,
    #2589ef 0%,
    #0f66d0 45%,
    #0952bd 100%
  );
  border-top: 1px solid #6eb8ff;
}

.xp-start-button {
  height: 100%;
  padding: 0 var(--space-6);
  color: #ffffff;
  font-weight: var(--font-weight-strong);
  background: linear-gradient(180deg, #62b94f 0%, #2f8e2f 100%);
  border: 0;
  border-right: 1px solid #1c6f25;
  border-radius: 0 10px 10px 0;
}
```

- 시작 버튼만 녹색을 사용한다.
- 열린 창 버튼은 파란 직사각형이며 활성 창만 밝게 표시한다.
- 트레이에는 시간과 필요한 최소 상태만 둔다.
- 작업표시줄 위로 콘텐츠가 가려지지 않게 데스크톱 하단 여백을 확보한다.

## 14. 반응형 규칙

- 데스크톱 1024px 이상: 창을 겹쳐 배치한다.
- 768~1023px: 창 크기를 줄이고 겹침을 제한한다.
- 767px 이하: XP 외형은 유지하되 창을 안전한 단일 열로 정렬한다.
- 모바일에서도 창 제목 표시줄과 작업표시줄을 제거하지 않는다.
- 모바일 드래그는 선택 기능이며 기본 스크롤과 충돌하지 않게 한다.
- 입력 필드와 버튼 텍스트가 잘리지 않게 최소 너비를 보장한다.

```css
@media (max-width: 767px) {
  .xp-window {
    position: relative;
    inset: auto !important;
    width: calc(100% - 16px);
    margin: var(--space-4) auto;
  }

  .desktop {
    overflow: auto;
    padding-bottom: calc(var(--taskbar-height) + var(--space-5));
  }
}
```

## 15. 모션 규칙

- 창 열기: 140~180ms의 짧은 등장.
- 버튼 누름: 즉시 인셋 상태로 전환.
- 픽셀 캐릭터: `steps()` 기반 프레임 애니메이션.
- 완료 반응 말풍선: 약 700ms 표시 후 사라짐.
- 창 드래그에는 전환 애니메이션을 적용하지 않는다.
- `prefers-reduced-motion`에서 캐릭터 이동과 반응 효과를 정지하거나 단순화한다.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

## 16. 구현 우선순위

1. 색상, 폰트, 간격 토큰을 `src/styles.css`에 도입한다.
2. 공통 XP 창 프레임과 제목 표시줄을 통일한다.
3. 버튼, 입력, 체크박스, 인셋 패널을 공통 클래스로 만든다.
4. 오늘의 퀘스트를 카드가 아닌 행 목록으로 정리한다.
5. 매니저 창을 캐릭터, EXP, 상태 아이콘, 하단 대화 패널로 재구성한다.
6. 작업표시줄과 데스크톱 아이콘을 기준 이미지 밀도에 맞춘다.
7. 전용 픽셀 배경, 캐릭터와 아이콘 에셋을 적용한다.
8. 기준 이미지 크기 600 x 515와 실제 데스크톱·모바일 뷰포트에서 비교 검증한다.

## 17. 금지 사항

- 보라색 또는 청보라색 SaaS 그라디언트
- 유리 효과, backdrop blur, glow
- 12px 이상의 카드 모서리
- 페이지를 카드 그리드로 채우기
- 큰 프로젝트 제목이나 설명형 히어로
- 베이지색만으로 화면 전체를 덮기
- 시스템 UI에 과도한 픽셀 폰트 사용
- 일반 이모지를 최종 상태 아이콘으로 사용
- 배경 이미지 위에 어두운 오버레이 적용
- 창마다 서로 다른 패딩, 버튼, 제목 표시줄 사용
- 상태 변화로 창 크기와 주변 레이아웃 이동
