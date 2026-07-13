# 아맞다 런타임 디자인 계약

아맞다는 흰 여백, 얇은 경계, 선명한 글자 위에 사용자의 링크와 메모를 먼저 놓는 White Canvas 제품이다. 화면은 장식보다 정보 계층과 다음 행동을 우선한다.

## 토큰 런타임

- `src/shared/config/design-system/tokens.ts`의 `designTokens`가 디자인 값의 단일 원천이다.
- `src/shared/config/design-system/apply_design_tokens.ts`의 `applyDesignTokens()`만 토큰을 DOM의 CSS custom property로 주입한다.
- 제품 CSS는 주입된 `var(--...)`만 소비한다. raw 색상이나 별도 런타임 테마 값을 화면 CSS에 복제하지 않는다.
- Paper는 페이지 배경의 의미 역할이며 현재 `designTokens.color.canvas`를 함께 사용한다. 별도 raw 값이나 alias 변수를 만들지 않는다.

## 팔레트 역할

| 역할          | TypeScript 원천                   | CSS 소비 변수           | 사용처                        |
| ------------- | --------------------------------- | ----------------------- | ----------------------------- |
| Paper         | `designTokens.color.canvas`       | `--color-canvas`        | 페이지 배경                   |
| Canvas        | `designTokens.color.canvas`       | `--color-canvas`        | 카드, 입력, 내비게이션 표면   |
| Ink           | `designTokens.color.ink`          | `--color-ink`           | 제목과 핵심 본문              |
| Charcoal      | `designTokens.color.charcoal`     | `--color-charcoal`      | Primary action과 강한 경계    |
| Graphite      | `designTokens.color.graphite`     | `--color-graphite`      | 일반 본문과 보조 설명         |
| Smoke         | `designTokens.color.smoke`        | `--color-smoke`         | 메타데이터와 placeholder      |
| Ash           | `designTokens.color.ash`          | `--color-ash`           | 기본 1px 경계와 구분선        |
| Mist          | `designTokens.color.mist`         | `--color-mist`          | 선택 상태와 정적 loading 표면 |
| Electric Blue | `designTokens.color.electricBlue` | `--color-electric-blue` | focus와 정보 연결 강조        |
| Signal Green  | `designTokens.color.signalGreen`  | `--color-signal-green`  | 브랜드 마크와 성공 상태       |
| Amber         | `designTokens.color.amber`        | `--color-amber`         | 주의와 카테고리 구분          |
| Coral         | `designTokens.color.coral`        | `--color-coral`         | 강한 주의와 카테고리 구분     |

입력 오류는 `designTokens.color.errorInk`와 `--color-error-ink`를 사용한다. 상태는 색만으로 전달하지 않는다.

## 형태와 계층

- Button radius는 `designTokens.radius.button` / `--radius-button`의 8px이다.
- Input radius는 `designTokens.radius.input` / `--radius-input`의 12px이다.
- Card radius는 `designTokens.radius.card` / `--radius-card`의 16px이다.
- 기본 경계는 1px Ash다. 기본 그림자, hover lift, 장식용 gradient는 사용하지 않는다.
- 화면 제목은 32/40, 본문은 16/26 계약을 우선하며 16px 본문에 Smoke를 쓰지 않는다.
- Signature `InlineLabel`은 Hero 한 곳에서 최대 2개, 일반 section title에서 최대 1개만 쓴다. 버튼, 입력, 칩, 내비게이션 같은 product control에는 넣지 않는다.

## 컴포넌트와 import 경계

- 외부 UI 패키지는 구현 세부다. `src/shared/ui`의 provider와 adapter 밖에서 직접 import하지 않는다.
- `app`, `pages`, `widgets`, `entities`는 `@/shared/ui` public API만 사용한다.
- 화면 전용 CSS는 해당 slice의 `ui` 디렉터리에 두고 토큰 변수만 소비한다.
- named export를 사용하고 `export default`는 사용하지 않는다.

## 반응형과 접근성

| 구간    | 범위             | 기본 구성                   |
| ------- | ---------------- | --------------------------- |
| Desktop | `>= 1200px`      | 3열, 넓은 작업 영역         |
| Tablet  | `768px - 1199px` | 2열, 축소된 section 간격    |
| Mobile  | `<= 767px`       | 1열, full-width 입력과 액션 |

- 터치 타깃은 최소 44px이다.
- `:focus-visible`은 2px Electric Blue outline과 2px offset을 사용한다.
- 일반 본문 대비는 최소 4.5:1을 유지한다.
- 입력에는 visible label을 제공하고 오류는 `aria-invalid`와 `aria-describedby`로 연결한다.
- 선택과 현재 위치는 색 외에 `aria-pressed` 또는 `aria-current`로 표현한다.

## 모션

- GSAP은 로그인 전 온보딩의 데스크톱 연결 장면 한 곳에만 사용한다.
- 데스크톱은 viewport 높이의 90~110% 구간에서 한 번 pin한다.
- 모바일은 pin과 timeline 없이 정적 최종 상태를 보여준다.
- `prefers-reduced-motion`에서는 모든 연결 모션을 생략하고 같은 정적 최종 상태를 제공한다.
- 앱 내부 피드백은 필요한 경우에만 token duration의 CSS transition을 사용한다.

## 상태 패턴

| 상태    | 런타임 계약                                                                |
| ------- | -------------------------------------------------------------------------- |
| Loading | Mist 기반의 정적 placeholder를 사용하고 pulse나 shimmer를 쓰지 않는다.     |
| Empty   | 비어 있는 이유와 가장 적절한 다음 행동 하나를 함께 제공한다.               |
| Error   | 오류 text, icon, 복구 action을 함께 제공하고 입력값을 보존한다.            |
| Success | 완료 text, icon, 다음 action을 함께 제공하고 반복 animation을 쓰지 않는다. |
