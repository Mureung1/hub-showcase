---
name: design
description: 브리플리 서비스의 디자인 톤(컬러, 폰트, 카드 스타일, 여백)을 정의한 규칙. 새 화면이나 컴포넌트를 만들 때, 또는 기존 화면 디자인을 수정할 때 사용.
---

# 브리플리 디자인 시스템

브리플리(Briefly)는 금융 리터러시와 영어 학습을 결합한 모바일 웹 서비스다.
디자인 원본은 `stitch-reference/briefly_core/DESIGN.md`이며, 실제 구현은
`prototype/style.css`의 `:root` 토큰과 6개 화면(`01_home.html` ~ `06_term.html`)에
있다. 새 화면/컴포넌트를 만들거나 기존 화면을 고칠 때는 아래 규칙을 그대로 따르고,
가능한 한 `prototype/style.css`의 기존 CSS 변수를 재사용한다.

## 0. 기본 원칙

- **모바일 웹, 375px 기준.** 모든 화면은 `.phone-frame`(width 375px, height 812px
  고정) 안에서 렌더링되는 것을 전제로 디자인한다. `.screen-content`는
  `flex:1; min-height:0; overflow-y:auto;`로 내부 스크롤이 실제로 일어나야 한다
  (부모 프레임이 늘어나면 안 됨).
- **UI 텍스트는 영어, 학습 콘텐츠는 한국어.** 버튼, 타이틀, 안내 문구, 라벨,
  네비게이션 등 인터페이스 텍스트는 영어로 작성한다. 반면 영어 문장의 한글 해석,
  단어/표현 뜻풀이, 투자 용어의 정의·맥락 설명 같은 학습 콘텐츠는 한국어를
  유지한다. 용어 자체(EPS, Rally, guidance 등 전문 영어 용어)는 원래부터 영어이므로
  그대로 두고, 그 용어에 붙는 한글 설명만 한국어로 남긴다.
- **톤:** 담백하고 신뢰감 있는 핀테크 스타일. 과도한 그림자나 장식 없이, 여백과
  톤 차이로 위계를 만든다.

## 1. 컬러 시스템

`prototype/style.css`의 `:root`에 전체 팔레트가 정의되어 있다(`DESIGN.md`의
`colors:` 블록과 동일). 실제 화면에서 반복적으로 쓰는 핵심 토큰:

| 변수 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#0059b9` | 브랜드 메인 컬러. 버튼, 링크, 강조 텍스트, 진행바 |
| `--color-primary-container` | `#1071e5` | 프라이머리 그라디언트/hover의 더 밝은 쪽 |
| `--color-on-primary` | `#ffffff` | 프라이머리 배경 위 텍스트 |
| `--color-primary-fixed` | `#d7e2ff` | 연한 블루 필(하이라이트, 태그, active 상태 배경) |
| `--color-on-primary-fixed-variant` | `#004491` | primary-fixed 배경 위 텍스트 |
| `--color-surface` | `#f8f9ff` | 화면 기본 배경(거의 흰색에 가까운 블루 틴트) |
| `--color-surface-container-lowest` | `#ffffff` | 카드 배경(순백) |
| `--color-surface-container-low` | `#eff4ff` | 보조 배경(버튼 secondary, 아코디언 등) |
| `--color-surface-container` | `#e9eefb` | 세그먼트 컨트롤(난이도 토글) 트랙 배경 |
| `--color-surface-container-high/highest` | `#e3e8f5` / `#dde3ef` | 프로그레스바 트랙, 배지 보더 등 더 진한 톤 |
| `--color-on-surface` | `#161c25` | 기본 텍스트(제목, 본문) |
| `--color-on-surface-variant` | `#414754` | 보조 텍스트(캡션, 설명) |
| `--color-outline-variant` | `#c1c6d6` | 카드 보더, 구분선(hairline) |
| `--color-secondary` | `#5c5f61` | 라벨/캡션의 중간 톤 텍스트 |
| `--color-error` | `#ba1a1a` | 배지("Hot") 등 강조 경고 |

**색상 사용 규칙**
- 카드/컨테이너 배경은 `surface-container-lowest`(흰색) + `outline-variant` 1px
  보더 조합이 기본. 그림자 대신 이 보더로 구분한다.
- 강조가 필요한 히어로 카드(오늘의 브리핑 카드 등)만 `primary → primary-container`
  대각선 그라디언트를 쓴다.
- 학습 문장 속 핵심 표현 하이라이트는 `background: var(--color-primary-fixed);
  color: var(--color-on-primary-fixed-variant);` 필(pill) 스타일을 쓴다
  (`.highlight` 클래스). 노란색이 아니라 소프트 블루다.
- 새 색상 값이 필요하면 먼저 `:root`에 이미 정의된 토큰 중에 맞는 것이 있는지
  확인하고, 없으면 `DESIGN.md`의 전체 팔레트에서 가져와 변수로 추가한다.
  임의의 새 hex 값을 인라인으로 쓰지 않는다.

## 2. 타이포그래피

폰트는 두 종류만 쓴다: 제목/디스플레이용 **Hanken Grotesk**(`--font-display`),
본문/라벨용 **Inter**(`--font-body`). 구글 폰트 `@import`로 로드한다.

| 변수 | 크기/줄간격/굵기 | 용도 |
|---|---|---|
| `--display-lg-*` | 32px / 40px / 700 | (현재 화면에서는 미사용, 초대형 타이틀용으로 예약) |
| `--headline-md-*` | 24px / 32px / 700 | 기사 헤드라인(`h1`), 브리핑 티커("Apple Inc. (AAPL)") |
| `--sentence-text-size/line` | **21px / 30px** | 학습 문장 원문 전용 크기. `headline-md`(24px/32px)에서 파생되었지만 별도 변수로 분리됨(아래 "변수 분리 원칙" 참고). **굵기는 용도에 따라 다르다:** `05_sentence.html`의 `.sentence-card .en-text`(인터랙티브 카드 원문)는 `--headline-md-weight`(700, bold)를 그대로 쓰고, `02_entry.html`의 `.sentence-preview-item .preview-en-text`(하이라이트·뜻풀이 없는 단순 미리보기)는 `font-weight: 400`(normal)으로 스코프되어 있다. 크기/줄간격은 변수를 공유하되 굵기는 화면 목적에 따라 다르게 스코프한 사례 |
| `--headline-sm-*` | 20px / 28px / 600 | 화면 타이틀(`.section-title`, `.nav-title`), 버튼 텍스트, 프로그레스 fraction |
| `--body-lg-*` | 17px / 26px / 400 | (영어 학습 본문에 권장되는 크기, 현재 화면 대부분은 body-md 사용) |
| `--body-md-*` | 15px / 22px / 400 | 본문 텍스트(요약 리스트, 한글 해석, 용어 정의) |
| `--label-md-*` | 13px / 18px / 500 | 캡션, 보조 라벨, 난이도 토글 텍스트 |
| `--label-sm-*` | 11px / 14px / 600 | 아주 작은 라벨(배지, 하단 내비 텍스트, 숫자 원) |

**타이포그래피 규칙**
- 제목류(headline, display)는 항상 Hanken Grotesk + 음수 letter-spacing
  (`-0.01em` ~ `-0.02em`)으로 촘촘하고 프리미엄한 느낌을 준다.
- 본문/라벨류는 항상 Inter, letter-spacing 0 또는 살짝 양수(`0.01em`).
- 카드별로 강조가 필요한 요소(용어 카드의 용어명 등)는 공용 변수를 그대로 쓰지
  않고 스코프된 값으로 미세 조정할 수 있다(아래 원칙 참고). 예: `.term-card
  .term-name`은 `headline-sm-size`(20px)가 아니라 `18px`로 살짝 축소되어 있다.

### 변수 분리 원칙 (중요)

`--headline-md-size` 같은 공용 타이포그래피 변수는 화면 여러 곳에서 동시에
쓰인다(브리핑 티커, 기사 헤드라인, 학습 문장 등). **한 곳의 글자 크기만 조정하고
싶을 때는 공용 변수 값을 직접 바꾸지 말고, 그 용도만을 위한 전용 변수를
새로 만들거나 해당 셀렉터에 값을 직접 스코프한다.** 예:
`--sentence-text-size`/`--sentence-text-line`은 `02_entry.html`의 문장
미리보기와 `05_sentence.html`의 문장 카드 두 곳에서만 쓰이도록 분리된
전용 변수이고, `.term-card .term-name`의 `18px`은 다른 곳에 영향 없이
그 셀렉터에만 스코프된 값이다. 반대로 정말 여러 화면에 공통으로 적용해야
하는 조정이라면(예: 두 화면이 이미 같은 전용 변수를 공유 중이라면) 그 변수
값 하나만 바꿔서 일괄 적용한다. 같은 원칙은 `font-weight`에도 적용된다:
`.preview-en-text`와 `.en-text`는 크기(`--sentence-text-size`)는 공유하지만
굵기는 각 셀렉터에 직접 스코프해서 서로 다르게 유지한다(하나는 400, 하나는
`--headline-md-weight`=700).

## 3. 카드 스타일

Radius 스케일(`DESIGN.md`의 `rounded:` 값 그대로):

| 변수 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | 4px | 하이라이트 pill, 카드 인디케이터 활성 바 |
| `--radius` | 8px | 난이도 토글의 개별 버튼 |
| `--radius-md` | 12px | 버튼, 입력/컨트롤, 아코디언 summary/body |
| `--radius-lg` | 16px | 보조 카드(메트릭 카드, 썸네일) |
| `--radius-xl` | 24px | **메인 컨테이너 카드** — 브리핑 히어로 카드, 스트릭 박스, 문장 카드, 용어 카드 |
| `--radius-full` | 9999px | 원형/필 요소(배지, 태그, 프로그레스바, 아이콘 버튼, 숫자 원) |

카드 기본 패턴:
- 배경 `surface-container-lowest`(흰색) + `1px solid outline-variant` 보더.
- 패딩은 `--space-stack-lg`(24px)를 기본으로 한다.
- **그림자를 남발하지 않는다.** DESIGN.md 원칙대로 카드 구분은 보더와 톤 차이로만
  하고, 그림자는 화면 하단에 떠 있는 요소(바텀 CTA, 바텀 내비)에만 단일
  스타일로 적용한다: `--shadow-float: 0px 10px 30px rgba(0,0,0,0.05)`.
  `.bottom-cta:last-child`와 `.bottom-nav`처럼 실제로 화면 맨 아래 붙는
  요소에만 붙이고, 둘 다 있는 화면에서는 마지막 요소(대개 `.bottom-nav`)만
  그림자를 갖는다.
- 카드 안에서 리스트를 나눌 때는 카드 보더가 아니라 내부 요소 사이에
  `1px solid outline-variant` 구분선을 넣는다(`.sentence-preview-item`,
  `.expr-body` 앞 구분 등).

## 4. 버튼 스타일

- **Primary (`.btn-cta`):** 배경 `--color-primary`, 텍스트 `--color-on-primary`,
  폰트는 Hanken Grotesk `headline-sm`(20px/600), radius `--radius-md`(12px),
  패딩 16px, hover 시 `primary-container`로 밝아짐, active 시 `scale(0.98)`.
  보더 없음.
- **Secondary (`.btn-cta--secondary`):** 배경 `surface-container-low`, 텍스트
  `primary`, 나머지 속성은 primary와 동일(보더 없음).
- 버튼 안에 화살표 등 보조 아이콘이 필요하면 `<span>→</span>`처럼 별도
  span으로 감싸고, flex(`display:flex; align-items:center; gap:8px;`)로
  텍스트와 정렬한다.
- 아이콘 전용 버튼(뒤로가기, 홈, 햄버거 등)은 32px 정사각형, `radius-full`,
  기본 색은 `primary`, hover 시 `surface-container-low` 배경, active 시
  `scale(0.95)`.

## 5. 간격(Spacing) 시스템

4px 단위 스케일(DESIGN.md `spacing:` 그대로):

| 변수 | 값 | 용도 |
|---|---|---|
| `--space-unit` | 4px | 기본 단위 |
| `--space-margin-mobile` | 20px | 화면 좌우 세이프 마진(`.screen-content` 패딩) |
| `--space-gutter` | 16px | 그리드 거터 |
| `--space-stack-sm` | 8px | 카드 내부 요소 간 좁은 간격 |
| `--space-stack-md` | 16px | 카드 내부 기본 간격, 카드 패딩(보조 카드) |
| `--space-stack-lg` | 24px | 카드 간 간격, 메인 카드 패딩 |
| `--space-section-gap` | 40px | 화면 내 큰 섹션 사이 간격(예: 히어로 카드 ↔ 스트릭 박스) |

## 6. 반복되는 컴포넌트 패턴

새 화면을 만들 때 참고할 기존 패턴:

- **상단 진행 표시:** 라벨(영어, `label-md`, `secondary` 색) + 분수
  (`headline-sm`, `primary` 색)를 한 줄에 배치하고, 그 아래 6px 두께의
  얇은 트랙(`surface-container-highest`) + 채워진 바(`primary`, `radius-full`)
  를 인라인 `style="width: NN%"`로 넣는다(`.progress-section` 참고).
- **상단 내비:** `back(‹) / title / home(⌂)` 3분할, 56px 높이, 하단 보더
  1px `outline-variant`. 홈 화면만 예외로 `hamburger / logo / profile`
  구성(`.home-topbar`).
- **숫자 원형 리스트:** 22px 원형, `primary` 배경, 흰 숫자(`label-sm`,
  700). 요약 리스트(`.summary-list .num`)와 문장 미리보기
  (`.sentence-preview-item .num`)에서 공유.
- **하이라이트 텍스트:** 학습 문장 속 핵심 표현에만 `.highlight` 클래스(연한
  블루 필)를 쓴다. 단순 미리보기 목적으로 뜻풀이 없이 원문만 보여줄 때는
  하이라이트도 넣지 않는다(과도한 강조 방지).
- **CSS-only 인터랙션:** 카드 전환/난이도 토글처럼 JS 없이 라디오 입력 +
  `:checked ~` 형제 선택자로 구현된 인터랙션 구조가 있다(`05_sentence.html`).
  이 구조를 수정할 때는 시각 스타일만 바꾸고, 라디오/레이블 결선 자체는
  건드리지 않는다.

## 7. 새 화면/컴포넌트 작업 체크리스트

1. 색은 `:root`의 기존 변수만 쓴다. 새 hex 값을 직접 넣지 않는다.
2. 글자 크기는 이 문서의 타이포그래피 스케일 중 하나를 그대로 쓰거나,
   여러 화면에 공유되는 변수라면 "변수 분리 원칙"에 따라 전용 변수를
   새로 만든다.
3. 카드는 `radius-xl` + 흰 배경 + `outline-variant` 보더가 기본값이다.
4. 버튼은 `.btn-cta` / `.btn-cta--secondary`를 재사용한다.
5. 간격은 `--space-*` 변수만 쓰고 임의의 px 값을 하드코딩하지 않는다
   (아이콘 크기처럼 스케일에 없는 아주 작은 값은 예외).
6. UI 텍스트는 영어로, 학습 콘텐츠(번역/뜻풀이/맥락 설명)는 한국어로 작성한다.
7. 375px 폭 기준으로 디자인하고, 콘텐츠가 길어지면 `.screen-content`가
   내부 스크롤되는지 확인한다(화면 프레임 자체가 늘어나면 안 됨).
