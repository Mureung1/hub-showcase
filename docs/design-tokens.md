# 디자인 토큰 (Signal Studio)

`docs/design-concept.md`에서 정한 방향을 실제 CSS 변수로 정리한 문서입니다. 화면을 만들 때 여기 값을 그대로 가져다 씁니다. 값이 바뀌면 이 파일만 고치면 됩니다.

## 사용 방법

`src/index.css`(전역 스타일) 최상단 `:root`에 아래 변수를 그대로 붙여넣고, 컴포넌트 CSS에서는 항상 변수를 참조합니다 (`color: var(--color-text-primary)`처럼). hex 값을 직접 새로 쓰지 않습니다.

```css
:root {
  /* ---------- Color: Primary ---------- */
  --color-primary: #5B4FE9;
  --color-primary-strong: #4638CC;
  --color-primary-soft: #EEEBFF;

  /* ---------- Color: Accent (라이브 상태 / 포인트) ---------- */
  --color-accent-live: #22C55E;   /* 에이전트 활동 중 표시(dot) */
  --color-accent-warm: #F97316;   /* CTA 보조 강조, 절제해서 사용 */

  /* ---------- Color: Neutral / Background ---------- */
  --color-bg: #F7F8FC;
  --color-surface: #FFFFFF;
  --color-border: #E4E6F1;

  /* ---------- Color: Text ---------- */
  --color-text-primary: #16192B;
  --color-text-secondary: #5B5F7A;
  --color-text-inverse: #FFFFFF;

  /* ---------- Color: Semantic ---------- */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;

  /* ---------- Typography ---------- */
  --font-sans: "Pretendard", "Inter", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", monospace;

  --font-size-display: 32px;
  --font-size-h1: 25px;
  --font-size-h2: 20px;
  --font-size-body: 16px;
  --font-size-small: 13px;
  --font-size-label: 12px;

  --line-height-tight: 1.3;
  --line-height-body: 1.65;   /* 해석 카드용: 문단 텍스트는 항상 이 값 사용 */

  --font-weight-regular: 400;
  --font-weight-medium: 600;
  --font-weight-bold: 700;

  /* ---------- Spacing (4px 기준) ---------- */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* ---------- Radius ---------- */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* ---------- Shadow ---------- */
  --shadow-card: 0 8px 20px rgba(20, 20, 60, 0.06);
  --shadow-elevated: 0 16px 36px rgba(20, 20, 60, 0.12);

  /* ---------- Glass / 강조 영역 전용 (절제해서 사용) ---------- */
  --glass-bg: rgba(255, 255, 255, 0.78);
  --glass-blur: 16px;
  --glass-border: rgba(255, 255, 255, 0.6);
}
```

## 카드 종류별 규칙

design-concept.md 5.3절의 "요약 지표 카드 / 해석 카드" 구분을 코드 값으로 옮기면 다음과 같습니다.

| 종류 | padding | line-height | 폭 | 배경 |
| --- | --- | --- | --- | --- |
| 요약 지표 카드 | `var(--space-md)` (16px) | `var(--line-height-tight)` | 좁음 (그리드 1칸) | `var(--color-surface)` |
| 해석 카드 | `var(--space-lg)` (24px) | `var(--line-height-body)` | 넓음 (그리드 2칸 이상) | `var(--color-surface)` |
| 에이전트 활동/히어로 카드 (강조) | `var(--space-lg)` | `var(--line-height-tight)` | 자유 | `var(--glass-bg)` + `backdrop-filter: blur(var(--glass-blur))` |

일반 분석·로드맵 카드는 항상 `--color-surface`(불투명)를 쓰고, `--glass-bg`는 에이전트 활동 패널이나 히어로 영역처럼 "지금 실시간으로 움직이는" 강조 요소 1~2곳에만 사용합니다.

## 참고

- 색·톤·레이아웃 방향의 배경 설명: @docs/design-concept.md
