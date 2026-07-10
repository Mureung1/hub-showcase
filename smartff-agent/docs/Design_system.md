# SmartFF Dashboard Design System

> **SmartFF 대시보드 설계 가이드**
>
> 최종 대시보드: Claude Design 프로젝트 `SmartFF Dashboard.dc.html`
> ([프로젝트 링크](https://claude.ai/design/p/0e087b10-9346-44e8-9c27-d2a3d22be140))
>
> 업데이트: 2026-07-10

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

### Primary Color (AI 제안)

| 구분 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Base | primary-600 | #2563EB | AI 제안 배지, 버튼, 하이라이트 텍스트, 차트 라인 |
| Strong | primary-700 | #1D4ED8 | 호버, 강조 텍스트, 활성 상태 |
| Tint | primary-50 | #EFF6FF | AI 브리핑 카드 배경, KPI 카드 강조 배경 |

### Danger Color (위험 신호)

| 구분 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Base | danger-600 | #DC2626 | 위험 신호 배지, 경고 아이콘 |
| Tint | danger-50 | #FEF2F2 | 위험 신호 카드 배경 |
| Border | danger-300 | #FECACA | 위험 신호 카드 보더 |

### Success Color

| 구분 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Base | success-700 | #15803D | 긍정 추천, 상승 추세, 성과 강조 |

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
| Tertiary Text | text-tertiary | #94A3B8 | 보조 텍스트, 하단 주석 |

### Navigation (Icon Rail)

| 구분 | 색상명 | HEX | 사용처 |
|------|--------|-----|--------|
| Background | nav-bg | #1E293B | 사이드바 아이콘 레일 배경 |
| Icon Active | nav-icon-active | #60A5FA | 활성 네비 아이콘 색상 |
| Icon Inactive | nav-icon-inactive | #94A3B8 | 비활성 네비 아이콘 색상 |
| Chart Bar Highlight | chart-bar-highlight | #334155 | 차트 바 최고값 강조 |

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
│Icon│ Main Content                   │
│Rail│                                │
│76px│ Topbar (h-16)                  │
│    ├────────────────────────────────┤
│    │ Scrollable                     │
│    │ - AI Brief + Risk Alert (2-col)│
│    │ - KPI Cards (3-col)            │
│    │ - Chart + Margin Bars (2-col)  │
│    │                                │
└─────────────────────────────────────┘
```

### Icon Rail (Sidebar)

| 항목 | 값 |
|------|-----|
| 너비 | 76px (고정) |
| 배경 | nav-bg (#1E293B) 다크 네이비 |
| 포함 요소 | 로고 + 4개 네비 아이콘 + 프로필 |
| 위치 | 좌측 고정 |
| 특징 | 세로 중앙 정렬, 각 네비 항목은 아이콘 + 라벨(활성 시만 노출) |

**아이콘 사양:**
- 대시보드(활성): 파란색 배경 모듈 아이콘 + "대시보드" 라벨
- 분석/재무/업로드(비활성): 회색 아이콘만 표시, 라벨 없음

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

1. **헤더** — 점포명 + 분석 상태 + 오늘 날짜 배지
   - 점포명: "GS25 강남역점", 분석 상태: 초록 점 + "누적 데이터 분석 완료"
   - 오늘 날짜: 파란 배지 + "2026년 7월 9일 (목)"

2. **AI 제안 + 위험 신호** — 2단 그리드 (grid-cols-2)
   - 좌측: AI 제안 카드 (틴트 파란 배경 #EFF6FF)
   - 우측: 위험 신호 카드 (틴트 빨강 배경 #FEF2F2)

3. **KPI 카드** — 3개 그리드 (grid-cols-3)
   - 판매 추세 (56px, 파란색 강조) | 폐기율 (32px) | 평균 마진율 (38px)
   - 첫 번째 카드만 틴트 배경으로 강조

4. **차트 + 카테고리 마진율** — 2단 비대칭 그리드 (grid-cols-[1.25fr_1fr])
   - 좌측 2/3: SVG 라인 차트 (판매 추세, 4주 데이터, 그라디언트 언더레이)
   - 우측 1/3: 카테고리별 마진율 progress bar 리스트

5. **푸터** — 데이터 기준일
   - 오른쪽 정렬, 회색 작은 텍스트 "데이터 기준일 · 판매·발주·폐기 2026.07.08"

---

## 지양할 것 (Do Not)

다음 요소들은 SmartFF 디자인에서 절대 사용하지 말 것:

- **Glassmorphism** — 반투명 유리 효과
- **과한 그라디언트** — 단색 또는 미묘한 그라디언트만 사용
- **네온 컬러** — 밝고 자극적인 색상 금지
- **강한 그림자** — 미묘한 그림자만 사용 (0 1px 3px)
- **3개 초과의 강조색** — Primary, Danger, Success 외 추가 색상 금지
- **Dashboard의 밀집 테이블** — ERP 같은 정보 과다 표시
- **장문 설명** — 한 문장은 20자, 설명은 불릿 3줄 이내
- **장식용 아이콘/이모지** — 금지됨 (✓/✕ 상태 기호 및 배지는 사용 가능)

### 핵심

Dashboard는 **ERP 소프트웨어처럼 보이면 안 됨.** 모든 정보는 의사결정을 지원해야 함.

**현재 버전에서 검증:**
- ✓ 이모지 미사용: ✓/✕ 기호와 배지로만 상태 표현
- ✓ 배지 시스템 통일: 3가지 pill 배지(파랑/빨강/남색)만 사용
- ✓ 색상 제한: Primary(#2563EB)/Danger(#DC2626)/Success(#15803D) 3색만 사용
- ✓ 카드 여백 충분: 엔터프라이즈 SaaS 톤 유지

---

## 컴포넌트 패턴

### Card (기본 카드)

| 속성 | 값 |
|------|-----|
| background | bg-card (#FFFFFF) |
| border | 1px solid #E2E8F0 |
| border-radius | 16px (둥근 코너) |
| box-shadow | 0 1px 3px rgba(15, 23, 42, 0.05) |
| padding | 22~26px |

### Badge (배지) — 3-Variant System

모든 배지는 **pill 형태**(rounded-full)로 통일, 색상만 의미별로 구분:

| 타입 | 배경 | 텍스트 | 사용처 |
|------|------|--------|--------|
| Proposal | #1D4ED8 | #FFFFFF | `AI 제안` — 정보성 제안 |
| Alert | #DC2626 | #FFFFFF | `위험 신호` — 경고 알림 |
| Recommendation | #2563EB (남색 pill) | #FFFFFF | `★ AI 추천` — 특정 항목 추천 |

### AI 제안 카드 (AIBriefCard)

| 속성 | 값 |
|------|-----|
| background | primary-50 (#EFF6FF) |
| border | 1px solid #DBEAFE |
| border-radius | 16px |
| padding | 22px 26px |
| 배지 | `AI 제안` (Proposal 배지) + "오늘의 AI 브리핑" 타이틀 |

**구조:**
```
┌─ [AI 제안] 오늘의 AI 브리핑
├─ 제목: "도시락 발주 확대 검토" (29px, 굵음, #2563EB 강조)
├─ 근거 리스트 (✓ 아이콘 + 3개 항목)
├─ 설명: "최종 발주 결정은 점주가 직접 검토해 주세요" (작은 회색 텍스트)
└─ CTA: "확인 완료로 표시" (파란 아웃라인 버튼)
```

### 위험 신호 카드 (RiskAlertCard)

| 속성 | 값 |
|------|-----|
| background | danger-50 (#FEF2F2) |
| border | 1px solid #FECACA |
| border-radius | 16px |
| padding | 22px 26px |
| 배지 | `위험 신호` (Alert 배지) |

**구조:**
```
┌─ [위험 신호]
├─ 제목: "삼각김밥 발주 축소 검토" (26px, 굵음)
├─ 위험 리스트 (✕ 아이콘 + 3개 항목)
└─ CTA: "삼각김밥 상세 보기 →" (빨강 아웃라인 버튼)
```

### KPI Card (3-Variant)

**판매 추세 (첫 번째 카드, 강조)**
| 속성 | 값 |
|------|-----|
| background | primary-50 (#EFF6FF) |
| border | 1px solid #DBEAFE |
| 수치 크기 | 56px, #2563EB |
| 라벨 | "판매 추세" (13px, 파란색) |

**폐기율 및 평균 마진율**
| 속성 | 값 |
|------|-----|
| background | #FFFFFF |
| border | 1px solid #E2E8F0 |
| 수치 크기 | 폐기율: 32px, 마진율: 38px |
| 라벨 | 회색 작은 텍스트 |

### 카테고리 마진율 바 (MarginBarComponent)

**구조:**
```
카테고리명 + [배지(선택)] | 마진율 %
─────────────────────────────────
▓▓▓▓▓▓▓▓▓▓ 40% (1위 강조: 진한 네이비 #334155)
▓▓▓▓▓▓▓▓░░ 38% (AI 추천 배지 부착)
▓▓▓▓▓░░░░░ 22%
▓▓▓▓░░░░░░ 15%
```

**규칙:**
- 1위 항목(40%)만 진한 네이비 바(#334155)로 강조
- AI 추천 항목엔 `★ AI 추천` 배지(남색 pill) 이름 옆에 부착
- 기타 항목은 라이트 블루(#93C5FD) bar
- 각 항목 하단: "전월 대비 ±%p" (성공/위험 색상별)

---

## 차트 가이드라인

### Dashboard의 라인 차트 (판매 추세)

**사양:**
- **유형**: SVG 라인 + 영역 차트 (Recharts 또는 동등 라이브러리)
- **배경**: 흰 카드 (bg-card #FFFFFF)
- **그리드선**: 얇고 옅은 선 (#F1F5F9)
- **라인색**: 진한 파랑 (#2563EB), 굵기 3.5px
- **영역**: 파랑 그라디언트 언더레이 (시작 #2563EB 16% → 끝 #2563EB 0%)
- **포인트**: 원형 마커(r=6), 호버 시 r=7로 확대 + 툴팁 표시
- **최고값**: 원 추가(r=11, opacity=0.18) 강조 표시

**구조:**
- X축: 주차 라벨 (6월 3주차, 6월 4주차, 6/29~7/5, 7월 1주차)
- Y축: 숨김 (그리드선만 표시)
- 하단: 포인트별 매출액 표시, "최고 판매 주차 · 7월 1주차" 요약

### Analysis/Financial 페이지의 차트

**공통 규칙:**
- **배경**: 흰 카드 (bg-card)
- **그리드선**: 얇고 옅은 선 (#E2E8F0)
- **모서리**: 둥근 모서리 (16px)
- **3D 효과**: 절대 금지
- **과도한 색상**: 3개 이상 금지 (필요시 회색조 사용)

### 컬러 매핑

| 의미 | 색상 | HEX |
|------|------|-----|
| 주요 추세 | Blue | #2563EB |
| 긍정 / 성공 | Green | #15803D |
| 부정 / 경고 | Red | #DC2626 |

### 원칙

- 차트는 **인사이트를 강조**해야 함 (장식이 아님)
- 각 차트는 **하나의 명확한 메시지** 전달
- 범례와 축 라벨은 간단하고 명확해야 함
- 호버 인터랙션 제공 (데이터 포인트 상세 정보)

---

## 카피 톤 가이드

### 원칙

1. **GS25 점주 눈높이**
   - ❌ 피하기: "Business Health", "Top Profit", "Opportunity"
   - ✅ 사용: "카테고리 현황", "최고 마진 카테고리", "기회"

2. **행동 중심**
   - 모든 카드는 **"무엇을 할 것인가?"** 답변
   - ❌ "매출이 증가했습니다"
   - ✅ "도시락 발주 확대 검토"

3. **간결함**
   - 한 문장은 20자 내외
   - 설명은 불릿 3줄 이내
   - 장문 금지

### 날짜/기준일 표기 규칙

| 위치 | 용도 | 형식 | 예시 |
|------|------|------|------|
| 헤더 배지 | 오늘 날짜 | 파란 배지, "2026년 7월 9일 (요일)" | 2026년 7월 9일 (목) |
| 푸터 | 데이터 기준일 | 회색 작은 텍스트, "데이터 기준일 · 판매·발주·폐기 YYYY.MM.DD" | 데이터 기준일 · 판매·발주·폐기 2026.07.08 |

**규칙:**
- 헤더 배지: 사용자가 현재 보는 날짜(어제 또는 오늘)
- 푸터 텍스트: 데이터가 마지막으로 업로드/갱신된 날짜 (동기화 표시)
- 두 날짜가 다를 수 있음 — 명확히 역할 분리

### 라벨 및 제목 예시

| 영역 | 현재 버전 한국어 라벨 |
|------|-----------|
| 상단 네비게이션 | 대시보드, 분석, 재무, 업로드 |
| 분석 상태 | "누적 데이터 분석 완료" (초록 상태 점) |
| AI 제안 | 오늘의 AI 브리핑 |
| 위험 신호 | (배지 이름만 사용) |
| KPI | 판매 추세, 폐기율, 평균 마진율 |
| KPI 보조설명 | "최근 4주 기준 · 상승세" / "최근 4주 기준 · 안정적" / "최근 4주 기준 · 고수익" |
| 차트 | "최근 4주 판매 추세" |
| 카테고리 섹션 | 카테고리별 마진율 |
| 카테고리 보조설명 | (최근 4주 기준) |
| 근거 기호 | ✓ (확인, 긍정) / ✕ (위험, 부정) |

---

## 아이콘 및 기호

### 상태 표시 기호

| 기호 | 용도 | 사용처 |
|------|------|--------|
| ✓ | 확인, 긍정 | AI 제안 카드의 근거 리스트 |
| ✕ | 위험, 부정 | 위험 신호 카드의 위험 항목 리스트 |
| ★ | 추천 강조 | AI 추천 배지 (★ AI 추천) |

### 네비게이션 아이콘 (Material Symbols Outlined)

| 네비게이션 항목 | 아이콘 |
|--------|--------|
| 대시보드 | 4개 모듈 그리드 모양 |
| 분석 | 라인 차트 (상승 추이) |
| 재무 | 시계/계산 모양 |
| 업로드 | 업로드 화살표 |

### 이모지 사용 금지

현재 프로토타입(`SmartFF Dashboard.dc.html`)에서 이모지 미사용. 상태는 배지와 ✓/✕ 기호만으로 표현.

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

현재 프로토타입은 **HTML + Tailwind CSS** (`SmartFF Dashboard.dc.html`)로 작성되었으나, 실제 프로덕션은 **React + TypeScript**로 구현됨.

### 우선순위 컴포넌트 (Dashboard 페이지용)

**Navigation & Layout (기존)**
- `<IconRailSidebar/>` — 새로운 76px 아이콘 레일 (기존 `Sidebar` 대체)
- `<Topbar/>` — 점포명 + 분석 상태 + 날짜 배지

**Dashboard 컴포넌트 (신규)**
- `<AIBriefCard/>` — 오늘의 AI 제안 카드 (틴트 파란 배경)
- `<RiskAlertCard/>` — 위험 신호 카드 (틴트 빨강 배경)
- `<KPICard/>` — 3가지 KPI 표시 (판매 추세/폐기율/마진율)
- `<Badge/>` — 3-variant 배지 (Proposal/Alert/Recommendation)
- `<SalesTrendChart/>` — SVG 라인 차트 (판매 추세)
- `<MarginBarList/>` — 카테고리별 마진율 progress bar 리스트
- `<DashboardHeader/>` — 점포명 + 상태 + 날짜

**공통 컴포넌트 (Analysis/Financial과 공유)**
- `<Card/>` — 기본 카드 래퍼 (background, border, border-radius, padding)
- `<Button/>` — CTA 버튼 (파란/빨강 아웃라인, pill 스타일)
- `<SectionHeader/>` — 섹션 제목
- `<ChartContainer/>` — 차트용 카드 래퍼

### 설계 원칙

모든 컴포넌트는:
1. **재사용 가능** — 서로 다른 페이지에서 동일 외형 유지
2. **일관된 스타일** — 이 문서의 색상, 타이포, 간격, 배지 규칙 준수
3. **Props 기반** — 색상/크기/라벨 커스터마이징 가능
4. **CSS 클래스 금지** — Tailwind 클래스 또는 inlined CSS only

### 컴포넌트 기본값

**색상 토큰** (web/src/constants/colors.ts에서 정의)
- Primary: `#2563EB` (base) / `#1D4ED8` (strong) / `#EFF6FF` (tint)
- Danger: `#DC2626` (base) / `#FEF2F2` (tint) / `#FECACA` (border)
- Success: `#15803D`
- Navigation: `#1E293B` (sidebar bg) / `#60A5FA` (active icon) / `#94A3B8` (inactive)

**타이포그래피** (web/src/constants/typography.ts에서 정의)
- KPI 값: 56px/32px/38px, weight 800, line-height 1
- 카드 제목: 22px~29px, weight 700/800
- 라벨: 11px~13px, weight 700, uppercase/semibold

---

## 파일 참고

**Design Reference (최신)**
- **Claude Design Project**: [SmartFF Dashboard.dc.html](https://claude.ai/design/p/0e087b10-9346-44e8-9c27-d2a3d22be140?file=SmartFF+Dashboard.dc.html)
  - 최신 컬러, 레이아웃, 컴포넌트 사양 (이 문서의 근거)
  - 생존성: 피드백 루프 진행 중, 계속 갱신됨

**React Frontend**
- **Tailwind Config**: `web/tailwind.config.js` (색상 토큰 정의)
- **Constants**: `web/src/constants/` (colors.ts, typography.ts, layout.ts)
- **Components**: `web/src/components/`
  - common/: Sidebar.tsx, Topbar.tsx (기존)
  - 신규: AIBriefCard, RiskAlertCard, KPICard, Badge, MarginBarList, SalesTrendChart, DashboardHeader
- **Pages**: `web/src/pages/Dashboard.tsx` (신규)
- **Layouts**: `web/src/layouts/MainLayout.tsx` (기존, 사이드바 업데이트 필요)

**Project Documentation**
- **PROJECT_PLAN.md**: 전체 프로젝트 로드맵 (이 문서보다 상위 우선순위)
- **CLAUDE.md**: 프로젝트 룰 및 철학 (이 문서보다 상위 우선순위)

---

*SmartFF Design System v2.0 — Updated 2026-07-10*

**변경 이력:**
- v1.0 (2026-07-09): 초기 프로토타입 기반 작성
- v2.0 (2026-07-10): Claude Design 최신 버전 반영, 배지 시스템 통일, 컴포넌트 패턴 세분화
