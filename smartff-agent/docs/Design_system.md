# SmartFF Dashboard Design System

> **SmartFF 대시보드 설계 가이드**
>
> 최종 대시보드: `prototype/dashboard_mvp_ko.html`
>
> 업데이트: 2026-07-09

---

## 설계 철학

SmartFF는 **AI 의사결정 지원 시스템(AI Decision Support System)**이다.

사용자(GS25 점주)는 5초 안에 **"오늘 무엇을 발주해야 하는가?"** 질문에 답하기 위해 대시보드를 연다.

따라서 모든 디자인 결정은 다음을 우선한다:
- 화려함보다 **명확함**
- 복잡함보다 **직관성**
- 설명보다 **행동**

### 참고 제품

디자인 영감: Stripe, Linear, Vercel, Microsoft Power BI, Tableau, Notion

---

## 페이지별 목적

SmartFF의 각 페이지는 다른 질문에 답하기 위해 설계됨.

| 페이지 | 핵심 질문 | 목적 |
|--------|----------|------|
| **Dashboard** | "오늘 무엇을 해야 하는가?" | 오늘의 AI 브리핑, 주요 KPI, 추천 액션 |
| **Analysis** | "왜 이런 일이 일어났는가?" | 판매 패턴, 시간대 분석, 주간 추이, 폐기 추이, 카테고리 비교 |
| **Financial** | "이것이 수익성에 어떤 영향을 미치는가?" | 마진 분석, 폐기 비용, 이익 기여도, 카테고리별 수익성 |
| **Upload** | "데이터를 어떻게 제공하는가?" | CSV/Excel 업로드, 업로드 이력, 데이터 검증, 업로드 상태 |

---

## 컬러 팔레트

### Brand Color

| 용도 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Primary | brand | #4C6FE0 | AI 브리핑 카드 배경, 사이드바 로고, 텍스트 강조 |

### Semantic Colors

| 상태 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Success | success | #15803D | 긍정 추천, 상승 추세 아이콘 |
| Danger | danger | #DC2626 | 위험 경고, 하락 추세 |

### Background & Surface

| 용도 | 색상명 | HEX |
|------|--------|-----|
| Page Background | bg-primary | #F8FAFC |
| Card Background | bg-card | #FFFFFF |
| Border | border-color | #E2E8F0 |

### Typography Colors

| 용도 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Primary Text | text-primary | #0F172A | 제목, 본문 |
| Secondary Text | text-secondary | #475569 | 라벨, 설명, 보조정보 |

---

## 타이포그래피

### Font Stack

```
Font: Manrope (Google Fonts)
Fallback: system-ui, sans-serif
```

### Text Scale

| 요소 | 크기 | 굵기 | 사용처 |
|------|------|------|--------|
| Section Title | text-lg | semibold (600) | "발주 추천", "카테고리 현황" |
| Card Title | text-base | semibold (600) | "기회: 도시락 발주 확대" |
| KPI Value | 32px | 700 | 매출, 마진율, 손실액 수치 |
| Label | text-xs | semibold (600) | "예상 매출", "폐기 손실" |
| Body | text-sm | 400 | 설명, 통계 문구 |

### 핵심 규칙
- **숫자가 가장 크게 보여야 한다** (KPI 카드: 32px)
- 라벨은 작고 보조적 (text-xs, text-secondary)
- 섹션 제목은 명확하고 간단한 한국어 (text-lg)

---

## 레이아웃 구조

### 뷰포트 구성

```
┌─────────────────────────────────────┐
│ Sidebar (w-64/256px)│ Main Content  │
│                     │               │
│ (고정)             │ Topbar (h-16) │
│                     ├───────────────┤
│                     │ Scrollable    │
│                     │ - AI Brief    │
│                     │ - KPI Cards   │
│                     │ - Recom + Cat │
└─────────────────────────────────────┘
```

### Sidebar

| 항목 | 값 |
|------|-----|
| 너비 | w-64 (256px) |
| 배경 | bg-card (#FFFFFF) |
| 보더 | border-right 1px border-color |
| 포함 요소 | Logo + Nav + User Profile |
| 위치 | 좌측 고정 |

### Topbar

| 항목 | 값 |
|------|-----|
| 높이 | h-16 (64px) |
| 배경 | bg-card (#FFFFFF) |
| 보더 | border-b 1px border-color |
| 내용 | 점포명 + 분석상태 + 아이콘 |
| 위치 | 상단 고정 |

### Main Content Area

| 항목 | 값 |
|------|-----|
| Max Width | max-w-7xl |
| Padding | p-8 (32px) |
| Gap | 24px (카드 간 여백) |

### 섹션 순서 (위에서 아래로)

1. **AI 브리핑** — 1개 카드 (bg-brand, 풀 너비)
   - "오늘의 AI 브리핑" + 주요 결정 1개 + 근거 3줄

2. **KPI 카드** — 4개 그리드 (grid-cols-4)
   - 예상 매출 | 평균 마진율 | 폐기 손실 | 우선 관리 상품

3. **추천 + 카테고리 현황** — 3단 그리드
   - 좌측 2/3: 발주 추천 (2개 카드: 기회 + 위험)
   - 우측 1/3: 카테고리 현황 (최고 마진 + 최다 폐기)

---

## 지양할 것 (Do Not)

다음 요소들은 SmartFF 디자인에서 절대 사용하지 말 것:

- **Glassmorphism** — 반투명 유리 효과
- **과한 그라디언트** — 단색 또는 미묘한 그라디언트만 사용
- **네온 컬러** — 밝고 자극적인 색상 금지
- **강한 그림자** — 미묘한 그림자만 사용 (0 1px 3px)
- **3개 초과의 강조색** — Primary, Success, Danger 외 추가 색상 금지
- **Dashboard의 밀집 테이블** — ERP 같은 정보 과다 표시
- **장문 설명** — 한 문장은 20자, 설명은 불릿 3줄 이내
- **시각적 혼란** — 아이콘이나 이모지로 장식하기 금지 (상태 전달용만)

### 핵심

Dashboard는 **ERP 소프트웨어처럼 보이면 안 됨.** 모든 정보는 의사결정을 지원해야 함.

---

## 컴포넌트 패턴

### Card (기본 카드)

```html
<div class="card p-6">
  <!-- Content -->
</div>
```

| 속성 | 값 |
|------|-----|
| background | bg-card (#FFFFFF) |
| border | 1px solid border-color |
| border-radius | 0.5rem (8px) |
| box-shadow | 0 1px 3px rgba(15, 23, 42, 0.05) |
| padding | 24px (p-6) |

### KPI Card

구조:
```
Label (text-xs, text-secondary, uppercase)
Value (32px, 700 weight, text-primary)
Trend (text-xs, success/danger, 아이콘 + %)
```

예:
```
예상 매출
₩850K
↑ 5%
```

### 추천 카드 (Recommendation Card)

구조:
```
좌측 아이콘 (색상별)
┌─ 제목 + 액션 배지
├─ 근거 (불릿 3줄)
└─ 예상 효과 (border-top)
```

스타일:
- 기회: border-l-4 border-success, bg-green-50 아이콘
- 위험: border-l-4 border-danger, bg-red-50 아이콘

### AI 브리핑 카드

| 속성 | 값 |
|------|-----|
| background | bg-brand (#4C6FE0) |
| text color | text-white |
| padding | p-8 |
| 제목 크기 | text-3xl, font-bold |

구조:
```
레이블: "오늘의 AI 브리핑" (opacity-90)
제목: "도시락 발주 확대 권장" (text-3xl bold)
근거: 3개 불릿 (text-sm)
```

---

## 차트 가이드라인

**Analysis** 및 **Financial** 페이지에서 사용할 차트 규칙.

### 스타일

- **배경**: 흰 카드 (bg-card)
- **그리드선**: 얇고 옅은 선 (#E2E8F0)
- **모서리**: 둥근 모서리 (8px)
- **3D 효과**: 절대 금지
- **과도한 색상**: 3개 이상의 색상 금지 (필요시 회색조 사용)

### 컬러 매핑

| 의미 | 색상 | HEX |
|------|------|-----|
| 주요 추세 | Blue | #4C6FE0 |
| 긍정 / 성공 | Green | #15803D |
| 부정 / 경고 | Red | #DC2626 |

### 원칙

- 차트는 **인사이트를 강조**해야 함 (장식이 아님)
- 각 차트는 **하나의 명확한 메시지** 전달
- 범례와 축 라벨은 간단하고 명확해야 함

---

## 카피 톤 가이드

### 원칙

1. **GS25 점주 눈높이**
   - ❌ 피하기: "Business Health", "Top Profit", "Opportunity"
   - ✅ 사용: "카테고리 현황", "최고 마진 카테고리", "기회"

2. **행동 중심**
   - 모든 카드는 **"무엇을 할 것인가?"** 답변
   - ❌ "매출이 증가했습니다"
   - ✅ "도시락 발주 확대 권장"

3. **간결함**
   - 한 문장은 20자 내외
   - 설명은 불릿 3줄 이내
   - 장문 금지

### 라벨 및 제목 예시

| 영역 | 한국어 라벨 |
|------|-----------|
| 상단 네비게이션 | 대시보드, 분석, 재무, 업로드 |
| AI 브리핑 | 오늘의 AI 브리핑 |
| KPI | 예상 매출, 평균 마진율, 폐기 손실, 우선 관리 상품 |
| 추천 섹션 | 발주 추천 |
| 추천 카드 | 기회 / 위험 |
| 카테고리 섹션 | 카테고리 현황 |
| 카테고리 항목 | 최고 마진 카테고리 / 최다 폐기 카테고리 |

---

## 아이콘 및 이모지

### 사용 아이콘 (Material Symbols Outlined)

| 용처 | 아이콘 |
|------|--------|
| AI 브리핑 | auto_awesome |
| 추천 성공 | trending_up |
| 추천 위험 | warning |
| 마진 | attach_money |
| 상승 추세 | arrow_upward |
| 네비게이션 | dashboard, analytics, account_balance, cloud_upload |

### 이모지 사용

현재 `dashboard_mvp_ko.html`에서 AI 브리핑 근거 아이콘으로 이모지 사용 (📈, ✅, 💰). 필요시 Material Symbols로 전환 가능하나 현재 유지.

---

## 간격 및 구조

| 요소 | 값 |
|------|-----|
| 섹션 간 여백 | mb-8 (32px) |
| 카드 간 여백 | gap-6 (24px) |
| 사이드바 네비 간격 | space-y-2 |
| 카드 내 padding | p-6 (24px) |
| 작은 요소 padding | p-3 (12px) |

---

## 반응형 (Responsive)

현재 MVP는 **데스크톱 우선** 설계.

| 화면 | 적용 |
|------|------|
| Desktop (1440px+) | 전체 3단 그리드 (추천 2/3 + 카테고리 1/3) |
| Tablet (1024px) | 조정 필요 (미정) |
| Mobile (640px) | 조정 필요 (미정) |

---

## 다음 페이지 적용 (분석, 재무)

이후 **분석(Analysis)** 및 **재무(Financial)** 페이지를 만들 때:

1. 이 문서의 **컬러**, **타이포**, **컴포넌트** 규칙을 그대로 적용
2. 같은 사이드바, 상단바, 카드 스타일 사용
3. 한국어 라벨 톤 유지 (GS25 점주 중심)
4. "무엇을 할 것인가?" 중심의 카피 유지

---

## React 컴포넌트 전략

현재 프로토타입은 **HTML + Tailwind CSS**로 작성되었으나, 실제 프로덕션은 **React**로 구현됨.

### 컴포넌트 계층

**Navigation (네비게이션)**
- `<Sidebar/>`
- `<Topbar/>`

**Layout (레이아웃)**
- `<PageHeader/>`
- `<SectionHeader/>`

**Cards (카드 컴포넌트)**
- `<AIBriefCard/>` — 오늘의 AI 브리핑
- `<KPICard/>` — KPI 표시
- `<RecommendationCard/>` — 발주 추천
- `<CategoryCard/>` — 카테고리 현황
- `<ChartCard/>` — 차트 컨테이너
- `<InsightCard/>` — 인사이트
- `<UploadCard/>` — 업로드 영역

**Data & Controls (데이터, 컨트롤)**
- `<DataTable/>`
- `<Badge/>`
- `<StatusChip/>`
- `<Button/>`
- `<SearchInput/>`
- `<Filter/>`
- `<UploadZone/>`

### 설계 원칙

모든 컴포넌트는:
1. **재사용 가능** — 서로 다른 페이지에서 동일 외형 유지
2. **일관된 스타일** — 이 문서의 색상, 타이포, 간격 규칙 준수
3. **Props 기반 커스터마이징** — CSS 클래스 직접 수정 금지

---

## 파일 참고

- **HTML Prototype**: `prototype/dashboard_mvp_ko.html`
- **Tailwind Config**: script#tailwind-config 내 커스텀 색상 정의
- **CSS Style**: `<style>` 태그 내 `.card`, `.kpi-value`, `.sidebar`, `.nav-active` 클래스
- **React Components**: 향후 `/src/components` 디렉토리에 위 컴포넌트들 구현 예정

---

*SmartFF Design System v1.0 — Finalized 2026-07-09*
