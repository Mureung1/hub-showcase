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

### Rule Engine V1

- [ ] Rule 1: 판매증가 + 낮은 폐기율
  - [ ] `IF 판매 증가 AND 폐기율 < 5% → 발주 확대 검토`
  - [ ] 로직 구현 완료

- [ ] Rule 2: 판매감소 + 높은 폐기율
  - [ ] `IF 판매 감소 AND 폐기율 증가 → 발주 축소 검토`
  - [ ] 로직 구현 완료

- [ ] Rule 3: 낮은 마진율
  - [ ] `IF 마진율 낮음 → 수익성 검토 필요`
  - [ ] 로직 구현 완료

- [ ] RecommendationService 구현
  - [ ] `backend/src/services/RecommendationService.ts` 작성
  - [ ] Rule 적용 로직 완성

- [ ] Recommendation API 엔드포인트
  - [ ] `GET /api/recommendations` 구현
  - [ ] 카테고리별 추천 문구 반환
  - [ ] API 테스트 완료

### Day 3 DoD 확인

- [x] `GET /api/financial/summary` API 정상 동작
- [ ] `GET /api/recommendations` API 정상 동작 — Rule Engine V1 미착수 (아래 참고)
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

### Dashboard 연결

- [ ] Dashboard KPI 카드 연결
  - [ ] 총매출 실데이터 연결
  - [ ] 평균 마진율 실데이터 연결
  - [ ] 폐기손실 실데이터 연결
  - [ ] 추정 순이익 실데이터 연결

- [ ] Dashboard Category Margin 연결
  - [ ] 카테고리별 마진액 표시
  - [ ] 카테고리별 마진율 표시

- [ ] Dashboard Recommendation Card (선택)
  - [ ] `GET /api/recommendations` 호출 (Day 5에서 할 수도 있음)
  - [ ] 추천 문구 표시 (선택사항)

- [ ] Dashboard 페이지 테스트
  - [ ] 실데이터로 렌더링 확인
  - [ ] `npx tsc --noEmit` 통과
  - [ ] `npm run build` 통과

### Day 4 DoD 확인

- [ ] Dashboard의 총매출/평균 마진율/폐기손실/추정 순이익이 모두 실데이터 — Dashboard는 여전히 mock (`dashboardMockData.ts`), 미착수
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

### Analysis 실데이터 연동 (P1, 여유 시)

- [ ] 최소 1개 카테고리 실데이터 연결
  - [ ] Analysis 페이지의 1개 카테고리 mock 제거
  - [ ] Master Dataset 기반 API 연결
  - [ ] 차트 업데이트 확인

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
- [ ] Analysis 최소 1개 카테고리 실데이터 연동 완료
- [ ] `npx tsc --noEmit`, `npm run build` 성공
- [ ] 브라우저에서 콘솔 에러·흰 화면 없이 전체 시연 가능

---

## 최종 Acceptance Criteria 확인

3주차 완료 시 다음을 모두 확인하세요:

- [ ] **`Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작한다** — Financial까지는 동작, Dashboard 실데이터·Recommendation 미연결로 전체 흐름은 미완성
- [x] `MASTER_DATASET_SPEC.md` 작성 완료
- [ ] Product Master / Master Dataset 생성 — Master Dataset은 완료, Product Master는 설계 변경으로 P1 이월 (카테고리+월 집계 방식 채택)
- [x] Financial API가 핵심 지표(마진액/마진율/폐기손실/폐기율/순이익/순이익기여도) 반환
- [ ] Financial 페이지, Dashboard KPI가 실데이터 기반 동작 — Financial은 완료, Dashboard는 여전히 mock
- [ ] Rule Engine V1이 최소 3개 규칙으로 추천 문구 생성 — 미착수
- [ ] Upload → Dashboard → Financial End-to-End 동작 확인 — Upload가 파일 메타데이터만 기록하고 실제 ETL 트리거는 안 함 (수동 실행 필요), Dashboard 미연동으로 전체 흐름 미완성
- [x] `npx tsc --noEmit`, `npm run build` 성공 (Financial 범위 기준)
- [x] 브라우저에서 콘솔 에러·흰 화면 없이 Financial 페이지 시연 가능 (dev 서버로 확인 완료)

---

## ⚠️ 2026-07-20 세션 중 발견한 이슈

- **ETL 스크립트 유실**: WSL/Windows 브랜치 통합(merge 커밋 `0b031d5`) 과정에서 `data/scripts/sales_parser.py`, `waste_parser.py`, `master_dataset_builder.py`, `validate_master_dataset.py`가 저장소에서 사라짐. 산출물(`sales.csv`/`waste.csv`/`merged_dataset.csv`)은 남아있어 Financial은 정상 동작하지만, **원본 Excel이 바뀌면 재생성이 불가능한 상태**. git 히스토리(커밋 `eb65391`)에서 복구 필요 — 다음 세션 우선 처리 권장
- **Upload → ETL 자동 연결 없음**: Upload 페이지는 파일명/카테고리 메타데이터만 Supabase에 기록하고, 실제 파일 저장이나 파서 실행을 트리거하지 않음. "전체 흐름 자동화"를 목표로 하려면 별도 설계 필요

---

*Last Updated: 2026-07-20 (Financial 페이지 개선 세션 반영)*
