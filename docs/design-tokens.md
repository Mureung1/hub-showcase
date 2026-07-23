# CareerSignal 디자인 토큰

이 문서는 `prototype/style.css`의 `:root`와 레이아웃 기준을 기록합니다. 프로토타입의 값이 바뀌면 이 문서도 함께 갱신합니다.

## 색상·형태·글래스 토큰

```css
:root {
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-soft: #F1F5F9;
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-text-primary: #111827;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;

  --color-primary: #4F46E5;
  --color-primary-dark: #3730A3;
  --color-primary-light: #EEF2FF;
  --color-accent-blue: #0EA5E9;
  --color-accent-green: #16A34A;
  --color-accent-amber: #D97706;
  --color-accent-rose: #E11D48;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;

  --shadow-card: 0 8px 24px rgba(15, 23, 42, 0.06);
  --shadow-float: 0 18px 50px rgba(15, 23, 42, 0.12);
  --glass-surface: rgba(255, 255, 255, 0.68);
  --glass-border: rgba(226, 232, 240, 0.72);
  --glass-blur: 22px;

  --font-sans: "Pretendard", "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif;
}
```

기본 글꼴은 `Pretendard`, `Apple SD Gothic Neo`, `Segoe UI`, `Roboto` 순서입니다.

## 레이아웃 기준

- `.top-bar`는 `position: sticky`로 상단에 고정합니다.
- `.app-shell`은 일반 페이지의 가운데 정렬 컨테이너이며 최대 폭은 `1180px`입니다.
- `.reader-layout`은 통계 분석·채용공고 해석·합격 전략·준비 로드맵의 본문·목차 레이아웃입니다. 본문 최대 폭은 `980px`, 오른쪽 목차 폭은 `220px`입니다.
- 화면 폭 `1350px` 이상에서는 본문을 화면 중앙 열에 두고 `.floating-nav`를 오른쪽 열에 둡니다.
- `1040px` 이하에서는 본문을 단일 열로 전환하고, 목차는 상단의 가로 스크롤 형태로 바꿉니다.
- `1050px` 이상에서는 `html { zoom: 0.9; }`을 적용해 데스크톱 리포트의 표시 밀도를 조정합니다.

## 구성 요소 규칙

- `.top-bar`, `.floating-nav`: 글래스 배경, 테두리, 블러를 사용합니다.
- `.panel`, `.metric-card`, `.source-card`, `.roadmap-card`, `.job-select-card`: 불투명 흰색 카드와 `--shadow-card`를 사용합니다.
- `.metric-grid`: 5개 지표 카드를 한 줄에 배치합니다.
- `.combination-grid`: 함께 요구되는 기술 조합 3개를 비교합니다.
- `.split-grid`: 필수 요구사항과 우대사항을 나란히 보여 줍니다.
- `.roadmap-timeline`: 4단계 준비 로드맵을 세로 흐름으로 보여 줍니다.
- 채용공고 해석·합격 전략 화면에 추가되는 컴포넌트(항목 카드, 체크리스트 표)도 동일한 카드·표 규칙과 토큰을 따릅니다.

## 참고

- [디자인 컨셉](design-concept.md)
- [실제 CSS](../prototype/style.css)
