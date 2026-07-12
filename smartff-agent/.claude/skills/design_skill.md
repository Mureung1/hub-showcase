---
name: design_skill
description: SmartFF Design System v3.0 규칙 검사 및 Dashboard/Analysis/Financial/Upload 4개 페이지 설계 가이드 제공
type: skill
---

# design_skill

SmartFF의 설계 일관성을 유지하기 위한 최신 Design_system.md(v3.0) 규칙 검사 및 가이드 skill.

**최신 업데이트 (2026-07-10):** Claude Design 프로젝트의 Dashboard 설계(배지 통일, 컬러 세분화, 아이콘 레일, 배지 시스템)에 이어, Upload/Financial/Analysis 3개 페이지의 섹션 순서·컴포넌트 패턴·차트 사양을 반영했습니다.

## 주요 기능

### 1. 설계 규칙 검사
파일(HTML, React, CSS)이 Design_system.md의 규칙을 따르고 있는지 검사합니다.

**확인 항목 (v3.0 기준):**
- **컬러 사용**: 
  - Primary: #2563EB(base) / #1D4ED8(strong) / #EFF6FF(tint)
  - Danger: #DC2626(base) / #FEF2F2(tint) / #FECACA(border)
  - Success: #15803D
  - Navigation: #1E293B(sidebar) / #60A5FA(active icon) / #94A3B8(inactive)
- **타이포**: Manrope 폰트, KPI 56px/32px/38px, 제목 22px~29px, 라벨 11px~13px
- **레이아웃**: Icon Rail 76px, Topbar 64px, Main content padding 32px(p-8), Card padding 22~26px, 카드 gap 24px
- **컴포넌트**: Card, KPICard, AIBriefCard, RiskAlertCard, Badge(3-variant), MarginBarList
- **배지 시스템**: Proposal(파랑 #1D4ED8) / Alert(빨강 #DC2626) / Recommendation(남색 pill)
- **차트**: SVG 라인 차트(그라디언트 언더레이, 포인트 호버)
- **카피**: GS25 점주 눈높이, 20자 이내 문장, 불릿 3줄 이내, 행동 중심, 이모지 미사용
- **날짜/기준일**: 헤더 배지(오늘 날짜) + 푸터 텍스트(데이터 기준일) 분리

### 2. 페이지별 체크리스트

**Dashboard 페이지 (최신 v2.0):**
- [ ] 헤더: 점포명 + 분석 상태(초록 점) + 오늘 날짜 배지(파란)
- [ ] AI 제안 + 위험 신호 카드 (2단 그리드)
  - [ ] AI 제안: 틴트 파란 배경 #EFF6FF, `AI 제안` 배지, ✓ 리스트, "확인 완료로 표시" 버튼
  - [ ] 위험 신호: 틴트 빨강 배경 #FEF2F2, `위험 신호` 배지, ✕ 리스트, "상세 보기 →" 버튼
- [ ] KPI 카드 3개 (grid-cols-3)
  - [ ] 판매 추세: 56px, 틴트 파란 배경 강조
  - [ ] 폐기율: 32px, 흰 배경
  - [ ] 평균 마진율: 38px, 흰 배경
- [ ] SVG 라인 차트 (판매 추세, 4주 데이터)
- [ ] 카테고리별 마진율 progress bar 리스트
  - [ ] 1위 강조: 진한 네이비 #334155 bar
  - [ ] AI 추천 항목: `★ AI 추천` 배지
  - [ ] 각 항목 하단: "전월 대비 ±%p"
- [ ] 푸터: 데이터 기준일 (오른쪽 정렬, 회색)
- [ ] 아이콘 레일 사이드바 (76px, #1E293B 배경)

**Analysis 페이지 (v3.0):**
- [ ] 헤더: "분석" 제목 + 상태 점 + "GS25 강남역점 · 판매 패턴 분석" + AI 분석 가능 여부 배지 + 오늘 날짜 배지
- [ ] 카테고리 선택 탭 (pill 버튼, 도시락/김밥/샌드위치/삼각김밥), 활성 탭 파란 배경, 항목별 `(추천)`/`(주의)` 배지, 탭 전환 시 이하 전체 섹션 데이터 갱신(클라이언트 상태)
- [ ] 인사이트 스트립: 카테고리 상태에 따라 opportunity(틴트 파랑, `AI 인사이트`, ✓)/neutral(연회색, `AI 인사이트`, ·)/risk(틴트 빨강, `위험 신호`, ✕) 3-variant 전환
- [ ] 요일별 판매 패턴 + 시간대별 판매 패턴 (2단 그리드, 막대차트), 최고값 진한 파랑(#2563EB)/2위 연한 파랑(#93C5FD)/나머지 옅은 회색, 하단 자동 생성 요약 문장
- [ ] 판매 추세(12주) + 폐기 추세 (2단 그리드, SVG 라인+영역 차트), "최근 4주 {추세}" 배지(상승=초록/하락=빨강/보합=회색), 하단 요약 문장
- [ ] 요약 문장은 하드코딩 금지 — 원본 수치에서 계산되는 순수 함수(`weekdaySummary()`, `timeSummary()`, `trendSummary()`)로 분리
- [ ] 푸터: 데이터 기준일

**Financial 페이지 (v3.0):**
- [ ] 헤더: "재무" 제목 + "GS25 강남역점 · 관리회계 기준 수익성 분석" + AI 분석 가능 여부 배지 + 오늘 날짜 배지
- [ ] AI 재무 인사이트 카드: 틴트 파랑 배경, `AI 제안` 배지, 카테고리 강조 문장, **Dashboard 추천과의 연결 설명 필수**, 근거 3개(✓), 데이터 기준 안내문
- [ ] KPI 4-그리드: 총매출 / 마진액 / 폐기손실(빨강 강조) / 추정 순이익(틴트 파란 카드)
- [ ] 순이익 기여도: 카테고리별 순위 배지(원형 숫자①~) + 진행률 바, 1위만 primary 색 + "↑ 전체 순이익 1위" 라벨, 2위 이하 회색조
- [ ] 마진 vs 폐기 비교: 카테고리별 그룹 막대차트(마진액=파랑, 폐기손실=연빨강/빨강), 범례 상단, 하단 ✓/✕ 인사이트 문장 2줄
- [ ] 폐기손실액 랭킹 + 폐기율(금액 기준) (2단 그리드): 좌측 순위 리스트(1~4위 + 금액 + "전체 폐기의 N%"), 우측 카테고리별 폐기율 progress bar(위험 카테고리 빨간 바)
- [ ] 푸터: 데이터 기준일

**Upload 페이지 (v3.0):**
- [ ] 헤더: "업로드" 제목 + 상태 점 + "GS25 강남역점 · 데이터 관리" + AI 분석 가능 여부 배지 + 오늘 날짜 배지
- [ ] AI 분석 가능 여부 카드: 틴트 파랑, 진행률 바(%) + "N개 데이터 중 M개 준비 완료" + 6개 데이터 종류별 ✓/⚠ 상태 라벨(판매/발주/폐기/재고/시간대/요일별)
- [ ] 데이터 업로드 3열 그리드 카드 6개(판매/발주/폐기/재고/시간대별 매출/요일별 매출): 아이콘 배지 + 데이터명 + 사용 페이지 안내 + 점선 테두리 "파일 선택" 버튼 + 최근 업로드 일자, 미업로드/문제 카드는 경고 톤(#FDE68A/#FFFBEB/#B45309)
- [ ] 데이터 검증 결과: 카드형 리스트, 데이터 종류별 ✓/⚠ + "N개 상품 정상 인식" 또는 "매칭 실패"
- [ ] 최근 업로드 이력: 4열 테이블(날짜/종류/카테고리/상태), 상태는 "✓ 완료" 텍스트
- [ ] 푸터: 데이터 기준일 (Dashboard와 동일 규칙)
- [ ] 차트 공통 규칙(Analysis/Financial): 흰 배경, 얇은 그리드선, 3D 금지, 색상 3개 이내

### 3. React 컴포넌트 매핑 (v2.0)

HTML → React 컴포넌트 변환 시 참고:

**Core Components (Dashboard용)**
| 역할 | React 컴포넌트 | 특징 |
|------|---|---|
| 기본 카드 | `<Card/>` | 흰 배경, 보더 #E2E8F0, 16px 라운드 |
| 헤더 | `<DashboardHeader/>` | 점포명 + 상태 + 날짜 배지 |
| AI 제안 | `<AIBriefCard/>` | 틴트 파란 배경 #EFF6FF, ✓ 리스트 |
| 위험 신호 | `<RiskAlertCard/>` | 틴트 빨강 배경 #FEF2F2, ✕ 리스트 |
| KPI 카드 | `<KPICard/>` | 3-variant(56px/32px/38px), 첫 카드만 틴트 |
| 배지 | `<Badge/>` | 3-variant: Proposal(파랑)/Alert(빨강)/Recommendation(남색) pill |
| 라인 차트 | `<SalesTrendChart/>` | SVG 또는 Recharts, 그라디언트 언더레이 |
| 마진율 바 | `<MarginBarList/>` | progress bar 리스트, 1위 강조, AI 추천 배지 |
| CTA 버튼 | `<Button/>` | 파란/빨강 아웃라인, pill 스타일 |

**Financial Components**
| 역할 | React 컴포넌트 | 특징 |
|------|---|---|
| AI 재무 인사이트 | `<FinancialInsightCard/>` | 틴트 파랑, Dashboard 추천과 연결 문장 필수 |
| 순이익 기여도 | `<ProfitContributionBar/>` | 원형 순위 배지 + 진행률 바, 1위만 primary 색 |
| 마진 vs 폐기 차트 | `<MarginVsWasteChart/>` | 카테고리별 그룹 막대(마진=파랑/폐기=빨강) |
| 폐기 랭킹 | `<WasteRankingList/>` | 순위 리스트 + 금액 + 비중 % |
| 폐기율 바 | `<WasteRateBar/>` | 폐기금액÷매출액 progress bar, 위험 카테고리 빨강 |

**Analysis Components**
| 역할 | React 컴포넌트 | 특징 |
|------|---|---|
| 카테고리 탭 | `<CategoryTabs/>` | pill 탭, 활성 파란 배경, `(추천)`/`(주의)` 배지 |
| 인사이트 스트립 | `<InsightStrip/>` | opportunity/neutral/risk 3-variant 배너 |
| 패턴 막대차트 | `<PatternBarChart/>` | 요일별/시간대별 공용, props로 축 전환 |
| 추세 라인차트 | `<TrendLineChart/>` | 12주 SVG 라인+영역, SalesTrendChart와 사양 공유 |

**Upload Components**
| 역할 | React 컴포넌트 | 특징 |
|------|---|---|
| AI 분석 가능 여부 | `<DataReadinessCard/>` | 진행률 바 + 6종 데이터 ✓/⚠ 상태 |
| 업로드 카드 | `<UploadCard/>` | 데이터 종류별 업로드, 경고 톤(#FDE68A) 지원 |
| 검증 결과 리스트 | `<DataValidationList/>` | ✓/⚠ 상태 + 매칭 결과 문구 |
| 업로드 이력 테이블 | `<UploadHistoryTable/>` | 4열(날짜/종류/카테고리/상태) |

**Reusable Components (다른 페이지 공유)**
| 역할 | React 컴포넌트 |
|------|---|
| 네비게이션 | `<IconRailSidebar/>` (기존 Sidebar 대체) |
| 상단바 | `<Topbar/>` |
| 섹션 제목 | `<SectionHeader/>` |
| 차트 래퍼 | `<ChartCard/>` / `<ChartContainer/>` |
| 데이터 테이블 | `<DataTable/>` |
| 기본 카드 | `<Card/>` |
| CTA 버튼 | `<Button/>` |

### 4. 지양할 것 (Do Not) — v2.0 검증됨

검토 시 다음을 찾으면 지적:
- ❌ Glassmorphism 효과
- ❌ 과한 그라디언트
- ❌ 네온 컬러 사용 (정해진 3색 외)
- ❌ 강한 그림자 (0 1px 3px 이상)
- ❌ 3개 초과 강조색 (Primary/Danger/Success만 허용)
- ❌ Dashboard의 밀집 테이블/ERP 스타일
- ❌ 20자 초과 문장
- ❌ 불릿 4줄 이상
- ❌ **장식용 이모지 (v2.0: 완전 금지)** — 상태는 ✓/✕ 기호 + 배지로만 표현
- ❌ 잘못된 컬러: `#4C6FE0` (구버전) → 사용 금지, `#2563EB` 사용할 것
- ❌ 잘못된 사이드바: w-64 텍스트 네비 → 76px 아이콘 레일로 교체
- ❌ 잘못된 KPI: 4개 그리드 → 3개 그리드로 변경

## 사용 방법

### 1. 설계 규칙 확인
```
/design_skill 설계 규칙
```
→ Design_system.md의 핵심 규칙 요약 제시

### 2. 파일 검사
```
/design_skill 검사 <파일경로>
```
→ HTML/React/CSS 파일이 규칙을 따르는지 검사

### 3. 페이지 체크리스트
```
/design_skill 체크 <dashboard|analysis|financial|upload>
```
→ 페이지별 필수 요소 체크리스트 제시

### 4. 컴포넌트 가이드
```
/design_skill 컴포넌트
```
→ React 컴포넌트 구현 시 참고 정보

### 5. 카피 톤 확인
```
/design_skill 카피
```
→ GS25 점주 눈높이의 한국어 카피 규칙 제시

## 참고 파일

- **설계 문서**: `docs/Design_system.md` (v3.0, 2026-07-10)
- **Claude Design Project** (`0e087b10-9346-44e8-9c27-d2a3d22be140`, 최신 실시간 참조):
  - [SmartFF Dashboard.dc.html](https://claude.ai/design/p/0e087b10-9346-44e8-9c27-d2a3d22be140?file=SmartFF+Dashboard.dc.html)
  - [SmartFF Upload.dc.html](https://claude.ai/design/p/0e087b10-9346-44e8-9c27-d2a3d22be140?file=SmartFF+Upload.dc.html)
  - [SmartFF Financial.dc.html](https://claude.ai/design/p/0e087b10-9346-44e8-9c27-d2a3d22be140?file=SmartFF+Financial.dc.html)
  - [SmartFF Analysis.dc.html](https://claude.ai/design/p/0e087b10-9346-44e8-9c27-d2a3d22be140?file=SmartFF+Analysis.dc.html)
- **CLAUDE.md**: 프로젝트 전체 규칙 (우선순위 최상위)
- **PROJECT_PLAN.md**: 전체 로드맵 (우선순위 Design_system.md 위)

## 버전 변경

**v2.0 → v3.0 주요 변경:**
- Upload/Financial/Analysis 3개 페이지의 섹션 순서·컴포넌트 패턴·차트 사양 신규 반영
- Analysis: 카테고리 탭 + 인사이트 스트립(3-variant) + 요일/시간대 패턴 막대 + 12주 추세 차트, 요약 문장은 순수 함수로 계산(하드코딩 금지)
- Financial: AI 재무 인사이트 카드(Dashboard 추천과 연결 문장 필수) + KPI 4-그리드 + 순이익 기여도 + 마진 vs 폐기 비교 + 폐기 랭킹/폐기율
- Upload: AI 분석 가능 여부 카드(진행률 바) + 6종 데이터 업로드 카드(경고 톤) + 검증 결과 + 업로드 이력 테이블
- 신규 컴포넌트 13종 매핑 표 추가
- 레이아웃 수치 정정: Main content padding 32px(p-8)과 Card padding 22~26px 구분

**v1.0 → v2.0 주요 변경:**
- 컬러 시스템: `#4C6FE0` 단일 → 3단계 Primary 팔레트 (base/strong/tint)
- 사이드바: w-64 텍스트 → 76px 아이콘 레일 (#1E293B 다크 배경)
- Dashboard 섹션: 4가지 → 5가지 (AI 제안+위험 신호 분리, 차트+마진율 비대칭)
- KPI: 4개 → 3개, 크기 계층화 (56px/32px/38px)
- 배지: 다양한 형태 → 3-variant pill 통일
- 차트: 미정 → SVG 라인 차트(그라디언트) 확정
- 카테고리: 텍스트 리스트 → progress bar 형태
- 이모지: 유지 → **미사용**으로 정정
- 날짜: 단일 → 헤더 배지 + 푸터 텍스트 분리

---

*SmartFF Design Skill v3.0 — 2026-07-10*
