# Design System — "Night Sky" Dark Fintech Theme

> 출처: 레퍼런스 목업 이미지 1장(핀테크/자산관리 랜딩 페이지, 다크 네이비 톤 + 별/달 일러스트 컨셉).
> 이 문서는 원본 카피("Wealthy", "Get in Touch" 등)를 그대로 베끼지 않고, **색상·크기·레이아웃 규칙만 재사용 가능한 디자인 토큰으로 일반화**한 것이다.
> 다른 화면·다른 카피를 넣어도 "같은 톤앤매너"로 보이게 하는 것이 목적.

## 1. 컨셉 한 줄 요약

어두운 남색~보라 그라데이션 배경 위에, 얇은 라인 아이콘과 시안(cyan) 포인트 컬러, 완전히 둥근(pill) 버튼을 쓰는 **차분하고 신뢰감 있는 다크 모드 서비스 톤**. 섹션마다 배경 밝기/색조를 미묘하게 바꿔서 "장면이 전환되는" 느낌을 준다.

## 2. 컬러 팔레트

### 2.1 배경 (섹션별 그라데이션)

| 토큰 | 값 (근사치) | 용도 |
|---|---|---|
| `--bg-hero-start` | `#4B3F8F` | 히어로 섹션 상단/좌측 (보라 글로우) |
| `--bg-hero-mid` | `#2E3A7A` | 히어로 중간 (인디고) |
| `--bg-hero-end` | `#141A3A` | 히어로 하단 / 지평선 근처 |
| `--bg-section-dark` | `#0A0D22` | 콘텐츠 섹션(카드형 정보 블록) 배경 — 거의 블랙 |
| `--bg-accent-gradient` | `#1B2350 → #2B3576` | 보조 섹션(2단 구성) 배경 |

**규칙**: 배경은 절대 단색 블랙이 아니라 **남색↔보라 계열 그라데이션**. 섹션이 바뀔 때 색상 자체를 바꾸기보다 "명도"를 바꿔서 리듬을 만든다 (밝은 그라데이션 섹션 → 거의 검은 섹션 → 다시 그라데이션 섹션).

### 2.2 텍스트

| 토큰 | 값 | 용도 |
|---|---|---|
| `--text-heading` | `#FFFFFF` | 메인 헤드라인, 카드 제목 |
| `--text-body` | `#9AA5C4` | 본문 문단 (흰색이 아닌 옅은 블루그레이) |
| `--text-eyebrow` | `#5FB4E8` | 소제목/라벨 (예: 섹션 상단 작은 태그) — 시안 계열 |

### 2.3 포인트 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `--accent-cyan` | `#4FC3E8` | 아이콘 라인, 섹션 라벨, 하이라이트 텍스트 — **메인 포인트 컬러** |
| `--accent-warm` | `#E8533E` | 일러스트 내 단 하나의 따뜻한 색 포인트 (예: 망원경) — 전체 배색의 90%가 차가운 톤일 때 시선을 끄는 용도로 **아주 적게만** 사용 |
| `--accent-moon` | `#F5EFD9` | 은은한 크림색 포인트 (달, 은은한 광원) |

### 2.4 버튼

| 토큰 | 값 | 용도 |
|---|---|---|
| `--btn-solid-bg` | `#12183A` | 채워진 pill 버튼 배경 (배경보다 살짝 더 어두운 남색) |
| `--btn-solid-text` | `#FFFFFF` | 채워진 버튼 텍스트 |
| `--btn-outline-border` | `#FFFFFF` (1~1.5px) | 외곽선 버튼 |
| `--btn-outline-text` | `#FFFFFF` | 외곽선 버튼 텍스트 |

**컬러 사용 비율 감**: 배경/톤 90% (남색·보라 계열), 텍스트 흰색/그레이 8%, 시안 포인트 1.5%, 웜 포인트 0.5% 미만. 포인트 컬러는 "아이콘 + 소제목"에만 집중해서 쓰고 본문에는 안 쓴다.

## 3. 타이포그래피

- **헤드라인 폰트**: 둥근 지오메트릭 산세리프(예: Poppins, Quicksand, Comfortaa 계열). 각진 고딕이 아니라 곡선이 부드러운 서체를 쓴다.
- **크기 스케일**
  | 요소 | 크기 | 굵기 | 색상 |
  |---|---|---|---|
  | 히어로 헤드라인 (2줄) | 40~48px | Medium/Regular | `--text-heading` |
  | 섹션 타이틀 (예: "Black Advantage") | 24~28px | Medium | `--accent-cyan` |
  | 카드/서브섹션 제목 | 18~20px | Medium | `--text-heading` |
  | 본문 문단 | 14~15px, line-height 1.6~1.7 | Regular | `--text-body` |
  | 네비게이션 링크 | 14px | Regular | `#FFFFFF` |
  | eyebrow 라벨 (소제목 위 작은 태그) | 12~13px, letter-spacing +0.05em | Semibold | `--text-eyebrow` |
  | 버튼 텍스트 | 14px | Semibold | 버튼 종류에 따름 |

- 헤드라인은 항상 **2줄로 줄바꿈된 짧은 문장** (한 줄에 6~8단어 이내) — 읽기 쉬운 리듬을 위해.

## 4. 레이아웃 & 그리드

- **최대 콘텐츠 폭**: 약 1200~1280px, 좌우 여백 넉넉히 (데스크톱 기준 80~120px).
- **네비게이션 바**: 좌측 로고, 그 옆에 가로 텍스트 링크 3~4개, 우측 끝에 pill 버튼 1개. 배경은 투명(히어로 배경 위에 얹힘).
- **히어로 섹션**: 비대칭 2단 그리드 — 좌측 45%에 텍스트(헤드라인 + CTA 버튼, 수직 중앙 정렬), 우측 55%에 일러스트(화면 끝까지 bleed).
- **기능 소개 섹션**: 균등 3열 그리드. 각 열 = 아이콘(상단) → 제목 → 본문 순서, 좌측 정렬, 열 간격 넉넉히.
- **보조 콘텐츠 섹션**: 다시 비대칭 2단 (텍스트 좌측 40%, 일러스트 우측 60%). eyebrow 라벨 → 헤드라인 → 본문 순.
- **섹션 세로 여백**: 섹션 상하 패딩 120~160px로 크게. 헤드라인-본문 간격 20~24px. CTA 버튼은 본문과 32px 이상 띄운다.
- **여백 철학**: 요소를 촘촘히 채우지 않고, 한 섹션에 "핵심 메시지 1개 + 그걸 보조하는 비주얼 1개"만 배치.

## 5. 컴포넌트 스타일

### 버튼
- **완전한 pill 모양** (`border-radius: 9999px`), 패딩 `14px 28px` 내외.
- 2가지 변형만 사용: **solid**(어두운 배경 + 흰 텍스트, 주요 CTA용) / **outline**(투명 배경 + 흰 테두리 + 흰 텍스트, 보조 액션용 예: 로그인).
- 그림자 없음, 대신 hover 시 밝기만 살짝 변화.

### 아이콘
- 얇은 라인 스타일(stroke 1.5~2px), 단색(시안), 원형 배지 안에 들어가거나 자유형.
- 디테일 최소화 — 개념을 상징하는 심플한 모티프(뱃지, 회로, 사람 실루엣 등) 하나만.
- 크기 48~56px.

### 카드/정보 블록
- 배경색 구분 없이(카드 테두리/그림자 없음), 아이콘+제목+본문의 **수직 스택**만으로 카드처럼 보이게 함. 미니멀한 "보더리스 카드" 스타일.

## 6. 일러스트레이션 스타일

- **플랫 벡터 + 듀오톤 실루엣**: 전경은 거의 검정에 가까운 실루엣, 중경은 중간 톤 블루, 배경은 은은하게 빛나는 그라데이션. 레이어드 깊이감.
- 하나의 장면 안에 **작은 디테일(별, 광원 점)** 을 흩뿌려 넣어 밀도감을 주되, 전체 구도는 단순하게 유지.
- 전체 배색 중 **딱 한 군데만 웜 컬러**로 포인트를 줘서 시선을 유도 (예: 위 팔레트의 `--accent-warm`).
- 일러스트는 항상 스토리텔링 요소(인물+행동)를 포함 — 정적인 아이콘이 아니라 "무언가를 하고 있는 장면".

## 7. 다른 프로젝트에 적용할 때 (일반화 가이드)

이 프로토타입(`tax-invoice-agent-prototype/index.html`)처럼 **다른 도메인·다른 카피**에 이 룩을 입힐 때는:

1. 배경 그라데이션 색조(남색↔보라)와 포인트 컬러(시안)의 **관계만 유지**하고, 원본의 "night sky/wealth" 스토리 카피는 가져오지 않는다.
2. 헤드라인은 2줄 이내로 짧게, 본문은 항상 헤드라인보다 눈에 띄게 흐린 톤(`--text-body`)으로.
3. 버튼은 pill 모양 2종(solid/outline)만 쓰고 새로운 버튼 스타일을 늘리지 않는다.
4. 아이콘은 반드시 시안 계열 단색 라인 아이콘으로 통일 — 다색 아이콘/이모지 금지.
5. 섹션마다 배경 명도만 바꿔서 리듬을 주고, 색상 계열 자체(남색·보라)는 전 구간에서 유지.

### CSS 커스텀 프로퍼티 예시 (바로 붙여넣을 시작점)

```css
:root {
  /* backgrounds */
  --bg-hero-start: #4B3F8F;
  --bg-hero-mid: #2E3A7A;
  --bg-hero-end: #141A3A;
  --bg-section-dark: #0A0D22;

  /* text */
  --text-heading: #FFFFFF;
  --text-body: #9AA5C4;
  --text-eyebrow: #5FB4E8;

  /* accents */
  --accent-cyan: #4FC3E8;
  --accent-warm: #E8533E;
  --accent-moon: #F5EFD9;

  /* buttons */
  --btn-solid-bg: #12183A;
  --btn-solid-text: #FFFFFF;
  --btn-outline-border: #FFFFFF;

  /* type scale */
  --font-heading: "Poppins", "Quicksand", sans-serif;
  --font-body: "Poppins", sans-serif;
  --fs-hero: 44px;
  --fs-section-title: 26px;
  --fs-card-title: 19px;
  --fs-body: 15px;
  --fs-eyebrow: 13px;
}

body {
  background: linear-gradient(160deg, var(--bg-hero-start), var(--bg-hero-mid) 50%, var(--bg-hero-end) 100%);
  color: var(--text-body);
  font-family: var(--font-body);
}

.btn-solid {
  border-radius: 9999px;
  background: var(--btn-solid-bg);
  color: var(--btn-solid-text);
  padding: 14px 28px;
  border: none;
}

.btn-outline {
  border-radius: 9999px;
  background: transparent;
  color: var(--btn-outline-text, #fff);
  border: 1.5px solid var(--btn-outline-border);
  padding: 14px 28px;
}
```

## 8. 원본 이미지 파일

원본 레퍼런스: `c:\Users\khans\Downloads\6dff51d2fe25f62dcb5d39948880a2d3.jpg` (사용자 로컬 다운로드 폴더, 레포에는 포함 안 함).
