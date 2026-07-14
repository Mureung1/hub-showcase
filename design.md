# Design System

프론트엔드(`frontend/src/index.css`)에서 그대로 구현해야 하는 디자인 토큰 정의입니다. 이 문서가 색상/타이포/간격의 단일 소스(source of truth)이며, `index.css`의 값은 아래 정의와 항상 일치해야 합니다.

## CSS Custom Properties

```css
:root {
  /* Colors */
  --color-primary: #5A89FA;
  --color-primary-dark: #2C3D8F;
  --color-text: #1F1F1F;
  --color-text-muted: #6A8FB3;
  --color-accent-light: #ABBCE0;
  --color-bg: #F8F9FD;
  --color-surface: #FFFFFF;
  --color-border: #E5E9F5;
  --color-danger: #EF4444;
  --color-danger-hover: #DC2626;

  /* Typography */
  --font-family: 'Poppins', sans-serif;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --font-size-title: 20px;
  --font-size-body: 14px;
  --font-size-caption: 12px;

  /* Radius */
  --radius-pill: 999px;   /* 버튼 */
  --radius-card: 18px;    /* 카드 */
  --radius-input: 12px;   /* 인풋, 작은 요소 */

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Card */
  --card-bg: var(--color-surface);
  --card-radius: var(--radius-card);
  --card-padding: 16px;
  --card-shadow: 0 4px 12px rgba(90, 137, 250, 0.08);

  /* Button */
  --btn-primary-bg: var(--color-primary);
  --btn-secondary-bg: var(--color-primary-dark);
  --btn-radius: var(--radius-pill);
  --btn-padding: 12px 24px;
  --btn-text-color: #FFFFFF;
}
```

## 적용 가이드

- 폰트는 Google Fonts에서 Poppins(400/500/700)를 import.
- 버튼은 `--radius-pill`(알약형), 카드는 `--radius-card`, 인풋은 `--radius-input`을 사용.
- 그림자는 `--card-shadow` 하나만 정의되어 있으므로 별도의 `--shadow-sm`/`--shadow-md` 스케일은 사용하지 않음.
- 삭제 등 위험 액션에는 `--color-danger`/`--color-danger-hover`를 사용.
