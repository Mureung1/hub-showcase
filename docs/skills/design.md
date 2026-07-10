# 디자인 가이드


## CSS 변수

```css
:root {
  /* ===== Font ===== */
  --font-family-base: "Pretendard", -apple-system, BlinkMacSystemFont,
    "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;

  /* ===== Color: 주색(Primary) ===== */
  --color-primary-50: #E8F3FF;
  --color-primary-500: #3182F6; /* 기본 CTA/강조 */
  --color-primary-600: #1B64DA; /* hover, 링크 강조 */
  --color-primary: var(--color-primary-500);
  --color-primary-hover: var(--color-primary-600);
  --color-primary-light: var(--color-primary-50);

  /* ===== Color: 시맨틱 ===== */
  --color-success: #18A5A5;
  --color-danger: #F04452;
  --color-warning: #FFB020;

  /* ===== Color: 배경 ===== */
  --color-bg-page: #FFFFFF;
  --color-bg-section: #F9FAFB;  /* 섹션 구분, 시각적 휴식 구간 */
  --color-bg-subtle: #F5F6F8;
  --color-bg-muted: #F2F4F6;    /* input 기본 배경 등 */
  --color-bg-surface: #FFFFFF;  /* 카드 내부 */

  /* ===== Color: 글자 (5단계 이상 세분화) ===== */
  --color-text-strong: #191F28;    /* 대제목/핵심 메시지 */
  --color-text-primary: #333D4B;   /* 일반 제목/주요 본문 */
  --color-text-secondary: #4E5968; /* 설명문/보조 라벨 */
  --color-text-tertiary: #6B7684;  /* 메타 정보/약한 설명 */
  --color-text-muted: #8B95A1;
  --color-text-disabled: #B0B8C1;
  --color-text-inverse: #FFFFFF;   /* 파란/어두운 배경 위 */

  /* ===== Color: 테두리 ===== */
  --color-border-subtle: #E5E8EB;
  --color-border-muted: #D1D6DB;

  /* ===== 모서리(Radius) ===== */
  --radius-xs: 6px;   /* nav 항목, 작은 hover 타깃 */
  --radius-sm: 8px;
  --radius-md: 12px;  /* input */
  --radius-lg: 16px;  /* 카드 기본 */
  --radius-xl: 22px;  /* 작은 알약형 버튼, 큰 카드 */
  --radius-2xl: 28px; /* 앱 화면형 큰 패널 */
  --radius-pill: 999px; /* 큰 CTA 버튼 */

  /* ===== 여백(Spacing) ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  --card-padding: var(--space-6);   /* 24px */
  --card-gap: var(--space-4);
  --grid-gap: var(--space-6);
  --section-padding-y: 120px;       /* 소개형 섹션 기본 상하 패딩 */
  --section-padding-y-lg: 170px;
  --container-max: 1140px;
  --container-padding-mobile: 24px;
  --container-padding-desktop: 48px;

  /* ===== Typography scale ===== */
  --font-size-caption: 13px;
  --font-size-nav: 15px;
  --font-size-body: 16px;
  --font-size-body-lg: 20px;
  --font-size-title-sm: 24px;
  --font-size-title-md: 32px;
  --font-size-title-lg: 48px;
  --font-size-display: 72px;

  --line-height-tight: 1.2;
  --line-height-base: 1.5;
  --line-height-comfy: 1.6;
  --line-height-display: 1.3;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --font-weight-heavy: 800;

  /* ===== 컴포넌트 크기 ===== */
  --nav-height: 60px;
  --button-height-sm: 44px;
  --button-height-md: 52px;
  --button-height-lg: 74px;

  /* ===== 카드 스타일 ===== */
  --card-bg: var(--color-bg-surface);
  --card-border: none; /* 테두리보다 배경 대비/그림자로 구분 */
  --card-radius: var(--radius-lg);
  --card-shadow: 0 8px 24px rgba(0, 19, 43, 0.08);
  --card-shadow-floating: 0 16px 48px rgba(0, 19, 43, 0.14);
  --card-shadow-pressed: 0 2px 8px rgba(0, 19, 43, 0.08);

  /* ===== Motion ===== */
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --duration-slow: 260ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
}
```

## 사용 규칙

**주색**: `--color-primary`(블루 500)는 CTA, 선택 상태, 핵심 강조에만 선명하게 배치한다. 넓은 면을 파란색으로 채우거나 장식용 그라디언트로 쓰지 않는다. hover는 `--color-primary-hover`(600), 약한 강조 배경은 `--color-primary-light`(50).

**배경**: 기본 페이지는 흰색(`--color-bg-page`). 섹션 구분·시각적 휴식 구간은 `--color-bg-section`/`--color-bg-muted`처럼 채도 거의 없는 회색만 사용한다. 카드 내부는 대부분 흰색으로 두고, 페이지-카드 배경의 미세한 명도 차이로 층위를 만든다.

**글자**: 검정 한 가지 + 파란 버튼만으로 위계를 해결하지 않는다. `text-strong → primary → secondary → tertiary → muted → disabled` 6단계를 용도에 맞게 나눠 쓴다.

**카드**: 테두리는 기본적으로 없음(`--card-border: none`). 대신 `--card-shadow`(은은한 그림자)와 배경 대비로 구분한다. 카드 안에 카드를 중첩하지 않고, 리스트 행/divider/subtle background로 정보를 나눈다.

**버튼**: 큰 CTA는 `--radius-pill` + 파란 배경 + 흰 텍스트, 16px/700. 보조 버튼은 `--radius-xl` + 흰 배경. 모든 버튼 높이는 최소 44px(`--button-height-sm`) 이상 확보한다.

**여백**: 작은 UI 요소 내부 패딩은 8/12/16/20/24px 단위로, 섹션 간격은 넓게(120px~) 잡아 메시지가 여유 있게 읽히도록 한다.

**모션**: transform/opacity 위주로만 적용하고 `--duration-base`(180ms) + `--ease-out`을 기본으로 사용한다.

## Do / Don't

### Do
- 흰색과 매우 옅은 회색을 넓게 사용한다.
- 텍스트 색상을 5단계 이상으로 세분화한다.
- 버튼과 카드는 충분히 둥글게 만든다.
- CTA만 선명한 파란색으로 강하게 만든다.
- 섹션 간 여백을 크게 잡는다.

### Don't
- 검정 텍스트와 파란 버튼만으로 모든 위계를 해결하지 않는다.
- 테두리와 그림자를 동시에 강하게 쓰지 않는다.
- 카드 안에 카드가 중첩되는 구조를 만들지 않는다.
- 장식용 그라디언트나 추상 배경으로 화면을 채우지 않는다.
- 화면을 파란색 계열로만 채워 단조롭게 만들지 않는다.
