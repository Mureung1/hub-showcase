# 3주차 진행률 체크리스트

> 3주차(월~금) 진행도를 추적하는 문서
> 
> 최종 목표: `Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작

---

## Day 1 (월) — Data Pipeline 기초 구축

### Parser 및 dtype 정리

- [x] sales Parser 작성 (3단 헤더 → 단일 헤더 변환)
  - [x] `data/scripts/sales_parser.py` 작성 (2026-07-20, 커밋 e173ce3)
  - [x] 원본 sales Excel 파일 로드 테스트 완료 (합계 행 제외 버그 발견·수정, 커밋 b7bd805)
  - [x] DataFrame 컬럼명이 단일 레벨로 정규화 확인
  - ⚠️ **재확인 필요**: 브랜치 통합(merge 0b031d5) 과정에서 `data/scripts/`의 `.py` 파일들이 저장소에서 누락된 것을 2026-07-20 세션 중 발견. 산출물(`sales.csv`/`waste.csv`/`merged_dataset.csv`)은 남아있으나 스크립트 원본은 git 히스토리(`eb65391`)에서 복구 필요

- [x] waste 상품코드 dtype 정리 (float → 정수/문자열) — `waste_parser.py`에 포함되어 처리됨
- [ ] inventory Parser 작성 — 미착수 (Financial 계산에서 inventory는 사용 안 하기로 결정, `financial_calculation_spec.md` 참고)
- [ ] orders Parser 작성 — 미착수 (Financial 계산에 불필요, Dashboard 발주 추천 P1에서 필요 시 착수)

### Financial 계산식 확정 및 문서화

- [x] Financial 계산식 최종 확정 (`docs/specs/financial_calculation_spec.md` 기준) — 2026-07-20 작성 완료
  - [x] 평균 원가율 계산식 확인
  - [x] 마진액/마진율 계산식 확인
  - [x] 폐기손실/폐기율 계산식 확인
  - [x] 순이익/순이익기여도 계산식 확인

- [x] `docs/specs/MASTER_DATASET_SPEC.md` 작성 — 2026-07-20 작성 완료
  - [x] `| 컬럼 | 출처 | 설명 | 계산식 |` 형식 테이블 작성
  - [x] 필요한 모든 컬럼 정의 완료
  - [x] Backend/Frontend 공통 기준 문서로 확정

### Day 1 DoD 확인

- [x] sales Excel → DataFrame 성공
- [x] dtype 문제 해결
- [x] Financial 계산식 문서화
- [x] Master Dataset 컬럼 정의 완료

---

## Day 2 (화) — Product Master + Master Dataset

### Product Master 생성

- [ ] Product Master (`data/master/product_master.csv`) — **미착수**. sales-waste 상품명 매칭률이 50.1%로 낮아 상품 단위 대신 카테고리+월 단위 집계로 설계 방향을 변경(`MASTER_DATASET_SPEC.md` 기술 결정사항 참고), 상품 단위 Product Master는 P1(상품별 분석)로 이월

### Master Dataset 생성

- [x] sales + waste 통합 (inventory/orders는 설계상 제외 — 위 결정 참고)
  - [x] 카테고리+월 기준 집계 (상품코드 매칭 대신)

- [x] Master Dataset 파일 생성
  - [x] `data/master/merged_dataset.csv` 생성 (24행 = 4카테고리 × 6개월)
  - [x] MASTER_DATASET_SPEC.md와 컬럼 일치 확인
  - [x] 카테고리별 row 수 확인 (각 6행)
  - [x] 결측치 확인 (0개, `validate_master_dataset.py` 자동 검증 추가)

### Day 2 DoD 확인

- [ ] `data/master/product_master.csv` 생성 완료 — 설계 변경으로 P1 이월 (아래 참고)
- [x] `data/master/merged_dataset.csv` 생성 완료
- [x] MASTER_DATASET_SPEC.md와 컬럼 일치 확인
- [x] 카테고리별 row 수 및 결측치 확인 완료

---

## Day 3 (수) — Financial Backend + Rule Engine V1

### Financial 계산 API

- [x] 카테고리 평균 원가율 계산
  - [x] 폐기 이력 있는 상품 기준 원가율 산출
  - [x] 카테고리별 평균 원가율 계산 (ETL 단계에서 `merged_dataset.csv`에 사전 계산되어 저장)
  - [x] **값이 40~80% 범위인지 확인** — 실측 62.1~75.7%, 정상 범위

- [x] 마진액/마진율 계산
  - [x] 카테고리별 마진액 계산
  - [x] 카테고리별 마진율 계산
  - [x] Express API 엔드포인트 구현 (`GET /api/financial/summary`)

- [x] 폐기손실/폐기율 계산
  - [x] 폐기손실(금액) 계산
  - [x] 폐기율 계산 — 2026-07-20 세션 중 프론트엔드 집계 버그(연매출 대신 최종월 매출로 나누던 오류, 최대 96% 왜곡) 발견·수정
  - [x] Express API 엔드포인트 구현

- [x] 순이익/순이익기여도 계산
  - [x] 순이익(마진액 - 폐기손실) 계산
  - [x] 순이익기여도 계산 (`ProfitContribution` 컴포넌트, 2026-07-20)
  - [x] Express API 엔드포인트 구현

- [x] Financial API 테스트
  - [x] `GET /api/financial/summary` 응답 확인 (`months`/`categories` 쿼리 필터 포함)
  - [x] 모든 지표 반환 확인

### Rule Engine V1 — 2026-07-21 완료

> PM 논의 결과 기획 문서의 절대 임계값(폐기율 5%, 마진율 임의값) 대신, 로드된 데이터셋에서 매번 계산하는 평균 기준으로 설계 변경 (점주가 데이터를 계속 업데이트해도 기준선이 함께 움직이도록)

- [x] Rule 1 (SALES_UP_WASTE_LOW): 판매량 전월 대비 증가 AND 폐기율 < 카테고리 평균 AND 순이익 전월 대비 증가 → 발주 확대 검토
  - [x] 로직 구현 완료 (`evaluateSalesUpWasteLow`)

- [x] Rule 2 (SALES_DOWN_WASTE_UP): 판매량 전월 대비 감소 AND 폐기율 전월 대비 증가 AND 순이익 전월 대비 감소 → 발주 축소 검토
  - [x] 로직 구현 완료 (`evaluateSalesDownWasteUp`)

- [x] Rule 3 (LOW_MARGIN): 마진율 < 전체 평균 → 수익성 점검 필요
  - [x] 로직 구현 완료 (`evaluateLowMargin`)

- [x] RecommendationService 구현
  - [x] `backend/src/services/RecommendationService.ts` 작성
  - [x] Rule 적용 로직 완성 (규칙별 평가 함수 분리, severity/title/reason/metrics 포함)

- [x] Recommendation API 엔드포인트
  - [x] `GET /api/recommendations` 구현
  - [x] 카테고리별 추천 문구 반환
  - [x] API 테스트 완료 (curl로 6월 기준 결과 검증 — 도시락 발주축소+수익성점검, 햄버거샌드위치 발주축소)

### Day 3 DoD 확인

- [x] `GET /api/financial/summary` API 정상 동작
- [x] `GET /api/recommendations` API 정상 동작
- [x] 원가율이 상식적 범위(40~80%) 내에 있음

---

## Day 4 (목) — Financial Frontend + Dashboard 연결

### Financial Frontend

- [x] 기존 mock 제거
  - [x] Financial 페이지의 mock 데이터 제거
  - [x] API 연결 준비

- [x] Backend API 연결
  - [x] `GET /api/financial/summary` 호출
  - [x] 마진액 카드 업데이트
  - [x] 마진율 카드 업데이트 (KPI + "손익 구조" 워터폴 카드에서 원가율까지 함께 노출, 2026-07-20)
  - [x] 폐기 손실 카드 업데이트
  - [x] 카테고리별 수익성 표 업데이트 (테이블 대신 "순이익 기여도" 랭킹 + "폐기율" 막대 컴포넌트로 구현, 2026-07-20)

- [x] Financial 페이지 테스트
  - [x] 실데이터로 렌더링 확인
  - [x] "추정" 라벨 표기 확인 (마진액/순이익 카드)
  - [x] `npx tsc --noEmit` 통과
  - [x] `npm run build` 통과

**2026-07-20 세션 추가 개선 (체크리스트 원래 항목 밖)**:
- [x] 월 선택 UI (`MonthSelector`) + 카테고리 선택 UI (`CategorySelector`) 추가, `months`/`categories` 쿼리 필터 실사용
- [x] KPI 카드에 전월 대비 증감(%) 델타 표시
- [x] "손익 구조" 워터폴 카드 추가 (매출 → 원가 → 매진총이익 → 폐기손실 → 영업이익, 원가율 노출)
- [x] 사이드바에 재무(₩) 메뉴 아이콘 누락 발견·추가 (기존엔 클릭 진입 경로 자체가 없었음)
- [x] Dashboard/Analysis/Financial 공통이던 가짜 "AI 분석 높음 · 98% 반영" 배지 3개 페이지 모두 제거
- [x] "최근 4주" 표기를 실제 데이터 단위(월)에 맞게 "최근 1개월"/"최근 3개월"로 전체 정정

### Dashboard 연결 — 2026-07-21 완료

- [x] Dashboard KPI 카드 연결
  - [x] 판매 추세(전월 대비 %) 실데이터 연결
  - [x] 평균 마진율 실데이터 연결
  - [x] 폐기율 실데이터 연결
  - [x] 순이익 규모는 카테고리별 마진 바/AI 브리핑 카드 근거 수치로 노출 (별도 KPI 카드는 기존 3분할 레이아웃 유지)

- [x] Dashboard Category Margin 연결
  - [x] 카테고리별 마진율 표시 (`MarginBarList`, 최신월 기준 + 전월 대비 증감)

- [x] Dashboard Recommendation Card
  - [x] `GET /api/recommendations` 호출
  - [x] AI 브리핑 카드(발주 확대 추천 있을 때) / 위험 신호 카드(발주 축소·수익성 점검 추천 있을 때) 로 표시, 해당 추천 없으면 안전한 폴백 문구로 대체

- [x] Dashboard 페이지 테스트
  - [x] 실데이터로 렌더링 확인 (수동 계산으로 KPI 수치 대조 검증)
  - [x] `npx tsc --noEmit` 통과
  - [x] `npm run build` 통과

### Day 4 DoD 확인

- [x] Dashboard의 판매추세/평균 마진율/폐기율이 모두 실데이터 (`dashboardMockData.ts` 삭제, mock 제거 완료)
- [x] Financial이 API 기반으로 렌더링
- [x] `npx tsc --noEmit`, `npm run build` 성공

---

## Day 5 (금) — 통합 및 안정화

### End-to-End 흐름 확인

- [ ] Upload 페이지 데이터 업로드
- [ ] Python ETL 실행 확인
  - [ ] Master Dataset 생성 확인

- [ ] Express API 동작 확인
  - [ ] `GET /api/financial` 응답 확인
  - [ ] `GET /api/recommendations` 응답 확인

- [ ] Dashboard 실데이터 표시 확인
  - [ ] KPI 카드 업데이트 확인
  - [ ] 권장 사항 표시 확인

- [ ] Financial 페이지 실데이터 표시 확인
  - [ ] 마진 정보 표시 확인
  - [ ] 폐기 정보 표시 확인

### Analysis 실데이터 연동 (P1, 여유 시) — 2026-07-22 부분 완료

- [x] 판매/폐기 추세 차트 실데이터 연결 (4개 카테고리 전부, 최소 1개 요구사항 초과 달성)
  - [x] Analysis 판매/폐기 추세 mock 제거
  - [x] `/api/financial/summary` 기반 API 연결
  - [x] 차트 업데이트 확인 (카테고리 전환 시 재조회, 수량 라벨/툴팁 추가)
  - [x] 겸사겸사 발견한 버그 수정: `Category` 타입의 `삼각김밥`(mock 전용, 실제 미존재) → `주먹밥`
  - [x] 겸사겸사 발견한 이슈 수정: 추세 라인차트 y축이 0 기준선이 아니라 min~max 자동 스케일이라 변동폭이 과장되어 보이던 문제 (Analysis + Dashboard 공통)
- [ ] 요일별/시간대별 판매 패턴 실데이터 연결 — 미착수, 원본 데이터는 존재 확인(`data/raw/weekday_sales/`, `hourly_sales/`, 6월만) but 새 파서 필요. `docs/tasks.md` 백로그 2순위로 이월

### 예외 처리 및 버그 수정

- [ ] 콘솔 에러 확인 및 수정
  - [ ] 타입 에러 수정
  - [ ] API 호출 에러 처리
  - [ ] 데이터 결측치 처리

- [ ] 흰 화면 문제 확인 및 수정
  - [ ] 렌더링 문제 확인
  - [ ] 무한 루프 확인
  - [ ] 상태 업데이트 문제 확인

- [ ] 브라우저 실행 확인
  - [ ] dev 서버 실행
  - [ ] 모든 페이지 로드 확인
  - [ ] 데이터 흐름 확인

### 최종 검증

- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과
- [ ] 브라우저에서 콘솔 에러 없음
- [ ] 전체 데이터 흐름 정상 동작 확인

### 문서 정리 및 마무리

- [ ] `docs/tasks.md` 3주차 체크박스 업데이트
- [ ] `docs/scrum.md` 3주차 완료 표시
- [ ] 필요한 커밋 정리
- [ ] Risk 항목 업데이트 (매칭률 편차 결과 기록)

### Day 5 DoD 확인

- [ ] `Upload → Python ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 흐름 정상 동작
- [x] Analysis 최소 1개 카테고리 실데이터 연동 완료 — 판매/폐기 추세는 4개 카테고리 전부 완료, 요일/시간대 패턴은 백로그 이월 (2026-07-22)
- [ ] `npx tsc --noEmit`, `npm run build` 성공
- [ ] 브라우저에서 콘솔 에러·흰 화면 없이 전체 시연 가능

---

## 최종 Acceptance Criteria 확인

3주차 완료 시 다음을 모두 확인하세요:

- [x] **`Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작한다** — Dashboard/Financial/Recommendation 모두 실데이터 기반 동작 확인 (2026-07-21). 단, Upload→ETL 구간은 여전히 수동 실행 (아래 이슈 참고, 백로그 최우선 항목으로 이월)
- [x] `MASTER_DATASET_SPEC.md` 작성 완료
- [ ] Product Master / Master Dataset 생성 — Master Dataset은 완료, Product Master는 설계 변경으로 P1 이월 (카테고리+월 집계 방식 채택)
- [x] Financial API가 핵심 지표(마진액/마진율/폐기손실/폐기율/순이익/순이익기여도) 반환
- [x] Financial 페이지, Dashboard KPI가 실데이터 기반 동작
- [x] Rule Engine V1이 최소 3개 규칙으로 추천 문구 생성 (2026-07-21 완료)
- [x] Dashboard → Financial → Recommendation End-to-End 동작 확인 — Upload API를 통한 실제 ETL 트리거는 여전히 수동 (백로그 최우선 항목, `docs/tasks.md` 참고)
- [x] `npx tsc --noEmit`, `npm run build` 성공 (Financial + Dashboard + Recommendation 범위 기준)
- [x] 브라우저에서 콘솔 에러·흰 화면 없이 Financial 페이지 시연 가능 (dev 서버로 확인 완료)

---

## ⚠️ 이슈 트래킹

- ✅ **ETL 스크립트 유실 (해결됨, 2026-07-20)**: WSL/Windows 브랜치 통합(merge 커밋 `0b031d5`) 과정에서 사라졌던 `data/scripts/*.py` 4개 파일을 git 히스토리(커밋 `eb65391`)에서 복구 완료 (커밋 `25d7ed1`)
- **Upload → ETL 자동 연결 없음 (미해결)**: Upload 페이지는 파일명/카테고리 메타데이터만 Supabase에 기록하고, 실제 파일 저장이나 파서 실행을 트리거하지 않음. `FinancialService`도 서버 기동 시 1회만 데이터를 캐싱해 재시작 전까지 갱신 반영 안 됨. `docs/tasks.md` 백로그 최우선(⭐) 항목으로 등록 (2026-07-21, 예상 소요 1~2일)
- **Analysis 요일별/시간대별 패턴 미연동 (미해결)**: 원본 데이터는 존재(`data/raw/weekday_sales/`, `hourly_sales/`, 6월 1~4주차만) 하나 파서가 없어 여전히 mock. `docs/tasks.md` 백로그 2순위로 등록 (2026-07-22, 예상 소요 1~2일)

---

*Last Updated: 2026-07-22 (Analysis 추세 차트 실데이터 연동 세션 반영)*
