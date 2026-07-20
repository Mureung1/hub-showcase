# 3주차 주간 계획 (Final)

## Context

2주차까지 다음을 완료했다: Sidebar(Dashboard/Analysis/Financial), Upload Vertical Slice(FE-BE 연결), Dashboard Skeleton(mock), Analysis Page(mock), Design System 및 공통 컴포넌트. 현재 SmartFF는 UI는 대부분 준비되었지만 실제 데이터 기반으로 동작하지 않는다.

4주차는 실질적으로 월/수/목(3일)만 개발 가능하다는 전제가 있어, **3주차 안에 핵심 기능(MVP)을 모두 완성하고 4주차는 통합·안정화·발표 준비에 집중**하는 것으로 계획을 잡는다. 새로운 기능 개발은 3주차 내에 마무리한다.

## 개발 원칙

### Data Flow
```
Raw Excel → Python ETL → Product Master → Merged Dataset → Express API
→ Financial / Dashboard / Analysis → Rule-Based Decision Engine
```

### 역할 분리
- **Python**: ETL, 데이터 검증, Product Master, Master Dataset 생성
- **Express**: CSV/Master Dataset 읽기, Financial 계산, Rule Engine, API 제공
- **React**: Dashboard, Financial, Analysis

## 요일별 일정

### Day 1 (월) — Data Pipeline 기초 구축
- sales Parser 작성 (3단 헤더 → 단일 헤더)
- waste 상품코드 dtype 정리 (float → 정수/문자열)
- inventory / orders Parser
- Financial 계산식 최종 확정 (`docs/specs/financial_calculation_spec.md` 기준)
- `docs/specs/MASTER_DATASET_SPEC.md` 작성 — `| 컬럼 | 출처 | 설명 | 계산식 |` 형식, Backend/Frontend/Rule Engine 공통 기준 문서

DoD: sales Excel → DataFrame 성공, dtype 문제 해결, Financial 계산식 문서화, Master Dataset 컬럼 정의 완료

### Day 2 (화) — Product Master + Master Dataset
- waste + inventory 병합 → Product Master 생성 (Financial에 필요한 컬럼만)
- sales / orders 연결 → Master Dataset 생성

DoD:
- `data/master/product_master.csv`, `data/master/merged_dataset.csv` 생성
- `MASTER_DATASET_SPEC.md`와 컬럼 일치 확인
- 카테고리별 row 수 및 결측치 확인

> 매칭률 편차(김밥/주먹밥 1~3월 13~42%) 조사는 별도 작업으로 빼지 않는다. Day3에서 카테고리별 원가율을 실제로 산출했을 때 이상치가 보이면 그때 원인을 파고들어 대응(제외/보정)하고, 정상 범위면 넘어간다.

### Day 3 (수) — Financial Backend + Rule Engine V1
- Financial 계산 API: 평균 원가율, 마진액, 마진율, 폐기손실, 폐기율, 순이익, 순이익 기여도
  - 원가율 산출 시 카테고리별 값이 상식적 범위(40~80%)인지 확인 — 벗어나면 매칭률 편차가 원인인지 점검
- Rule Engine V1 (project_plan.md 9절 Decision Engine 원칙 — ML 아닌 Rule-Based)
  - 예: `IF 판매 증가 AND 폐기율 < 5% → 발주 확대 검토`
  - `IF 판매 감소 AND 폐기율 증가 → 발주 축소 검토`
  - `IF 마진율 낮음 → 수익성 검토 필요`
  - 결과 저장/제공 경로: `Rule Engine V1 → RecommendationService → GET /api/recommendations → Dashboard Recommendation Card`

DoD: `GET /financial`, `GET /api/recommendations` API 정상 동작

### Day 4 (목) — Financial Frontend + Dashboard 연결
- Financial: mock 제거, API 연결
- Dashboard: KPI 카드, Category Margin, Recommendation Card 연결

DoD: Dashboard의 총매출/평균 마진율/폐기손실/추정 순이익이 모두 실데이터, Financial이 API 기반으로 렌더링

### Day 5 (금) — 통합 및 안정화
- Upload → Dashboard 전체 흐름 확인
- Analysis 최소 1개 카테고리 실데이터 연결
- 예외 처리, 버그 수정, 문서 정리

DoD: `Upload → Python ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 흐름 정상 동작

## Priority

- **P0**: Parser, Product Master, Master Dataset, Financial Backend, Financial Frontend, Dashboard KPI 실데이터, Rule Engine V1
- **P1**: Dashboard Recommendation, Analysis 1개 카테고리 실데이터
- **P2**: Analysis 전체 전환, Rule 추가, UI 개선

## Acceptance Criteria

- **`Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작한다 (3주차의 가장 중요한 성공 기준)**
- `MASTER_DATASET_SPEC.md` 작성 완료
- Product Master / Master Dataset 생성
- Financial API가 핵심 지표(마진액/마진율/폐기손실/폐기율/순이익/순이익기여도) 반환
- Financial 페이지, Dashboard KPI가 실데이터 기반 동작
- Rule Engine V1이 최소 3개 규칙으로 추천 문구 생성
- Upload → Dashboard → Financial End-to-End 동작 확인
- `npx tsc --noEmit`, `npm run build` 성공
- 브라우저에서 콘솔 에러·흰 화면 없이 전체 시연 가능

## Risks & 대응

- **매칭률 편차(김밥/주먹밥 1~3월)**: 별도 조사 작업 없이 진행하다가, Day3에서 카테고리 원가율이 비정상 범위로 나오면 그때 원인 파악 후 대응(구간 제외/추정치 대체). 정상 범위면 스킵하고 `docs/tasks.md` Risk 항목에 "3주차 기준 이상 없음" 메모만 남김
- **ETL 지연**: Day2까지 Master Dataset 미완성 시 매칭률 양호한 카테고리(도시락/햄버거샌드위치) 우선으로 축소해 Day3 착수
- **Rule Engine 시간 부족**: 규칙 개수를 1개로 줄여서라도 반드시 포함 (project_plan.md 핵심 차별점)

## Out of Scope

- Fuzzy Matching, Product Master 자동 보정
- 매칭률 편차 완전 원인 규명 (이상 없으면 스킵)
- Analysis 전체 카테고리 실데이터 전환
- Dashboard AI Insight 고도화, Rule Engine V2
- 머신러닝 기반 예측, 자동발주, POS 연동

## 검증 방법

- 각 요일 종료 시 해당 DoD 확인
- Financial/Dashboard 변경 후 `npx tsc --noEmit`, `npm run build`, dev 서버에서 브라우저 실행 확인 (콘솔 에러·흰 화면 없음)
- Python 파서/Product Master는 샘플 대조 및 정합성 확인 후 Express로 전달

---

*Last Updated: 2026-07-20*
