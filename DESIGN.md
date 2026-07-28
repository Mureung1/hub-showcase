# 아맞다 런타임 디자인 계약

아맞다는 밝기 부담을 낮춘 따뜻한 기본 배경, 얇은 경계와 선명한 글자 위에 사용자의 링크와 메모를 먼저 놓는다. 홈·보관함·저장은 서로 다른 대표 색상으로 첫 행동을 구분하되, 화면은 장식보다 정보 계층과 다음 행동을 우선한다.

## 토큰 런타임

- `src/shared/config/design-system/tokens.ts`의 `designTokens`가 디자인 값의 단일 원천이다.
- `src/shared/config/design-system/apply_design_tokens.ts`의 `applyDesignTokens()`만 토큰을 DOM의 CSS custom property로 주입한다.
- 제품 CSS는 주입된 `var(--...)`만 소비한다. raw 색상이나 별도 런타임 테마 값을 화면 CSS에 복제하지 않는다.
- 전역 순백색 `canvas`는 로그인 전 화면의 호환성을 위해 유지한다.
- 인증 후 공통 셸은 기존 컴포넌트가 소비하는 `--color-canvas`를 `--color-surface`로 한정해, 카드와 입력을 따뜻한 흰색으로 맞춘다.

## 팔레트 역할

| 역할                | 값        | TypeScript 원천                   | CSS 소비 변수           | 사용처                                |
| ------------------- | --------- | --------------------------------- | ----------------------- | ------------------------------------- |
| 인증 후 기본 배경색 | `#F4F1E9` | `designTokens.color.paper`        | `--color-paper`         | 인증 후 페이지 본문                   |
| 카드·입력 배경색    | `#FFFDF8` | `designTokens.color.surface`      | `--color-surface`       | 카드, 입력, 상단바                    |
| 전역 순백색         | `#FFFFFF` | `designTokens.color.canvas`       | `--color-canvas`        | 로그인 전 화면과 기존 컴포넌트 호환   |
| 홈 대표 색상        | `#1358D8` | `designTokens.color.retrieveBlue` | `--color-retrieve-blue` | 홈의 제목과 검색 영역                 |
| 보관함 대표 색상    | `#C94032` | `designTokens.color.libraryCoral` | `--color-library-coral` | 보관함의 제목과 검색 영역             |
| 저장 대표 색상      | `#08765B` | `designTokens.color.saveGreen`    | `--color-save-green`    | 저장의 제목과 URL 입력 영역           |
| Ink                 | `#151619` | `designTokens.color.ink`          | `--color-ink`           | 제목과 핵심 본문                      |
| Charcoal            | `#25272D` | `designTokens.color.charcoal`     | `--color-charcoal`      | Primary action과 강한 경계            |
| Graphite            | `#363940` | `designTokens.color.graphite`     | `--color-graphite`      | 일반 본문과 보조 설명                 |
| Smoke               | `#667085` | `designTokens.color.smoke`        | `--color-smoke`         | 메타데이터와 placeholder              |
| Ash                 | `#E1E2E5` | `designTokens.color.ash`          | `--color-ash`           | 기본 1px 경계와 구분선                |
| Mist                | `#F3F3F5` | `designTokens.color.mist`         | `--color-mist`          | 선택 상태와 정적 loading 표면         |
| Electric Blue       | `#0560FD` | `designTokens.color.electricBlue` | `--color-electric-blue` | focus, 정보 연결 강조, 로고 기본 색면 |
| Signal Green        | `#047857` | `designTokens.color.signalGreen`  | `--color-signal-green`  | 성공 상태                             |
| Amber               | `#F59E0B` | `designTokens.color.amber`        | `--color-amber`         | 주의, 카테고리 구분, 로고 강조 색면   |
| Coral               | `#F04438` | `designTokens.color.coral`        | `--color-coral`         | 강한 주의와 카테고리 구분             |

입력 오류는 `designTokens.color.errorInk`와 `--color-error-ink`를 사용한다. 상태는 색만으로 전달하지 않는다.

## 인증 후 화면 구조

- 카드·입력과 내비게이션은 따뜻한 흰색 배경을 사용하고, 그 바깥 본문은 인증 후 기본 배경색을 사용한다.
- 홈은 제목과 검색, 보관함은 제목·검색과 가져오기, 저장은 제목과 URL 입력까지 화면별 대표 색상 영역에 둔다.
- 고정 제안, 검색 결과, 카테고리, 결과 개수, 저장 완료와 선택 입력은 기본 배경색 본문에 둔다.
- 입력 오류는 해당 입력 가까이에 표시한다. 로딩·빈 상태·성공과 후속 입력은 기본 배경색 본문에서 이어진다.
- 보관함 개수는 전체 수만 고립해 보여 주지 않고 `인사이트 24개`, `검색 결과 3개`, `개발 2개`처럼 현재 문맥을 포함해 결과 가까이에 표시한다.

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

| 구간    | 범위             | 기본 구성                                     |
| ------- | ---------------- | --------------------------------------------- |
| Desktop | `>= 1200px`      | 상단 내비게이션, 3열 결과                     |
| Tablet  | `768px - 1199px` | 상단 내비게이션, 2열 결과                     |
| Mobile  | `<= 767px`       | 브랜드 상단바, 고정 하단 내비게이션, 1열 결과 |

- `768px` 이상에서는 따뜻한 흰색 상단바 안에 브랜드, 상단 내비게이션과 계정 영역을 한 줄로 배치한다.
- `767px` 이하에서는 브랜드와 계정만 상단바에 남기고 내비게이션은 화면 하단에 고정한다.
- 터치 타깃은 최소 44px이다.
- `:focus-visible`은 2px Electric Blue outline과 2px offset을 사용한다.
- 일반 본문 대비는 최소 4.5:1을 유지한다.
- 입력에는 visible label을 제공하고 오류는 `aria-invalid`와 `aria-describedby`로 연결한다.
- 선택과 현재 위치는 색 외에 `aria-pressed` 또는 `aria-current`로 표현한다.

## 모션

- GSAP은 로그인 전 온보딩 Hero의 첫 진입 시퀀스 한 곳에만 사용한다.
- 데스크톱은 핵심 문구와 시작 행동을 약 1초 동안 한 번 순서대로 보여준다.
- 반복 재생, 스크롤 고정과 스크롤 연동 timeline은 사용하지 않는다.
- 모바일과 `prefers-reduced-motion`에서는 timeline을 만들지 않고 같은 정적 최종 상태를 제공한다.
- 앱 내부 피드백은 필요한 경우에만 token duration의 CSS transition을 사용한다.

## 상태 패턴

| 상태    | 런타임 계약                                                                |
| ------- | -------------------------------------------------------------------------- |
| Loading | Mist 기반의 정적 placeholder를 사용하고 pulse나 shimmer를 쓰지 않는다.     |
| Empty   | 비어 있는 이유와 가장 적절한 다음 행동 하나를 함께 제공한다.               |
| Error   | 오류 text, icon, 복구 action을 함께 제공하고 입력값을 보존한다.            |
| Success | 완료 text, icon, 다음 action을 함께 제공하고 반복 animation을 쓰지 않는다. |

## 공개 협업 문서 표현

- GitHub 이슈와 PR 본문은 `Paper`, `Surface`, `stage`, `canvas`, 토큰명 같은 구현 내부 용어를 사용하지 않는다.
- 같은 내용을 `기본 배경색`, `카드·입력 배경색`, `화면별 대표 색상`, `상단 영역`, `본문`처럼 결과를 바로 이해할 수 있는 표현으로 작성한다.
