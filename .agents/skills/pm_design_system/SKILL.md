---
name: pm_design_system
description: PMSupportingTool 프로젝트의 브랜드 디자인 톤앤매너 및 CSS 변수 가이드를 준수하여 HTML/CSS UI 페이지를 생성하고 수정하는 스킬입니다.
---

# PMSupportingTool 디자인 가이드라인 스킬

이 스킬은 프로젝트 내 모든 웹 애플리케이션 화면에 동일한 디자인 톤앤매너를 유지하도록 규칙을 정의합니다. HTML/CSS 코드를 생성하거나 수정할 때 항상 아래 정의된 토큰과 스타일 가이드를 기준으로 적용하십시오.

## 1. CSS 변수 정의 (디자인 토큰)

HTML 스타일 시트 또는 전역 CSS 파일에 다음 `:root` 변수를 복사하여 사용하십시오.

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

  /* Typography */
  --font-family: 'Poppins', 'Pretendard', sans-serif;
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

## 2. 레이아웃 및 컴포넌트 개발 규칙

- **카드 컴포넌트 (`.card`)**: 
  - 백그라운드는 `var(--card-bg)`, 둥글기는 `var(--card-radius)`, 섀도우는 `var(--card-shadow)`를 적용합니다.
  - 카드 내의 보더라인이 필요한 경우 `1px solid var(--color-border)`를 사용합니다.
- **버튼 (`.btn-primary`, `.btn-secondary`)**:
  - 기본 버튼은 알약 모양(`var(--btn-radius)`)을 유지하며, 패딩은 `var(--btn-padding)`을 사용합니다.
- **입력 폼 (`input`, `textarea`)**:
  - 입력창의 둥글기는 `var(--radius-input)`을 사용하고, 기본 테두리는 `1px solid var(--color-border)`를 적용합니다. Focus 상태가 되었을 때 테두리 색을 `var(--color-primary)`로 강조합니다.
- **텍스트 계층 구조**:
  - 제목(Title)은 `var(--font-size-title)`과 `var(--font-weight-bold)`를 적용하고 `var(--color-primary-dark)` 색상을 사용해 눈에 잘 띄도록 합니다.
  - 본문(Body)은 `var(--font-size-body)`와 `var(--font-weight-regular)`, `var(--color-text)` 색상을 사용합니다.
  - 보조 및 캡션 텍스트는 `var(--font-size-caption)`과 `var(--color-text-muted)`를 사용합니다.
