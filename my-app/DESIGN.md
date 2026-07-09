---
name: AlriJang
colors:
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  inverse-primary: '#b3c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#c6e4d4'
  on-secondary-container: '#00714d'
  secondary-fixed: '#c6e4d4'
  secondary-fixed-dim: '#5da180'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary: '#4345d1'
  on-tertiary: '#ffffff'
  tertiary-container: '#5d60eb'
  on-tertiary-container: '#faf6ff'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface: '#f7f9fc'
  on-surface: '#191c1e'
  surface-variant: '#e0e3e6'
  on-surface-variant: '#424656'
  surface-tint: '#0054d6'
  surface-bright: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#727687'
  outline-variant: '#c2c6d8'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  DEFAULT: 0.25rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 40px
  gutter: 20px
---

이 문서는 `design-reference/*.html` 프로토타입 9개(main, brand_onboarding1~3, notice_write1~2, post_write, post_result, upload_later)에서 실제로 확인한 값을 기준으로 정리했다. 위 토큰이 실제 소스이며, `src/index.css`의 Tailwind `@theme`가 이 값을 그대로 반영한다.

## Brand & Style

라이트 테마의 **Corporate Modern** 스타일. 데이터가 많은 AI 대시보드지만, 사용자가 마케팅 전문가가 아닌 소상공인 사장님이라는 점 때문에 차갑거나 기술적인 인상보다는 정돈되고 신뢰가 가는 인상을 준다. 흰색 카드 + 옅은 블루그레이 배경(`#f7f9fc`) 위에 파란색 primary로 행동 유도, 초록색 secondary로 "AI가 잘 되고 있다고 알려주는" 긍정 신호를 표현한다.

## Colors

- **Primary Blue (`#0050cb`)**: 버튼, 활성 탭, 포커스 링, 링크 등 주요 액션에 사용.
- **Secondary Green (`#006c49`)**: 블로그 건강도 "양호", AI 추천 칩 등 긍정적인 상태 표시에 사용. `secondary-container`/`secondary-fixed`(`#c6e4d4`, 톤다운된 세이지 그린)는 초록 배지 배경으로, `secondary-fixed-dim`(`#5da180`, 진한 세이지 그린)은 건강도 그래프처럼 좀 더 진한 강조가 필요한 곳에 쓴다.
  - `design-reference/*.html`의 원래 값(`#6cf8bb`/`#6fbe`/`#4edea3` 계열)은 실제 화면에서 형광 느낌이 너무 강해서 톤다운했다. design-reference를 다시 참고할 때 이 세 토큰만은 원본 HTML 값이 아니라 여기 적힌 값을 쓴다.
- **Tertiary Purple (`#4345d1`)**: 보조 강조색. 사용 빈도는 낮음.
- **Background (`#f7f9fc`)**: 페이지 배경. surface와 값이 같아 배경과 surface 레벨 0이 사실상 동일하다.
- **Surface Container Lowest (`#ffffff`)**: 카드/패널의 실제 배경색. 배경보다 한 단계 밝은 흰색으로 카드를 구분한다.
- **Outline Variant (`#c2c6d8`)**: 카드 테두리, 구분선.

## Typography

- **Headline/Display**: Plus Jakarta Sans — 타이틀, 대시보드 헤더처럼 존재감이 필요한 곳.
- **Body**: Be Vietnam Pro — 본문, 설명, 인터뷰 질문/답변 등 장문.
- **Label**: Inter — 버튼 텍스트, 배지, 데이터 라벨처럼 작고 기능적인 텍스트.

## Layout & Spacing

- **Margins**: 데스크톱 기준 바깥 여백 `container-margin`(40px).
- **Gutters**: 카드 사이 간격 `gutter`(20px).
- **섹션 간격**: 논리적으로 다른 섹션을 나눌 때 `xl`(32px) 사용.
- **카드 내부 패딩**: 대부분 `p-lg`(24px).

## Elevation & Depth

라이트 테마라 톤 레이어링 대신 **옅은 그림자 + 헤어라인 테두리**로 깊이를 표현한다. 프로토타입에 커스텀 정의된 그림자:

```css
.shadow-soft { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }     /* 카드 기본 */
.shadow-dropdown { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); } /* 드롭다운/모달 */
```

- **Level 0 (Background)**: `#f7f9fc`, 그림자 없음.
- **Level 1 (Cards)**: `surface-container-lowest`(`#ffffff`) + `border border-outline-variant` + `shadow-soft`.
- **Level 2 (Dropdown/Modal)**: 동일 배경 + `shadow-dropdown`로 더 뚜렷하게 분리.

## Shapes

- **카드/컨테이너**: `rounded-xl` (0.75rem / 12px)
- **버튼/입력**: `rounded-lg` (0.5rem / 8px). 일부 CTA 버튼은 `rounded-xl` 사용.
- **배지/아바타/건강도 링**: `rounded-full`
- 그 외 `rounded`(기본, 0.25rem)는 작은 요소(칩 내부 아이콘 등)에 드물게 사용

## Components

- **Buttons**: `bg-primary text-white`, hover 시 `bg-primary/90`, 클릭 시 `active:scale-95`. `shadow-soft` + `font-label-md`(bold) 조합이 기본형.
- **Cards**: `bg-white rounded-xl p-lg shadow-soft border border-outline-variant`.
- **AI 추천/상태 배지**: `rounded-full`, `secondary-container` 배경에 `on-secondary-container` 텍스트 (긍정), 필요 시 `error-container`/`on-error-container` (경고).
- **활성 네비게이션 링크**: 하단 2px 보더 + 텍스트 색을 `primary`로, `font-bold`.
- **입력 필드**: `border border-outline-variant`, 포커스 시 `border-primary`.
