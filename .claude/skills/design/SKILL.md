---
name: design
description: Articles 서비스의 디자인 시스템. 색상, 타이포그래피, 컴포넌트 스타일, 인터랙션 규칙을 정의. 새 화면/컴포넌트를 만들거나 기존 화면 디자인을 수정할 때 사용.
---

# Articles 디자인 시스템

Articles는 영문 뉴스 기반 해외 주식 모의 투자 학습 서비스다. 실제
구현은 `prototype/style.css`의 `:root` 토큰과 3개 화면(`01_dashboard.html`,
`02_reader.html`, `03_mypage.html`)에 있다. 새 화면/컴포넌트를 만들거나 기존
화면을 고칠 때는 아래 규칙을 그대로 따르고, 새 hex 값이나 임의의 px 값을
추가하지 말고 가능한 한 `prototype/style.css`의 기존 CSS 변수를 재사용한다.

## 0. 디자인 무드

- **핀테크의 신뢰감(토스증권) + 읽기 도구의 편안함(Apple News/Substack).**
  화려한 장식이나 그림자보다 여백, 타이포그래피 위계, 톤 차이로 신뢰감과
  가독성을 동시에 만든다.
- **여백·타이포그래피·정보 위계 중심.** 카드 구분은 보더/그림자보다 배경 톤
  차이(`surface-bg` vs `surface-card`)와 여백(`--space-*`)으로 한다.
- **'인지적 과부하 최소화'라는 기획 목표를 디자인으로 뒷받침한다.**
  `docs/plan.md`가 정의한 핵심 문제(금융 영어의 벽 + 정보 과부하로 인한 피로)를
  디자인 레벨에서도 계속 의식한다 — 용어 하이라이트는 튀지 않는 옅은 노랑,
  AI 요약은 접어둘 수 있는 아코디언, 투자 판단 색상은 국내 증시 관례(매수=
  붉은 계열, 매도=파란 계열)를 따라 낯설지 않게 한다. 화면에 새 요소를 추가할
  때마다 "이게 초보자의 인지 부하를 늘리는가, 줄이는가"를 먼저 따진다.

## 1. CSS 변수 (`:root`)

```css
:root {
  /* Color - Surface */
  --surface-bg: #F7FAFD;
  --surface-card: #FFFFFF;

  /* Color - Text */
  --text-primary: #181C1E;
  --text-secondary: #434655;
  --text-inverse: #FFFFFF;

  /* Color - Brand */
  --brand-navy: #00174B;
  --brand-blue: #004AC6;
  --brand-blue-light: #DBE1FF;

  /* Color - Highlight (용어 하이라이트) */
  --accent-yellow: #FEF08A;
  --accent-yellow-text: #CA8A04;

  /* Color - Decision Action (국내 증시 관례: 매수=붉은 계열, 매도=파란 계열) */
  --action-buy-bg: #FFDAD6;
  --action-buy-text: #93000A;
  --action-hold-bg: #DCE3EC;
  --action-hold-text: #5E656D;
  --action-sell-bg: #DBE1FF;
  --action-sell-text: #003EA8;

  /* Color - Fallback Alert (경고지만 불안감 조성 안 하는 톤) */
  --alert-bg: #FFFBEB;
  --alert-border: #FBBF24;
  --alert-text: #92400E;

  /* Color - Difficulty (기사 난이도 뱃지, 쉬움→어려움 파스텔 그라데이션) */
  --difficulty-easy-bg: #DDF3E4;
  --difficulty-easy-text: #146C2E;
  --difficulty-medium-bg: #FDECC8;
  --difficulty-medium-text: #8A5A00;
  --difficulty-hard-bg: #FCE1D2;
  --difficulty-hard-text: #9A3B12;

  /* Color - Border (옅은 구분선/힌트용, 형광펜·색상 대신 조용히 존재하는 톤) */
  --border-subtle: #D6D9E0;

  /* Spacing (4px 단위) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

**팔레트 출처:** 색상 팔레트는 Google Stitch가 생성한 Material 팔레트를
기반으로, 서비스 고유의 의미(용어 하이라이트, 매수/관망/매도 판단, 원문
만료 경고)만 별도 토큰으로 매핑해 확장한 것이다. 새 색이 필요하면 이
팔레트의 톤 안에서 고르고, 관계없는 새 hex 값을 임의로 넣지 않는다.

## 2. 타이포그래피

**폰트 로드:** `<head>`에서 Google Fonts CDN으로 Inter(400/500/600/700)를,
jsdelivr CDN으로 Pretendard 웹폰트를 각각 `<link>` 태그로 로드한다(자바스크립트
없이 순수 링크 태그만 사용). `font-family`는 `"Pretendard", "Inter", system-ui,
-apple-system, sans-serif` 순서로 지정해 두 폰트 로드가 실패해도 시스템
폰트로 자연스럽게 폴백되게 한다.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
<link
  rel="stylesheet"
  as="style"
  crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendardvariable-dynamic-subset.css"
/>
```

| 스케일 | 크기 / 줄간격 / 굵기 | 용도 | 적용 위치 |
|---|---|---|---|
| headline-lg | 24px / 32px / 600, letter-spacing -0.01em, color `--brand-navy` | 화면 최상단 제목 | `h1` |
| headline-md | 20px / 28px / 600, color `--brand-navy` | 카드/섹션 제목 | `h2` (뉴스 카드 헤드라인, 히스토리 제목) |
| body-lg | 16px / 26px / 400, color `--text-primary`, margin-bottom `--space-lg` | 리더뷰 원문 본문 | `.article-content .paragraph` (문장 아코디언이 섞여 들어가 `<p>` 대신 `<div>` 사용) |
| body-md | 14px / 22px | 본문/보조 텍스트 | 페이지 부제, 카드 번역문, AI 요약/인사이트/히스토리 본문 |
| body-sm | 13px / 20px | 툴팁/메타데이터 | `.tooltip` 텍스트, 매체명, 날짜, back-link |
| label-lg | 14px / 20px / 600, letter-spacing 0.05em | 버튼/뱃지 | 투자 판단 버튼 라벨, `.badge`, 아코디언 summary |

## 3. 컴포넌트 스타일

- **`.app-container`** — `max-width: 720px`, 중앙 정렬, `background:
  var(--surface-bg)`, `padding: var(--space-xl) var(--space-lg)`. 모바일 앱
  프레임이 아니라 일반 웹페이지 레이아웃임에 유의(375px 폰 프레임 아님).
- **`.news-card`** — `background: var(--surface-card)`,
  `border-radius: var(--radius-lg)`, `padding: var(--space-md)`. 카드 구분은
  `surface-bg` 배경 위 흰 카드 톤 차이로만 하고 보더/그림자는 남발하지 않는다.
  매체 로고는 썸네일 이미지 대신 이니셜 텍스트 placeholder(`.source-logo`,
  navy 배경 + 흰 텍스트)를 쓴다.
- **`.term` / `.tooltip`** — 용어 버튼 `.term`은 `background:
  var(--accent-yellow)`, `color: var(--brand-navy)`,
  `border-radius: var(--radius-sm)`. 팝업되는 `.tooltip`은
  `background: var(--brand-navy)`, `color: var(--text-inverse)`,
  `border-radius: var(--radius-md)`, `padding: var(--space-md)`. 그 안의
  `.metaphor`(비유 1줄)는 `color: var(--accent-yellow-text)`로 강조하고, 그
  다음 줄에 명확한 뜻 1줄을 붙인다.
- **`.sentence-accordion`** — 문장 단위 인라인 번역(2026-07-14 피벗, 리더뷰
  기능①). 원문 문장 자체는 색상·굵기를 그대로 두고, 문장 블록 아래에만
  `border-bottom: 1px dotted var(--border-subtle)`로 옅은 점선 힌트만 준다.
  파란 밑줄, 형광펜 배경, "[번역 보기]" 같은 별도 라벨은 쓰지 않는다 — 시각
  노이즈 최소화가 목적. 펼침 영역(`.sentence-translation`)은
  `background: var(--surface-bg)`, `padding: var(--space-md)`,
  `border-radius: var(--radius-md)`로 튀지 않게 감싼다.
- **`.ai-summary`** — `background: var(--brand-blue-light)`,
  `border-radius: var(--radius-md)`, `padding: var(--space-md)`,
  `margin: var(--space-xl) 0`. 3줄 불릿 요약을 담는다.
- **`.ai-insight`** — `border-left: 4px solid var(--brand-blue)`,
  `background: var(--surface-bg)`, `padding: var(--space-md)`. "이 기사가
  주가에 미치는 영향" 한 줄 해설을 담는다.
- **`.alert-fallback`** — `background: var(--alert-bg)`,
  `border: 1px solid var(--alert-border)`, `color: var(--alert-text)`,
  `border-radius: var(--radius-md)`. 원문 링크 만료/페이월 발생 시 마이페이지
  복기 화면에 쓴다.
- **`.badge`** — 마이페이지 투자 판단 뱃지. `border-radius: var(--radius-full)`,
  `padding: var(--space-xs) var(--space-sm)`, 폰트는 label-lg 스케일을
  재사용한다. `.badge.buy`/`.badge.hold`/`.badge.sell` 수식자로
  `--action-buy/hold/sell-bg`·`-text` 토큰을 매핑한다. 대시보드 카드의 난이도
  칩도 같은 `.badge` 베이스를 재사용하며 `.badge.easy`/`.badge.medium`/
  `.badge.hard` 수식자로 `--difficulty-easy/medium/hard-bg`·`-text`를
  매핑한다(기사 난이도 뱃지, 2026-07-26).

## 4. 인터랙션 원칙 — 자바스크립트 절대 금지

모든 인터랙션은 **자바스크립트 없이** `:focus`, `:checked`, 네이티브
`<details>`/`<summary>`만으로 상태를 제어한다.

- **용어 툴팁:** `<button class="term">`을 `:focus`일 때만 `.tooltip`을
  노출한다(`.term:focus .tooltip { opacity:1; visibility:visible; }`).
- **AI 요약:** `<details class="ai-summary"><summary>AI 요약 보기</summary>...`
  네이티브 아코디언을 그대로 쓴다. `open` 상태 스타일링만 `[open]` 어트리뷰트
  선택자로 한다.
- **문장 탭 아코디언 (2026-07-14 결정):** 문장 탭 힌트는 하이라이트가 아닌
  옅은 점선 밑줄로 표시 — 원문 독해 방해 최소화. 클릭 영역은 점선 자체가
  아닌 문장 전체 블록으로 설정 — 모바일 터치 안정성 확보 (Kindle/Medium류
  독서 앱의 인라인 인터랙션 관례 참고). `<details><summary>`를 그대로 쓰되
  `summary`를 `display: block`으로 펼쳐 문장 전체가 클릭 영역이 되게 하고,
  `padding: var(--space-xs) 0`로 인접 문장을 잘못 건드리지 않을 여유를 준다.
- **투자 판단 버튼:** 숨김 라디오 3개(`#buy`, `#hold`, `#sell`) + `label`
  버튼 조합으로 만들고, `input:checked ~ .decision-buttons label[for="..."]`
  형제 선택자로 매수/관망/매도 색상을 적용하며, 라디오 중 하나라도 checked면
  `~ .decision-toast`가 노출되도록 한다.
  - ⚠️ **라디오를 숨기는 선택자는 반드시 실제 DOM 구조(조상-자손 관계)를
    확인한다.** 라디오 입력이 `.decision-buttons`의 자식이 아니라
    `.decision-panel` 폼의 형제 요소로 존재하는 구조라면,
    `.decision-buttons input[type="radio"] { opacity:0; ... }`처럼 잘못된
    조상을 기준으로 선택자를 쓰면 매치되지 않아 브라우저 기본 라디오
    동그라미가 그대로 노출되는 버그가 난다(실제로 발생했던 회귀). 항상
    `.decision-panel input[type="radio"]`처럼 실제 부모 요소를 기준으로
    숨김 선택자를 작성하고, 브라우저에서 렌더링해 라디오가 안 보이는지
    눈으로 확인한다.
- **sticky 하단 영역은 배경색 + z-index를 반드시 지정한다.** 투자 판단
  버튼처럼 `position: sticky; bottom: 0;`으로 화면 하단에 고정하는 영역은
  `background`를 명시하지 않으면 투명 배경 위로 스크롤되는 본문 텍스트가
  비쳐 겹쳐 보인다. `background: var(--surface-bg)`와 `z-index: 50`(또는
  다른 겹치는 요소보다 높은 값)을 함께 지정해 겹침을 방지한다.

## 5. 사이드바 내비게이션 (2026-07-15 결정)

`Sidebar.jsx` — 대시보드/리더뷰/마이페이지 3화면을 잇는 전역 내비게이션.
`docs/plan.md`의 내비게이션 정책과 `docs/backlog.md` "글로벌 내비게이션(사이드바,
신규)" Task 기준. 메일 앱류 사이드바의 구조 패턴만 참고하고 레이아웃은
가져오지 않았다(아래 "제외한 것" 참고). 이 컴포넌트는 React Router의
`NavLink`/`useEffect`로 라우팅·데이터 로딩을 하는 앱 셸(App.jsx) 레벨 전역
내비게이션이라, 섹션 4의 "자바스크립트 절대 금지" 원칙은 적용되지 않는다 —
그 원칙은 리더뷰 안 프로토타입 인터랙션(용어 툴팁, 아코디언, 투자 판단
버튼)에 한정된다.

- **상단 Primary 액션 버튼 + 단일 Menu 그룹.**
  `.sidebar-primary-btn`은 `--brand-blue` 배경 + `--text-inverse` 텍스트로
  눈에 띄게 배치하고 대시보드('/')로 이동한다. 그 아래 `.sidebar-group-label`
  ("Menu") 하나에 대시보드·인사이트 노트·단어장을 모두 나열한다(2026-07-26
  이전엔 History 그룹으로 분리돼 있었으나 화면 구조가 단순해 통합).
- **메뉴 항목에 카운트 뱃지 표시.** 단어장·인사이트 노트 옆
  `.sidebar-badge`에 각각 `GET /api/vocabulary`, `GET /api/decisions` 응답
  배열의 length를 실시간으로 표시한다. 옅은 배경(`--surface-bg`) + 작은
  텍스트로, 카드 톤 차이 원칙과 동일하게 튀지 않게 만든다.
- **활성 메뉴는 연한 배경색으로 강조.** `NavLink`의 `isActive`로
  `.sidebar-link.active`를 토글해 `--brand-blue-light` 배경 + `--brand-blue`
  텍스트 + 굵은 폰트 웨이트로 현재 위치를 표시한다.
- **리더뷰에서는 사이드바를 숨기고, 리더뷰 자체에 뒤로가기 버튼을 배치.**
  `App.jsx`가 경로가 `/reader`일 때 `<Sidebar />`를 렌더링하지 않는다(완전히
  언마운트, CSS로 숨기지 않음). "몰입 방해 요소 최소화" 원칙에 따라
  뒤로가기(`.back-link`)는 사이드바가 아니라 `Reader.jsx` 좌측 상단에 직접
  둬서 책임을 분리한다.
- **제외한 것.** 참고 레퍼런스(메일 앱 사이드바)의 3단 분할 레이아웃(목록+
  본문 동시 표시)과 macOS 신호등 창 장식은 우리 3화면 구조·몰입형 리더뷰와
  무관해 의도적으로 가져오지 않았다. 사이드바는 메뉴 구조 패턴만 차용한다.

## 6. 새 화면/컴포넌트 작업 체크리스트

1. 색은 `:root`의 기존 변수만 쓴다. 새 hex 값을 직접 넣지 않는다.
2. 글자 크기는 이 문서의 타이포그래피 스케일(headline-lg/md, body-lg/md/sm,
   label-lg) 중 하나를 그대로 쓴다.
3. 카드는 `surface-card` 배경 + `radius-lg`가 기본값이고, 그림자는 쓰지
   않는다.
4. 간격은 `--space-*` 변수만 쓰고 임의의 px 값을 하드코딩하지 않는다.
5. 인터랙션이 필요하면 자바스크립트를 절대 쓰지 않고 `:focus`/`:checked`/
   `<details>`로만 구현하며, 숨김 요소의 CSS 선택자가 실제 DOM 구조와
   맞는지 브라우저에서 눈으로 확인한다.
6. 화면 하단에 sticky로 고정되는 영역은 배경색과 z-index를 빠뜨리지 않는다.
7. `prototype/` 아래 3개 화면(`01_dashboard.html`, `02_reader.html`,
   `03_mypage.html`)과 `style.css`를 React로 포팅할 때의 동작 사양
   레퍼런스로 삼는다.
