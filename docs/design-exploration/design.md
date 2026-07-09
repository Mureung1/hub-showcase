# 디자인 톤 (탐색용)

> 아직 서비스에 최종 채택된 디자인은 아님. 참고 무드보드에서 톤을 추출해 CSS 변수로 정리해둔 것이며, 실제 화면 적용 예시는 [candidates-tone-test.html](candidates-tone-test.html) 참고.

## 특징
- 배경: 크림/베이지 계열과 세이지 그린 계열의 은은한 그라데이션
- 포인트 컬러: 민트/틸 그린, 소프트 블루, 라이트 그린 — 채도 낮은 파스텔 톤
- 카드: 흰색/오프화이트, 테두리 없이 은은한 그림자, 매우 큰 모서리 곡률
- 버튼/토글: 완전히 둥근 필(pill) 형태
- 폰트: 둥글둥글한 산세리프 (Quicksand, Baloo 2 계열 느낌)
- 여백: 카드 내부 여백이 넉넉하고 요소 간 간격도 여유로움

## CSS 변수

```css
:root {
  /* 색상 - 배경 */
  --bg-page-cream: #F2E8D8;
  --bg-page-sage: #C6D6B8;
  --bg-card: #FFFFFF;
  --bg-card-soft: #FAF7F0;

  /* 색상 - 포인트 (블롭/아이콘/강조) */
  --color-primary: #6FB8A8;      /* 메인 틸그린 */
  --color-secondary: #8DB4D6;    /* 소프트 블루 */
  --color-accent-green: #A8C97E; /* 라이트 그린 */
  --color-accent-cream: #F0D9A8; /* 크림 포인트 */

  /* 색상 - 텍스트 */
  --text-primary: #33322E;
  --text-secondary: #8B8A82;
  --text-on-dark: #FFFFFF;

  /* 폰트 */
  --font-family: 'Quicksand', 'Poppins', sans-serif;
  --font-size-heading: 22px;
  --font-size-body: 14px;
  --font-size-caption: 12px;
  --font-weight-heading: 600;
  --font-weight-body: 400;

  /* 모서리 */
  --radius-card: 28px;
  --radius-small: 16px;
  --radius-pill: 999px;

  /* 여백 */
  --space-card-padding: 24px;
  --space-gap-sm: 8px;
  --space-gap-md: 16px;
  --space-gap-lg: 32px;

  /* 카드 그림자 */
  --shadow-card: 0 8px 24px rgba(0, 0, 0, 0.08);
}
```

## 적용 예시

```css
.card {
  background: var(--bg-card);
  border-radius: var(--radius-card);
  padding: var(--space-card-padding);
  box-shadow: var(--shadow-card);
  font-family: var(--font-family);
  color: var(--text-primary);
}

.button-pill {
  background: var(--color-primary);
  color: var(--text-on-dark);
  border-radius: var(--radius-pill);
  padding: 10px 20px;
  font-weight: var(--font-weight-heading);
}
```

## 상태
- 실제 서비스에 이 톤을 채택할지는 미정. 채택하기로 결정되면 `docs/prototype/style.css`에 이 변수들을 반영할 것.
