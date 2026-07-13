# hub 디자인 시스템

`OnboardingForm`, `Dashboard`, `TaskCard`, `Landing`에 적용된 디자인 언어의 레퍼런스.
새 화면/컴포넌트를 만들 때 여기 정의된 토큰과 패턴을 재사용한다.

> **디자인 방향:** 크림(cream) 베이스 배경 + 앰버(amber) 포인트 컬러 + 다크 잉크 테두리.
> 이전 청록(teal) 시스템에서 전면 전환됐다.

---

## 컬러 토큰 (`src/index.css` `:root`)

### 텍스트

| 변수 | 값 | 용도 |
|---|---|---|
| `--text` | `#130e30` | 본문 텍스트 |
| `--text-muted` | `#47435c` | 보조/설명 텍스트 |
| `--text-h` | `#130e30` | 헤딩, 강조, 버튼 채움 배경 |

### 배경

| 변수 | 값 | 용도 |
|---|---|---|
| `--bg` | `#f9fbf2` | 페이지 기본 배경 (크림) |
| `--bg-muted` | `#eff2e5` | 사이드바, 카드, 구획 배경 (올리브 틴트) |

### 테두리

| 변수 | 값 | 용도 |
|---|---|---|
| `--border` | `#130e30` | 강조 테두리 (카드 외곽, 네비) |
| `--border-soft` | `#d9ddce` | 구분선, 비강조 테두리 |

### 포인트 컬러 (앰버)

| 변수 | 값 | 용도 |
|---|---|---|
| `--accent` | `#d9a441` | 포인트 채움 (진행률 바, 토글 on, 제출 버튼, dot 활성) |
| `--accent-hover` | `#c3903a` | accent hover |
| `--accent-ink` | `#130e30` | accent 배경 위 텍스트 |
| `--accent-dark` | `#130e30` | 선택된 pill 채움 배경 (다크) |
| `--accent-dark-hover` | `#221a4d` | accent-dark hover |

### 위험/임박

| 변수 | 값 | 용도 |
|---|---|---|
| `--danger` | `#dc2626` | D-day 임박 텍스트 |
| `--danger-soft-bg` | `#fee2e2` | D-day 임박 배지 배경 |

### 장식용 (UI 컨트롤에 직접 쓰지 않음)

| 변수 | 값 | 용도 |
|---|---|---|
| `--blob-green` | `#a8c9a0` | 온보딩 aside 배경 블롭 |
| `--blob-pink` | `#d9bfd0` | 온보딩 aside 배경 블롭 |
| `--blob-yellow` | `#d9a441` | 온보딩 aside 배경 블롭 |

### 반지름

| 변수 | 값 | 용도 |
|---|---|---|
| `--radius-pill` | `9999px` | 버튼, 배지, 토글, 진행률 바 |
| `--radius-card` | `24px` | 온보딩 카드, 대형 카드 |

새 색이 필요해 보이면 먼저 이 토큰으로 표현할 수 있는지 확인한다. 하드코딩된 hex 값을 새로 추가하지 않는다.

---

## 타이포그래피

- **폰트:** `'Inter', 'Noto Sans KR', ui-sans-serif, system-ui` (`--sans`)
- **기본 크기:** `18px / 150%`
- **헤딩:** `font-weight: 700`, `letter-spacing: -0.01em`, `color: var(--text-h)`
- `color-scheme: light` 고정 — 다크모드 없음

---

## 컴포넌트 패턴

### 필(pill) 선택자 — 단일 선택

`OnboardingForm.css`: `.pill-group` (기본 `flex`) 안에 `.pill` 버튼들.

- **기본:** 흰 배경 + `1px solid var(--text-h)` 테두리 + `var(--text-h)` 텍스트
- **선택됨(`.pill--selected`):** `var(--accent-dark)` 채움 + 흰 텍스트 (다크 solid fill)
- **hover:** `var(--bg-muted)` 배경

`.pill-group--grid`는 2열 그리드, `.pill--flex`는 `flex: 1`로 나란히 배치.

예시: 업종 선택(4개, grid), 사업자 유형(2개, flex).

```html
<div class="pill-group pill-group--grid">
  <button class="pill pill--selected">요식업</button>
  <button class="pill">소매업</button>
</div>
```

### 토글 스위치 — 불리언 상태

`OnboardingForm.css`: `.toggle-row`(`<button type="button">`) + `.switch` / `.switch__knob`.

- **기본:** 흰 배경 + `1px solid var(--text-h)` 테두리
- **켜짐(`.toggle-row--active`):** `var(--bg-muted)` 배경
- **스위치 on(`.switch--on`):** `var(--accent)` (앰버) 배경 + knob이 오른쪽(`left: 23px`)으로 이동
- **스위치 off:** `#d9ddce` 배경 + knob 왼쪽(`left: 3px`)

예시: 직원 유무, 임대 여부.

### 대시보드 사이드바 카테고리 버튼

`Dashboard.css`: `.dashboard__category`.

- **기본:** 배경 없음 + `var(--text-h)` 텍스트
- **hover:** 흰 배경
- **활성(`.active`):** `var(--text-h)` 채움 + 흰 텍스트 (다크 solid fill)
- 카운트(`.dashboard__category-count`): 기본 `--text-muted`, 활성 시 `rgba(255,255,255,0.85)`

### 상단바 필 버튼

`Dashboard.css`: `.dashboard__pill-btn` — "조건 다시 입력", "체크 상태 초기화" 등 액션 버튼.

- `var(--text-h)` 채움 + 흰 텍스트 + `var(--radius-pill)` 반지름
- hover: `var(--accent-dark-hover)` 배경

### 태스크 카드 + D-day 배지

`TaskCard.css`: `.task-card` (`1px solid var(--border-soft)`, `border-radius: 16px`).

- **미완료:** 흰 배경
- **완료(`.task-card--checked`):** `var(--bg-muted)` 배경, `--border-soft` 테두리
- **체크박스:** native `<input type="checkbox">` + `accent-color: var(--text-h)` (다크)
- **D-day 배지(`.task-card__dday`):** `var(--bg-muted)` 배경 + `var(--text-muted)` 텍스트
- **임박 배지(`.task-card__dday--urgent`):** `var(--danger-soft-bg)` 배경 + `var(--danger)` 텍스트 — **7일 이내일 때만** 적용. 모든 배지를 빨강으로 칠하지 않는다.

### 진행률 바

`Dashboard.css`: `.dashboard__progress-bar` (트랙: `var(--border-soft)`) > `.dashboard__progress-fill` (채움: `var(--accent)` 앰버, `transition: width 0.2s ease`).

### 온보딩 2패널 레이아웃

`OnboardingForm.css`: 좌측 고정 aside (380px) + 우측 스크롤 영역.

- **aside(`.onboarding__aside`):** `var(--bg-muted)` 배경 + `1px solid var(--border-soft)` 우측 테두리 + 블롭 장식
- **블롭:** `.onboarding__blob--green` / `--pink` — `filter: blur(90px)`, `opacity: 0.3`, `z-index: 0`, pointer-events 없음. 순수 장식이며 UI 컨트롤에 사용하지 않는다.
- **스텝 인디케이터:** 번호 원형 + 텍스트. 현재 단계(`.onboarding__aside-step--current`)는 `var(--accent)` 원형 + `var(--accent-ink)` 숫자, 완료 단계(`.--done`)는 `var(--text-h)` 채움 + 흰 숫자
- **카드(`.onboarding__card`):** `1px solid var(--text-h)` + `var(--radius-card)` (24px)
- **진행 dots(`.onboarding__dot`):** 기본 `var(--border-soft)`, 활성(`.--active`) `var(--accent)` + 너비 확장

### 온보딩 제출 버튼

- `var(--accent)` 채움 + `var(--accent-ink)` 텍스트 + `var(--radius-pill)`
- hover: `var(--accent-hover)`
- 비활성화: `var(--border-soft)` 채움 + `var(--text-muted)` 텍스트

### 배지/태그

`.onboarding__badge`, `.landing__hero-badge` — `var(--radius-pill)`, `var(--bg-muted)` 배경, `var(--text-h)` 테두리/텍스트(온보딩) 또는 `var(--accent)` 텍스트(랜딩 히어로).

짧은 컨텍스트 정보("5문항 진단", "무료 · 로그인 없이 바로 시작")에 사용.

### 브라우저 크롬 목업 프레임

`Landing.css`: `.landing__mockup-frame` — `border-radius: 14px`, `box-shadow: 0 24px 60px rgba(0,0,0,0.12)`, `1px solid var(--border)`.

- **타이틀바(`.landing__mockup-titlebar`):** `#202124` (다크 크롬 배경) + traffic-light dots + URL 표시줄
- **바디(`.landing__mockup-body`):** `var(--bg-muted)` 배경에 실제 앱 UI 축소판 재현

마케팅/랜딩에서 실제 화면을 보여줄 때 정적 스크린샷 이미지 대신 이 패턴으로 라이브 마크업을 재현한다.

### 랜딩 버튼

- **primary(`.landing__btn--primary`):** `var(--accent)` 채움 + 흰 텍스트
- **secondary(`.landing__btn--secondary`):** 흰 배경 + `#d1d5db` 테두리, hover 시 `#9ca3af`

---

## 레이아웃 패턴

### 온보딩 (`OnboardingForm`)
- 2패널: `flex` row, aside 380px 고정 + 우측 `flex: 1`
- 모바일(`≤860px`): column 전환, aside가 상단 수평 헤더로 축소, steps는 row 방향

### 대시보드 (`Dashboard`)
- 2패널: topbar + `flex` row (사이드바 240px 고정 + 콘텐츠 `flex: 1`)
- 사이드바: `position: sticky`, `top: 0`, `min-height: 100svh`
- 모바일(`≤720px`): column 전환, 사이드바가 상단으로 이동, 카테고리 버튼이 가로 스크롤

---

## 네이밍 / 파일 구조 컨벤션

- 컴포넌트마다 `ComponentName.tsx` + 동일 위치 `ComponentName.css` 페어. `import './ComponentName.css'`로 직접 로드.
- 클래스명은 BEM 스타일: `.block__element--modifier` (예: `.task-card__dday--urgent`).
- Tailwind나 CSS Modules는 쓰지 않는다 — 순수 CSS + `src/index.css`의 커스텀 프로퍼티.

---

## 접근성 메모

- 필/토글은 숨긴 native input trick 대신 `<button type="button">`을 직접 스타일링한다. 필 그룹은 `role="radiogroup"` + 각 버튼 `role="radio"` / `aria-checked`, 토글은 `aria-pressed`.
- 날짜 입력(`<input type="date">`)과 태스크 체크박스는 native 그대로 유지한다 — 키보드 접근성과 OS 위젯(달력 피커)을 그대로 활용하기 위함.
- `color-scheme: light` 고정으로 다크모드 가독성 문제 차단.
