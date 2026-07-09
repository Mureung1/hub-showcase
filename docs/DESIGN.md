---
name: Soft Sleep Blue
description: 첨부 레퍼런스 기반 디자인 토큰. 파우더 블루 배경, 흰 모바일 카드, 귀엽고 깔끔한 라운드 한글 폰트, 둥근 파스텔 카드와 블루 액션이 핵심이다.
tokens:
  css: true
---

# 디자인 토큰

> 기준: 답냥이 모바일 데모 UI. 레퍼런스의 수면·플레이리스트 앱처럼 부드럽고 가벼운 분위기를 유지하되, 메시지 작성 도우미에서는 읽기 쉬움과 빠른 선택을 우선한다.

## 핵심 규칙

- **주색은 차분한 스카이 블루를 쓴다.** CTA, 선택 상태, 진행 버튼, 활성 탭에만 강하게 사용한다.
- **배경은 파우더 블루, 앱 표면은 거의 흰색으로 분리한다.** 바깥 배경은 차갑고 부드럽게, 실제 입력·결과 영역은 선명하게 읽히는 흰 표면을 쓴다.
- **제목은 잉크색으로 또렷하게, 본문은 부드러운 차콜로 둔다.** 보조 정보는 블루 그레이로 낮춘다.
- **카드는 큰 라운드와 약한 그림자로 구분한다.** 외곽선보다 여백, 색 면, 둥근 모서리로 계층을 만든다.
- **파스텔 보조색은 상태·카테고리 구분에만 쓴다.** 한 화면이 단색 블루로만 보이지 않도록 피치, 버터, 민트, 라벤더를 제한적으로 섞는다.
- **여백은 넉넉하게 잡되, 모바일에서는 카드 내부 밀도를 유지한다.** 화면 패딩 24px, 카드 내부 18~22px를 기본으로 한다.

## CSS Variables

```css
:root {
  /* Color: core */
  --color-primary: #6caed1;
  --color-primary-hover: #5a9fc4;
  --color-primary-pressed: #4b8fb4;
  --color-primary-soft: #d8edf8;
  --color-primary-muted: #a9cddd;

  --color-bg: #dcebf3;
  --color-bg-deep: #c9dfe9;
  --color-surface: #ffffff;
  --color-surface-soft: #f7fbfd;
  --color-surface-tint: #eef7fb;

  --color-text: #151515;
  --color-text-body: #34343a;
  --color-text-muted: #7e8a93;
  --color-text-subtle: #aab5bc;
  --color-text-on-primary: #ffffff;

  --color-border: #e7eef2;
  --color-border-strong: #d5e2e9;
  --color-disabled: #d9e3e8;
  --color-backdrop: rgba(122, 160, 180, 0.18);

  /* Color: pastel cards */
  --color-card-blue: #d6edf8;
  --color-card-blue-strong: #b8ddeb;
  --color-card-peach: #f7dfda;
  --color-card-butter: #fbefd5;
  --color-card-mint: #e2f1ea;
  --color-card-lavender: #ece8f7;

  /* Color: feedback */
  --color-danger: #c96b63;
  --color-danger-soft: #f6dfdc;
  --color-success: #6ea98c;
  --color-success-soft: #e4f2eb;

  /* Typography */
  --font-sans: "Gowun Dodum", "Nunito", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
  --font-display: "Gowun Dodum", "Nunito", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;

  --font-size-display: 2.375rem;
  --font-size-title: 1.5rem;
  --font-size-subtitle: 1.125rem;
  --font-size-body: 1rem;
  --font-size-body-sm: 0.875rem;
  --font-size-caption: 0.75rem;

  --line-height-display: 1.08;
  --line-height-title: 1.2;
  --line-height-body: 1.5;
  --line-height-caption: 1.35;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 650;
  --font-weight-bold: 750;

  /* Radius */
  --radius-xs: 10px;
  --radius-sm: 14px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-xl: 34px;
  --radius-screen: 36px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Layout */
  --page-padding-x: 24px;
  --page-padding-y: 28px;
  --content-max-width: 430px;
  --screen-padding: 24px;
  --card-padding: 20px;
  --control-height: 48px;
  --bottom-action-height: 64px;

  /* Components */
  --app-shell-bg: var(--color-surface);
  --app-shell-radius: var(--radius-screen);
  --app-shell-shadow: 0 24px 70px rgba(91, 128, 146, 0.22);

  --card-bg: var(--color-surface-soft);
  --card-border: 1px solid var(--color-border);
  --card-radius: var(--radius-lg);
  --card-shadow: 0 12px 30px rgba(91, 128, 146, 0.12);

  --button-radius: var(--radius-pill);
  --button-shadow: 0 12px 26px rgba(108, 174, 209, 0.3);

  --chip-bg: #edf4f7;
  --chip-active-bg: var(--color-primary);
  --chip-radius: var(--radius-pill);

  --input-bg: var(--color-surface-soft);
  --input-border: 1px solid var(--color-border);
  --input-radius: var(--radius-md);
  --focus-ring: 0 0 0 3px rgba(108, 174, 209, 0.24);
}
```

## 색 사용

| 토큰 | 용도 |
|---|---|
| `--color-bg` | 화면 전체 배경. 레퍼런스의 옅은 하늘색 무드 |
| `--color-surface` | 앱 화면, 주요 패널, 읽기 영역 |
| `--color-primary` | 생성 버튼, 복사 버튼, 선택된 칩·카드 |
| `--color-primary-soft` | 선택된 카드의 약한 배경, 안내 배지 |
| `--color-text` | 큰 제목, 카드 제목, 결과 메시지 핵심 텍스트 |
| `--color-text-body` | 본문과 입력 텍스트 |
| `--color-text-muted` | 설명 문구, 글자 수, 보조 메타 |
| `--color-card-*` | 관계 카드, 상태 카드, 예시 카드의 부드러운 구분색 |
| `--color-danger` | 실패, 주의, 빈칸 안내에만 제한 사용 |

## 폰트

- 큰 제목과 브랜드성 문구는 `--font-display`를 쓴다. `Gowun Dodum`처럼 둥글고 손글씨 느낌이 살짝 있는 한글 폰트로 답냥이의 귀여운 인상을 만든다.
- 본문, 버튼, 입력, 결과 메시지는 `--font-sans`를 쓴다. 같은 폰트 계열을 쓰되 충분한 크기와 여백으로 깔끔하게 읽히게 한다.
- 제목은 `--font-weight-bold`, 버튼과 칩은 `--font-weight-semibold`, 본문은 `--font-weight-regular`를 기본으로 한다.
- 긴 한글 본문은 16px 아래로 낮추지 않는다.

## 모서리

| 토큰 | 용도 |
|---|---|
| `--radius-xs` | 작은 배지, 아이콘 버튼 내부 |
| `--radius-sm` | 작은 칩, 작은 썸네일 |
| `--radius-md` | 입력창, 미니 카드 |
| `--radius-lg` | 시나리오 카드, 결과 카드 |
| `--radius-xl` | 히어로 이미지, 큰 미디어 카드 |
| `--radius-screen` | 모바일 앱 껍데기, 전체 데모 프레임 |
| `--radius-pill` | CTA, 목적 칩, 하단 탭 |

## 여백

- 화면 바깥 여백은 `--page-padding-x` 24px, `--page-padding-y` 28px을 기본으로 한다.
- 앱 껍데기 내부 여백은 `--screen-padding` 24px을 쓴다.
- 카드 내부 여백은 `--card-padding` 20px을 기본으로 하되, 작은 카드에서는 16px까지 줄일 수 있다.
- 섹션 간격은 `--space-8` 32px, 관련 요소 간격은 `--space-3` 12px 또는 `--space-4` 16px을 쓴다.
- 하단 주요 CTA는 `--bottom-action-height` 64px로 손가락 터치 영역을 넉넉히 둔다.

## 카드 스타일

```css
.appShell {
  max-width: var(--content-max-width);
  min-height: 100svh;
  margin: 0 auto;
  padding: var(--screen-padding);
  border-radius: var(--app-shell-radius);
  background: var(--app-shell-bg);
  box-shadow: var(--app-shell-shadow);
}

.card {
  padding: var(--card-padding);
  border: var(--card-border);
  border-radius: var(--card-radius);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}

.card[data-selected="true"] {
  border-color: transparent;
  background: var(--color-primary-soft);
  box-shadow: 0 12px 28px rgba(108, 174, 209, 0.22);
}

.primaryButton {
  min-height: var(--bottom-action-height);
  border: 0;
  border-radius: var(--button-radius);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: var(--button-shadow);
  font-weight: var(--font-weight-semibold);
}

.chip {
  min-height: var(--control-height);
  border: 0;
  border-radius: var(--chip-radius);
  padding: 0 var(--space-5);
  background: var(--chip-bg);
  color: var(--color-text-body);
  font-weight: var(--font-weight-medium);
}

.chip[data-selected="true"] {
  background: var(--chip-active-bg);
  color: var(--color-text-on-primary);
}

.input {
  border: var(--input-border);
  border-radius: var(--input-radius);
  background: var(--input-bg);
  color: var(--color-text-body);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
```

카드는 진한 테두리보다 흰 표면, 파스텔 배경, 큰 라운드, 약한 그림자로 구분한다. 답냥이 결과 카드처럼 텍스트가 핵심인 영역은 `--color-surface` 또는 `--color-surface-soft`를 쓰고, 관계 선택 카드처럼 빠른 스캔이 필요한 영역에만 `--color-card-*` 계열을 섞는다.
