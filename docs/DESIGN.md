---
name: Soft Sleep Blue
description: 첨부 레퍼런스 기반 디자인 토큰. 파우더 블루 배경, 흰 모바일 카드, 귀엽고 깔끔한 라운드 한글 폰트, 둥근 파스텔 카드와 블루 액션이 핵심이다.
tokens:
  css: true
---

# 디자인 토큰

> 기준: 답냥이 모바일 데모 UI. 레퍼런스의 수면·플레이리스트 앱처럼 부드럽고 가벼운 분위기를 유지하되, 메시지 작성 도우미에서는 읽기 쉬움과 빠른 선택을 우선한다. 2026-07-12 색 강화 개정: "전반적으로 너무 연하다"는 사용자 피드백에 따라 파스텔 무드는 유지하고 주요 토큰을 한 단계 진하게 조정했다(CTA 흰 글자 실측 5.2:1). 개정 경위는 docs/LOG.md 참고.

## 핵심 규칙

- **주색은 차분한 스카이 블루를 쓴다.** CTA, 선택 상태, 진행 버튼, 활성 탭에만 강하게 사용한다.
- **배경은 파우더 블루, 앱 표면은 거의 흰색으로 분리한다.** 바깥 배경은 차갑고 부드럽게, 실제 입력·결과 영역은 선명하게 읽히는 흰 표면을 쓴다.
- **제목은 잉크색으로 또렷하게, 본문은 부드러운 차콜로 둔다.** 보조 정보는 블루 그레이로 낮춘다.
- **카드는 큰 라운드와 약한 그림자로 구분한다.** 외곽선보다 여백, 색 면, 둥근 모서리로 계층을 만든다.
- **파스텔 보조색은 상태·카테고리 구분에만 쓴다.** 한 화면이 단색 블루로만 보이지 않도록 피치, 버터, 민트, 라벤더를 제한적으로 섞는다.
- **여백은 넉넉하게 잡되, 모바일에서는 카드 내부 밀도를 유지한다.** 화면 패딩 24px, 카드 내부 18~22px를 기본으로 한다.
- **파스텔은 표면, 진한 색은 텍스트·동작에 쓴다.** 흰 글자가 올라가는 CTA와 상태 텍스트는 WCAG AA 4.5:1 대비를 충족한다.
- **결과 후보 3개는 같은 표면색과 크기를 쓴다.** 톤 차이는 배지와 문구로만 전달해 특정 후보를 시각적으로 추천하지 않는다.

## CSS Variables

```css
:root {
  /* Color: core */
  --color-primary: #2e7397;
  --color-primary-hover: #29688a;
  --color-primary-pressed: #245b7a;
  --color-primary-soft: #c9e5f4;
  --color-primary-muted: #8fc0d6;

  --color-bg: #cfe3ef;
  --color-bg-deep: #b7d6e6;
  --color-surface: #ffffff;
  --color-surface-soft: #f7fbfd;
  --color-surface-tint: #eef7fb;

  --color-text: #151515;
  --color-text-body: #34343a;
  --color-text-muted: #54636c;
  --color-text-subtle: #aab5bc;
  --color-text-on-primary: #ffffff;

  --color-border: #d5e2e9;
  --color-border-strong: #bccfda;
  --color-disabled: #d9e3e8;
  --color-backdrop: rgba(122, 160, 180, 0.18);

  /* Color: pastel cards */
  --color-card-blue: #c3e0f1;
  --color-card-blue-strong: #9fcde5;
  --color-card-peach: #f5cfc6;
  --color-card-butter: #f8e3b9;
  --color-card-mint: #cfe8da;
  --color-card-lavender: #ded7f0;

  /* Color: feedback */
  --color-danger: #9b453f;
  --color-danger-soft: #f6dfdc;
  --color-success: #6ea98c;
  --color-success-soft: #e4f2eb;

  /* Typography */
  --font-sans: "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;
  --font-display: "Gowun Dodum", "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif;

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
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

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

  --chip-bg: #e2edf3;
  --chip-active-bg: var(--color-primary);
  --chip-radius: var(--radius-pill);

  --input-bg: var(--color-surface-soft);
  --input-border: 1px solid var(--color-border);
  --input-radius: var(--radius-md);
  --focus-ring: 0 0 0 3px rgba(46, 115, 151, 0.45);
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

- 브랜드명과 짧은 장식 제목만 `--font-display`를 쓴다. Gowun Dodum은 제공되는 실제 굵기에서만 사용하고 합성 굵기에 의존하지 않는다.
- 본문, 버튼, 입력, 결과 메시지와 정보성 제목은 실제 400·500·600·700 굵기를 제공하는 `--font-sans`를 쓴다.
- 제목은 `--font-weight-bold`, 버튼과 칩은 `--font-weight-semibold`, 본문은 `--font-weight-regular`를 기본으로 한다.
- 긴 한글 본문은 16px 아래로 낮추지 않는다.

## 접근성 기준

- 흰 글자/`--color-primary` 대비는 약 5.2:1, `--color-text-muted`/흰 표면은 약 6.2:1(칩·파스텔 표면 위에서도 4.9:1 이상), `--color-danger`/danger-soft는 약 4.98:1을 목표로 한다.
- 진행 표시 등 작은 보조 텍스트도 대기 상태에서 `--color-text-muted` 이상을 쓴다. `--color-text-subtle`은 4.5:1이 안 나오므로 실제 읽어야 하는 텍스트에 쓰지 않는다.
- 모든 버튼·칩·뒤로가기의 실제 터치 영역은 최소 44×44px로 둔다.
- 모든 동작 요소는 2px 이상으로 식별 가능한 `:focus-visible`을 제공한다.
- 색만으로 선택·오류·톤을 전달하지 않고 텍스트·ARIA 상태를 함께 사용한다.
- 스켈레톤 애니메이션은 `prefers-reduced-motion: reduce`에서 중지한다.

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

## 가이드형 대화 UI

- **냥이 헤더**: 아바타·이름·"빠른 선택으로 같이 골라요" 상태를 한 줄에 둔다. 관계 선택 전에는 답냥이, 선택 뒤에는 관계별 냥이 이름과 정적 아바타를 표시한다. 화면 전체의 Three.js Canvas는 브랜드 패널 하나뿐이며, 관계를 고르면 해당 냥이 전신 에셋으로, AI 생성 중에는 생각하는 답냥이 에셋으로 교체한다. 관계 카드 썸네일은 정적 이미지로 유지한다. 에셋·WebGL이 없을 때도 동일 크기의 정적 이미지 또는 원형 `냥` 배지가 레이아웃을 유지한다.
- **발화 말풍선**: 냥이 발화는 왼쪽의 `--color-surface-tint`, 사용자 선택 요약은 오른쪽의 `--color-primary` 표면을 쓴다. 색만으로 화자를 구분하지 않고 냥이 이름과 정렬·꼬리 모양을 함께 사용한다.
- **빠른 답변**: 일반 메신저의 추천 답장처럼 질문 바로 아래에 두되, 상황 6개는 스캔 속도를 위해 기존 2열 그리드를 유지한다. 방식·관계 카드의 진행 표시는 일반 오른쪽 화살표 대신 상단 진행 상태와 같은 작은 답냥이 발자국 아이콘을 장식으로 쓰며, 뒤로가기는 방향 이해를 위해 왼쪽 화살표를 유지한다. 빈 텍스트 입력창은 S2-b 전에는 노출하지 않는다.
- **관계별 개성**: 관계 카드의 버터·블루·피치·민트는 탐색 단계와 아바타 링에만 제한적으로 사용한다. 본문 말풍선·결과 카드의 읽기 표면은 관계별로 바꾸지 않는다.
- **말 꾸러미**: 결과 3개는 하나의 부드러운 외곽 패널 안에 같은 표면과 시각적 무게로 묶는다. "기본"을 위에 두되 추천 왕관·별·크기 차등은 사용하지 않는다.
- **모션**: 활성 턴의 짧은 페이드·상승과 냥이의 눈 깜빡임·호흡·고개 반응처럼 상태를 설명하는 미세 모션만 허용한다. 계속 회전하거나 UI보다 강한 포인터 추적, 타이핑 중인 척하는 점 애니메이션은 사용하지 않는다. `prefers-reduced-motion`에서는 캐릭터와 턴 전환을 정적 상태로 대체한다.
- **Three.js 경계**: Canvas는 장식 표현으로 `aria-hidden` 처리하고 냥이 이름·현재 상태는 DOM 텍스트로 유지한다. Canvas 오류가 선택·입력·복사를 막아서는 안 되며 모바일 초기 로딩과 렌더 성능은 T29에서 정적 폴백과 함께 검증한다.
