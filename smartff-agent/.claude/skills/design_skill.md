---
name: design_skill
description: SmartFF Design System 규칙 검사 및 설계 가이드 제공
type: skill
---

# design_skill

SmartFF의 설계 일관성을 유지하기 위한 Design_system.md 규칙 검사 및 가이드 skill.

## 주요 기능

### 1. 설계 규칙 검사
파일(HTML, React, CSS)이 Design_system.md의 규칙을 따르고 있는지 검사합니다.

**확인 항목:**
- 컬러 사용: Primary (#4C6FE0), Success (#15803D), Danger (#DC2626), 배경/카드 색상
- 타이포: Manrope 폰트, 크기 및 굵기 (32px KPI, text-lg section, text-xs label)
- 레이아웃: Sidebar 256px, Topbar 64px, Main padding 32px, 카드 gap 24px
- 컴포넌트: Card, KPI Card, AI Brief Card, Recommendation Card 스타일 일관성
- 카피: GS25 점주 눈높이, 20자 이내 문장, 불릿 3줄 이내, 행동 중심
- 아이콘: Material Symbols Outlined (현재 이모지 유지)

### 2. 페이지별 체크리스트

**Dashboard 페이지:**
- [ ] AI 브리핑 카드 (bg-brand, 풀 너비)
- [ ] KPI 카드 4개 (grid-cols-4)
- [ ] 발주 추천 섹션 (기회 + 위험)
- [ ] 카테고리 현황 섹션
- [ ] 사이드바, 상단바 포함

**Analysis 페이지:**
- [ ] 판매 패턴 차트
- [ ] 시간대 분석 차트
- [ ] 주간/폐기 추이 차트
- [ ] 카테고리 비교 차트
- [ ] 차트: 흰 배경, 얇은 그리드선, 3D 금지

**Financial 페이지:**
- [ ] 마진 분석 차트
- [ ] 폐기 비용 분석
- [ ] 이익 기여도 차트
- [ ] 카테고리별 수익성 테이블
- [ ] 같은 차트 규칙 적용

**Upload 페이지:**
- [ ] CSV/Excel 업로드 영역
- [ ] 업로드 이력 테이블
- [ ] 데이터 검증 피드백
- [ ] 업로드 상태 표시

### 3. React 컴포넌트 매핑

HTML Tailwind → React 컴포넌트 변환 시 참고:

| HTML 클래스 | React 컴포넌트 |
|-----------|---------------|
| `.card` | `<Card/>` |
| `.kpi-card` | `<KPICard/>` |
| `.ai-brief-card` | `<AIBriefCard/>` |
| `.recommendation-card` | `<RecommendationCard/>` |
| `.category-card` | `<CategoryCard/>` |
| `.sidebar` | `<Sidebar/>` |
| `.topbar` | `<Topbar/>` |
| Chart container | `<ChartCard/>` |
| Data table | `<DataTable/>` |
| Upload area | `<UploadCard/>` |
| Badge | `<Badge/>` |
| Status Chip | `<StatusChip/>` |
| Button | `<Button/>` |

### 4. 지양할 것 (Do Not)

검토 시 다음을 찾으면 지적:
- ❌ Glassmorphism 효과
- ❌ 과한 그라디언트
- ❌ 네온 컬러 사용
- ❌ 강한 그림자 (0 1px 3px 초과)
- ❌ 3개 초과 강조색
- ❌ Dashboard의 밀집 테이블
- ❌ 20자 초과 문장
- ❌ 불릿 4줄 이상
- ❌ 아이콘/이모지 과다 사용 (상태 전달 외)

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

- **설계 문서**: `docs/Design_system.md`
- **프로토타입**: `prototype/dashboard_mvp_ko.html`
- **CLAUDE.md**: 프로젝트 전체 규칙

---

*SmartFF Design Skill v1.0 — 2026-07-09*
