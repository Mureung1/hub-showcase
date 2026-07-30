# CareerSignal 디자인 토큰

이 문서는 색·간격·타이포 값과 레이아웃 기준값을 기록한다. 화면 구성과 정보 구조는 [디자인 컨셉](design-concept.md)에 있다.

토큰은 `product/src/index.css`와 `prototype/style.css`의 `:root`에 같은 값으로 정의한다. 두 파일은 실행 환경이 달라 코드를 공유하지 않으므로, 값을 바꿀 때는 두 파일과 이 문서를 함께 갱신한다.

## 색상·형태·글래스 토큰

```css
:root {
  --color-bg: #FBFAF3;
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
  --glass-surface: rgba(248, 246, 238, 0.92);
  --glass-border: rgba(210, 202, 184, 0.80);
  --glass-blur: 22px;

  --font-sans: "Pretendard", "Apple SD Gothic Neo", "Segoe UI", Roboto, sans-serif;
}
```

기본 글꼴은 `Pretendard`, `Apple SD Gothic Neo`, `Segoe UI`, `Roboto` 순서다.

## 레이아웃 기준

- `.top-bar`는 `position: sticky`로 상단에 고정하며 최소 높이는 `72px`이다.
- `.app-shell`은 가운데 정렬 컨테이너이며 폭은 `min(1180px, calc(100% - 48px))`이다.
- `.reader-layout`은 통계 분석·채용공고 해석·합격 전략·준비 로드맵의 본문·목차 레이아웃이다. 폭은 `min(1500px, calc(100% - 48px))`, 열은 본문 `980px`과 목차 `220px`, 열 간격은 `32px`이다.
- 본문 컨테이너는 `.page`가 최대 폭 `760px`, 목차를 곁에 두는 `.page--wide`가 최대 폭 `980px`이다.
- `.floating-nav`는 `position: sticky`로 상단에서 `96px` 떨어진 자리에 고정한다.
- 화면 폭 `1350px` 이상에서는 본문을 화면 중앙 열에 두고 `.floating-nav`를 오른쪽 열에 둔다.
- `1040px` 이하에서는 본문을 `minmax(0, 1fr)` 단일 열로 전환하고, 목차는 상단의 가로 스크롤 형태로 바꾼다.
- 넓은 표는 본문 폭을 늘리지 않고 전용 컨테이너 안에서만 가로로 스크롤한다. 모바일 히트맵은 기업군 열을 고정한다.
- `620px` 이하에서는 제목·설명·상단 단계 표시의 글자 크기를 줄이고, `340px` 이하에서 한 단계 더 줄인다.
- `1050px` 이상에서는 `html { zoom: 0.9; }`을 적용해 데스크톱 리포트의 표시 밀도를 조정한다.

## 구성 요소 규칙

- `.top-bar`, `.floating-nav`: 글래스 배경, 테두리, 블러를 사용한다.
- `.panel`, `.metric-card`, `.source-card`, `.roadmap-card`, `.job-select-card`, `.notice-card`, `.scope-switch`: 불투명 흰색 카드와 `--shadow-card`를 사용한다.
- `.metric-grid`: 지표 카드를 한 줄에 5개 배치하며, 변형 `.metric-grid--4`는 4개 열을 사용한다.
- `.combination-grid`: 함께 요구되는 기술 조합 3개를 비교한다.
- `.split-grid`: 필수 요구사항과 우대사항을 나란히 보여 준다.
- `.roadmap-timeline`: 준비 로드맵 단계를 세로 흐름으로 쌓고, 항목마다 `36px` 원형 마커와 연결선을 둔다.
- `.scope-switch`: 범위 전환 블록이다. 각 단(`.scope-switch__tier`)은 왼쪽 `62px` 이름 열과 선택지 열로 나누고, `860px` 이하에서는 두 열을 세로로 쌓는다.
- `.notice-card`: 활성 분석 결과가 없는 직무의 안내 카드이며 최대 폭은 `620px`이다.
- 내 공고 직접 분석 섹션의 `.pa-*` 클래스는 `product/src/components/posting-analyze.css`에만 정의하고, 색·반경·그림자는 이 문서의 토큰만 사용한다.
- 채용공고 해석·합격 전략 화면에 추가되는 컴포넌트(항목 카드, 체크리스트 표)도 동일한 카드·표 규칙과 토큰을 따른다.

## 참고

- [디자인 컨셉](design-concept.md)
- [서비스 CSS](../product/src/index.css)
- [프로토타입 CSS](../prototype/style.css)
