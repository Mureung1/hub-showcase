# 디자인 토큰

`docs/design-concept.md`에서 정한 방향을 실제 CSS 변수로 정리한 문서입니다. 화면을 만들 때 여기 값을 그대로 가져다 씁니다. 값이 바뀌면 이 파일만 고치면 됩니다. (`prototype/style.css`의 `:root`와 항상 동기화합니다.)

## 사용 방법

전역 스타일 `:root`에 아래 변수를 그대로 붙여넣고, 컴포넌트/페이지 CSS에서는 항상 변수를 참조합니다 (`color: var(--color-text-primary)`처럼). hex 값을 직접 새로 쓰지 않습니다.

```css
:root {
  --color-bg: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-border: #E5E7EB;
  --color-text-primary: #1F2937;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;

  --color-primary: #4F46E5;
  --color-primary-dark: #4338CA;
  --color-primary-light: #EEF2FF;

  --color-accent-1: #61DAFB; /* 기술 태그/차트 강조색 1 */
  --color-accent-2: #3178C6; /* 기술 태그/차트 강조색 2 */
  --color-accent-3: #38B28A; /* 기술 태그/차트 강조색 3 */

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;

  --shadow-card: 0 4px 16px rgba(79, 70, 229, 0.08);
  --shadow-card-hover: 0 6px 20px rgba(26, 31, 54, 0.10);

  --font-sans: "Pretendard", "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif;

  /* 앱 셸(상단바·사이드바) 전용 글래스 토큰. 본문 카드에는 절대 쓰지 않습니다. */
  --glass-surface: rgba(255, 255, 255, 0.72);
  --glass-blur: 14px;
}
```

## 레이아웃 패턴

- 화면 최상단에 `.top-bar`(로고/브랜드명 + 현재 스텝 텍스트)를 고정(`position: sticky; top: 0;`)합니다.
- 그 아래는 `.app-shell`(CSS grid: 고정폭 사이드바 + 유동폭 본문)입니다. `.sidebar`에 3단계 스텝을 세로로 나열합니다. 현재 단계는 `--color-primary` 배경의 원, 완료 단계도 같은 색(링크로 이전 화면 이동 가능), 다음 단계는 회색(`--color-border`) 원.
- `.top-bar`와 `.sidebar`는 `--glass-surface` 배경 + `backdrop-filter: blur(var(--glass-blur))`로 은은한 글래스 효과를 줍니다. **이 두 곳(앱 셸)에만** 적용하고, 본문 카드에는 절대 쓰지 않습니다.
- 본문(`.content` 안의 `.page`)은 가운데 정렬된 단일 컬럼입니다. 직무 선택 화면은 `max-width: 720px`, 보고서처럼 콘텐츠가 많은 화면은 `max-width: 960px`.
- 카드는 흰 배경(완전 불투명) + 은은한 그림자(`--shadow-card`) + 넉넉한 radius(16~20px). 카드 자체에는 글래스/반투명 효과를 쓰지 않습니다 — 가독성 때문에 본문에서는 계속 불투명을 유지합니다.
- 강조가 필요한 곳(인사이트 배너 등)은 옅은 그라디언트 배경(`linear-gradient(135deg, #EEF1FF, #F5F9FF)`) 정도로 충분합니다.
- 화면 폭이 좁아지면(`max-width: 860px` 이하) `.app-shell`은 세로로 쌓이고 `.sidebar`의 스텝은 가로로 나열됩니다.

## 카드 구성 요소

- `.badge` / `.tag`: 필박스 형태의 작은 라벨. `--color-primary-light` 배경 + `--color-primary` 텍스트.
- 요약 카드(`.summary-card`): 큰 숫자(26px, 800) + 작은 캡션. 3개씩 그리드로 배치.
- 해설 카드(`.explain-card`): 태그 + 제목 + 설명 문단 + 리스트 + 인용구. 텍스트 분량이 많은 카드는 이 패턴을 씁니다.
- 로드맵 카드(`.roadmap-card`): 타임라인 점(숫자) + 단계 배지 + 제목 + 기간 뱃지 + 설명 + 토픽 칩 + "추천 이유" 박스(`--color-primary-light` 배경).

## 참고

- 방향성 설명: @docs/design-concept.md
- 실제 구현: @prototype/style.css, @prototype/index.html, @prototype/report.html, @prototype/roadmap.html
