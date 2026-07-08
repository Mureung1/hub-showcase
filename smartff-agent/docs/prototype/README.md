# SmartFF Agent — HTML/CSS 프로토타입

## 개요

SmartFF Agent의 기획을 검증하기 위한 정적 HTML/CSS 프로토타입입니다.  
GS 브랜드 아이덴티티를 유지하면서, 사내 업무용 대시보드 느낌으로 설계되었습니다.

**핵심 특성:**
- ✅ Tailwind CDN 기반 (빌드 도구 없음)
- ✅ 4개 독립 HTML 페이지 (Dashboard, Analysis, Financial, Upload)
- ✅ 공통 디자인 시스템 정본 (`_component-sheet.html`)
- ✅ React 전환 시 컴포넌트 경계를 명시한 주석
- ✅ 데스크톱 중심 설계 (24~27인치 모니터)

---

## 폴더 구조

```
prototype/
├── dashboard.html              # 오늘의 핵심 의사결정 한눈에 보기
├── analysis.html               # 판매 패턴 상세 분석
├── financial.html              # 관리회계 수치 확인
├── upload.html                 # 데이터 업로드 및 내역
├── _component-sheet.html       # 디자인 시스템 정본 (스타일 가이드)
├── assets/
│   ├── js/
│   │   └── config.js           # Tailwind 설정 + GS 브랜드 토큰
│   └── css/
│       └── custom.css          # 커스텀 CSS (최소한만)
└── README.md                   # 이 파일
```

---

## 브라우저에서 열기

### 방법 1: 파일 시스템에서 직접 열기 (권장)
각 HTML 파일을 브라우저에 드래그하거나 더블클릭하면 `file://` 프로토콜로 실행됩니다.

```bash
# 또는 명령줄에서
# macOS/Linux
open dashboard.html

# Windows
start dashboard.html
```

### 방법 2: 간단한 로컬 서버 (선택)
Python이 있다면:
```bash
# Python 3.x
python -m http.server 8000

# Python 2.x
python -m SimpleHTTPServer 8000
```

그 후 브라우저에서 `http://localhost:8000/dashboard.html`로 접속합니다.

---

## 각 페이지 설명

### 1. Dashboard (`dashboard.html`) — 가장 중요한 화면
**목적:** 점주가 접속 후 5초 내에 오늘의 핵심 의사결정을 파악

**구성:**
- **Today's Decision Summary (KPI):** 적극 발주/유지/신중 발주 카테고리 수
- **Category Priority:** 각 카테고리의 추천 기조 및 요약 (Analysis로 drill-down 가능)
- **AI Recommendation:** Dashboard 내 가장 큰 비중 — 자연어 기반 추천 근거 설명
- **데이터 기준 배지:** Topbar에 항상 노출 (최근 4주 데이터, 마지막 업로드 시각)

**의사결정 흐름:** "몇 개? → 어떤 카테고리? → 왜?"

---

### 2. Analysis (`analysis.html`)
**목적:** Dashboard 추천의 "왜?"에 답하기 위한 판매 패턴 상세 분석

**구성:**
- **필터바 (Sticky):** 카테고리, 기간 선택
- **요일별 판매 패턴:** 막대 그래프 (bar chart)
- **시간대별 판매 패턴:** 라인 그래프 (line chart)
- **판매·폐기 추세:** 최근 8주 시계열 다중선 그래프
- **인사이트 박스:** 차트에서 읽을 수 있는 주요 포인트

**용도:** Dashboard의 Category Priority 카드에서 클릭 시 해당 카테고리 필터가 적용된 채로 열림 (현재 프로토타입에서는 시뮬레이션)

---

### 3. Financial (`financial.html`)
**목적:** 관리회계 관점의 수익성 수치 집중 분석

**구성:**
- **요약 Stat (상단):** 평균 마진 / 평균 마진율 / 평균 폐기원가
- **카테고리별 테이블 (메인):** 
  - 평균 마진 (원)
  - 마진율 (%)
  - 평균 폐기원가 (원) — Dashboard KPI와 연결되는 지표
  - 추천 기조 Badge (적극 발주/유지/신중 발주)
- **인사이트:** 수익성 관점의 주요 포인트

**특징:** Dashboard의 KPI 분류(적극 발주/유지/신중 발주)와 동일한 체계로 연결

---

### 4. Upload (`upload.html`)
**목적:** 판매/발주/폐기 데이터 업로드 및 누적 분석

**구성:**
- **안내 문구:** "업로드된 데이터는 자동으로 누적 분석됩니다" (Data Lifecycle 강조)
- **3개 업로드 카드 (3열 그리드):**
  - 판매 데이터
  - 발주 데이터
  - 폐기 데이터
- **최근 업로드 내역 테이블:** 파일명, 종류, 일시, 건수, 상태

**특징:** 드래그&드롭 영역으로 표현 (프로토타입이므로 실제 업로드 기능 없음)

---

## 디자인 시스템 정본

`_component-sheet.html`에서 모든 컴포넌트의 Tailwind 클래스 조합을 확정합니다.

### Typography (4단계)
- **페이지 제목:** `text-xl font-semibold`
- **섹션 제목:** `text-base font-semibold`
- **라벨/캡션:** `text-sm font-medium text-slate-500`
- **본문:** `text-sm text-slate-600`
- **숫자 강조:** `text-3xl font-bold tabular-nums`

### Spacing
- **카드 패딩:** `p-5` (20px)
- **카드 간 gap:** `gap-4` (16px)
- **섹션 간 마진:** `mb-6` (24px)

### Color Tokens (GS 브랜드)
- **Primary (파란색):** `#0067C5` → `bg-primary`, `text-primary`
- **Accent (주황색):** `#F58220` → `bg-accent`, `text-accent`
- **Success (초록색):** `#6BBE45` → `bg-success`, `text-success`
- **Background:** `#F8FAFC` → `bg-bg`

### Component Patterns
- **Card:** `bg-white rounded-xl border border-slate-200 shadow-sm p-5`
- **Button Primary:** `bg-primary text-white rounded-lg hover:opacity-90`
- **Button Secondary:** `border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50`
- **Badge (추천 기조):**
  - 적극 발주: `bg-success/10 text-success`
  - 유지: `bg-slate-100 text-slate-600`
  - 신중 발주: `bg-accent/10 text-accent`

### App Shell (Topbar & Sidebar)
두 요소는 4개 페이지에서 **100% 동일하게 유지**되어야 React 전환 시 컴포넌트로 추출 가능합니다.

**Topbar 특성:**
- 고정 위치 (`fixed top-0 left-0 right-0 h-16`)
- 슬로건 + 점포 정보 + 데이터 기준 배지 상시 표시
- z-index: 50 (Sidebar 위)

**Sidebar 특성:**
- 고정 위치 (`fixed left-0 top-16 bottom-0 w-60`)
- 현재 페이지: `aria-current="page"` + `bg-primary/10 text-primary`
- 비활성: `text-slate-700` + `hover:bg-slate-100`
- z-index는 없음 (Topbar 뒤)

---

## React 전환 준비

각 컴포넌트는 HTML 주석으로 경계를 명시합니다.

```html
<!-- component: component-name -->
  <div>...</div>
<!-- /component -->
```

이 주석을 이용해 React 전환 시:
1. 각 주석 블록을 `.jsx` 파일로 추출
2. Props와 상태 관리 추가
3. Tailwind 클래스 유지 (CSS-in-JS 라이브러리 불필요)

**주요 컴포넌트:**
- `<Topbar />` — 모든 페이지에서 공통
- `<Sidebar />` — 모든 페이지에서 공통 (현재 페이지만 active)
- `<KPICard />` — Dashboard의 Today's Decision Summary
- `<CategoryCard />` — Dashboard의 Category Priority
- `<RecommendationItem />` — AI Recommendation
- `<StatCard />` — Financial의 요약 stat
- `<UploadCard />` — Upload의 드롭존

---

## 브라우저 호환성

- **Chrome/Edge** ✅ (권장)
- **Firefox** ✅
- **Safari** ✅
- **모바일 브라우저:** 반응형은 고려하되, 데스크톱(1920px+)에서 최적화됨

---

## 다음 단계

### Phase 3: React 구현
```bash
# 예상 구조
src/
├── components/
│   ├── layouts/
│   │   ├── Topbar.jsx
│   │   └── Sidebar.jsx
│   ├── dashboard/
│   │   ├── KPICard.jsx
│   │   ├── CategoryCard.jsx
│   │   └── RecommendationItem.jsx
│   ├── analysis/
│   │   └── FilterBar.jsx
│   ├── financial/
│   │   ├── StatCard.jsx
│   │   └── FinancialTable.jsx
│   └── upload/
│       └── UploadCard.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Analysis.jsx
│   ├── Financial.jsx
│   └── Upload.jsx
└── styles/
    └── globals.css
```

### Phase 4: Backend (FastAPI)
- `/api/dashboard` — KPI, Recommendation
- `/api/analysis` — Chart 데이터 (필터 적용)
- `/api/financial` — 카테고리별 마진/폐기원가
- `/api/upload` — 파일 업로드 처리

---

## 참고 사항

### 임의값(임의 Tailwind 클래스) 사용 금지
✅ 좋은 예:
```html
<div class="bg-primary text-white rounded-xl p-5">
```

❌ 나쁜 예 (사용 금지):
```html
<div class="bg-[#0067C5] text-white rounded-[16px] p-[20px]">
```

### 색상은 항상 토큰으로
`config.js`에서 정의된 `primary`, `accent`, `success`, `bg`만 사용하면  
추후 브랜드 컬러 변경 시 한 곳만 수정하면 됩니다.

### 애니메이션 최소화
- Hover: `transition-colors duration-150`만 허용
- 진입 애니메이션: 없음
- 스크롤 애니메이션: 없음

---

## 문의 & 수정

프로토타입 피드백은 `docs/prototype/` 폴더의 관련 파일을 수정하고 Sidebar 네비게이션이 정상 동작하는지 확인합니다.

**체크리스트:**
- [ ] 4개 HTML 파일이 `file://` 프로토콜에서 Tailwind CDN 로드됨
- [ ] Sidebar 메뉴 클릭 시 4개 페이지 간 이동 정상 동작
- [ ] 각 페이지에서 현재 메뉴 항목이 active 상태 표시됨
- [ ] 데스크톱 브라우저(1920px+)에서 좌우 여백이 최소화됨
- [ ] 모든 색상이 GS 브랜드 컬러(`#0067C5`, `#F58220`, `#6BBE45`)임

---

*Last Updated: 2026-07-08*  
*SmartFF Agent — AI가 발주를 대신하는 것이 아니라, 점주가 더 나은 발주 의사결정을 할 수 있도록 돕는다.*
