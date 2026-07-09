# hub 디자인 시스템

`OnboardingForm`, `Dashboard`, `TaskCard`, `Landing`에 적용된 청록(teal) 포인트 컬러 디자인 언어의
레퍼런스. 새 화면/컴포넌트를 만들 때 여기 정의된 토큰과 패턴을 재사용한다.

## 컬러 토큰 (`src/index.css` `:root`)

| 변수 | 값 | 용도 |
|---|---|---|
| `--accent` | `oklch(0.55 0.1209 175.76)` | 포인트 컬러(버튼 채움, 진행률 바, 선택된 테두리) |
| `--accent-hover` | `oklch(0.45 0.1209 175.76)` | 포인트 컬러 hover |
| `--accent-text` | `oklch(0.4 0.1209 175.76)` | soft 배경 위에 올라가는 텍스트/아이콘 색 |
| `--accent-soft-bg` | `oklch(0.96 0.03 175.76)` | 선택/활성 상태 배경 |
| `--accent-soft-border` | `oklch(0.88 0.06 175.76)` | 배지·soft 카드 테두리 |
| `--danger` | `#dc2626` | 임박(urgent) 상태 전용 |
| `--text` / `--text-muted` / `--text-h` | `#1f2937` / `#4b5563` / `#08060d` | 본문 / 보조 텍스트 / 헤딩 |
| `--bg` / `--bg-muted` | `#ffffff` / `#f9fafb` | 기본 배경 / 구획 배경 |
| `--border` | `#e5e4e7` | 기본 테두리 |

새 색이 필요해 보이면 먼저 이 토큰으로 표현할 수 있는지 확인한다. 하드코딩된 hex/oklch 값을
새로 추가하지 않는다.

## 컴포넌트 패턴

### 필(pill) 선택자 — 단일 선택, 2~4개 옵션
`OnboardingForm.css`: `.pill-group` (기본 `flex`, `.pill-group--grid`는 2열 그리드) 안에
`.pill` 버튼들. 선택된 항목은 `.pill--selected` (accent 테두리 + `--accent-soft-bg` 배경 +
`--accent-text`). `<select>`나 native radio 대신 이 패턴을 쓴다.
예시: `OnboardingForm.tsx`의 업종(4개, grid), 사업자 유형(2개, `.pill--flex`로 나란히).

### 토글 스위치 — 불리언 상태
`OnboardingForm.css`: `.toggle-row`(`<button type="button">`) + 내부 `.switch` / `.switch__knob`.
켜짐은 `.toggle-row--active`(테두리/배경) + `.switch--on`(knob 이동, 배경 accent).
예시: 직원 유무, 임대 여부.

### 필터/기능 버튼 — 선택 가능한 카드
`Dashboard.css`: `.dashboard__feature-button`. 기본 2px 회색 테두리 + 흰 배경, 활성 시
`.active` 클래스로 accent 테두리 + `--accent-soft-bg`. hover는 accent 테두리만.

### 태스크 카드 + D-day 배지
`TaskCard.css`: `.task-card` (2px 테두리, 완료 시 `.task-card--checked`로 배경/테두리 흐리게).
체크박스는 native `<input type="checkbox">` + `accent-color: var(--accent)` — 커스텀 마크업 없음.
D-day 배지 `.task-card__dday`는 기본 회색(`#f3f4f6` / `#6b7280`)이고, 마감이 **7일 이내**일
때만 `.task-card__dday--urgent`로 빨강(`--danger`)이 된다. 판정 로직은 `TaskCard.tsx`의
`daysUntil()` / `isUrgent`. 모든 배지를 무조건 빨강으로 칠하지 않는다 — 임박도를 실제로 전달하는
게 목적.

### 진행률 바
`Dashboard.css`: `.dashboard__progress-bar`(회색 트랙) > `.dashboard__progress-fill`
(accent, `width`를 인라인 스타일로 설정).

### 브라우저 크롬 목업 프레임
`Landing.css`: `.landing__mockup-frame` — macOS 스타일 traffic-light 점 3개 + url 표시줄
(`.landing__mockup-titlebar`) 아래에 실제 앱 화면의 축소판을 재현한 콘텐츠
(`.landing__mockup-body`). 마케팅/랜딩 섹션에서 실제 화면을 미리 보여줄 때는 정적 스크린샷
이미지 대신 이 패턴으로 라이브 마크업을 재현한다.

### 버튼
`Landing.css`: `.landing__btn--primary`(accent 채움, 흰 텍스트) / `.landing__btn--secondary`
(흰 배경 + 회색 테두리, hover 시 테두리만 진해짐). CTA는 primary, 보조 액션은 secondary.

### 배지/태그
`.onboarding__badge`, `.landing__hero-badge` — `border-radius: 999px`, `--accent-soft-bg`
배경 + `--accent-soft-border` 테두리 + `--accent`/`--accent-text` 글자색의 알약형 라벨.
짧은 컨텍스트 정보("1분 진단", "무료 · 로그인 없이 바로 시작")에 사용.

## 네이밍 / 파일 구조 컨벤션

- 컴포넌트마다 `ComponentName.tsx` + 같은 위치의 `ComponentName.css` 페어. `import
  './ComponentName.css'`로 직접 로드.
- 클래스명은 BEM 스타일: `.block__element--modifier` (예: `.task-card__dday--urgent`).
- Tailwind나 CSS Modules는 쓰지 않는다 — 순수 CSS + `src/index.css`의 커스텀 프로퍼티.

## 접근성 메모

- 필/토글은 숨긴 native input trick 대신 `<button type="button">`을 직접 스타일링한다.
  필 그룹은 `role="radiogroup"` + 각 버튼 `role="radio"` / `aria-checked`, 토글은
  `aria-pressed`.
- 날짜 입력(`<input type="date">`)과 태스크 체크박스는 native 그대로 유지한다 — 키보드 접근성과
  OS 위젯(달력 피커 등)을 그대로 활용하기 위함.
