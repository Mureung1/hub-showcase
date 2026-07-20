# 3주차 진행률 체크리스트

> 3주차(월~금) 진행도를 추적하는 문서
> 
> 최종 목표: `Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작

---

## Day 1 (월) — Data Pipeline 기초 구축

### Parser 및 dtype 정리

- [ ] sales Parser 작성 (3단 헤더 → 단일 헤더 변환)
  - [ ] `data/scripts/parse_sales.py` 작성
  - [ ] 원본 sales Excel 파일 1개 로드 테스트 완료
  - [ ] DataFrame 컬럼명이 단일 레벨로 정규화 확인

- [ ] waste 상품코드 dtype 정리 (float → 정수/문자열)
  - [ ] `data/scripts/fix_waste_dtype.py` 작성
  - [ ] 변환 전후 코드값 100% 일치 검증
  - [ ] inventory 코드와 자료형 일치 확인

- [ ] inventory Parser 작성
  - [ ] `data/scripts/parse_inventory.py` 작성
  - [ ] 원본 파일 로드 테스트 완료

- [ ] orders Parser 작성
  - [ ] `data/scripts/parse_orders.py` 작성
  - [ ] 원본 파일 로드 테스트 완료

### Financial 계산식 확정 및 문서화

- [ ] Financial 계산식 최종 확정 (docs/specs/financial_calculation_spec.md 기준)
  - [ ] 평균 원가율 계산식 확인
  - [ ] 마진액/마진율 계산식 확인
  - [ ] 폐기손실/폐기율 계산식 확인
  - [ ] 순이익/순이익기여도 계산식 확인

- [ ] `docs/specs/MASTER_DATASET_SPEC.md` 작성
  - [ ] `| 컬럼 | 출처 | 설명 | 계산식 |` 형식 테이블 작성
  - [ ] 필요한 모든 컬럼 정의 완료
  - [ ] Backend/Frontend/Rule Engine 공통 기준 문서로 확정

### Day 1 DoD 확인

- [ ] sales Excel → DataFrame 성공
- [ ] dtype 문제 해결
- [ ] Financial 계산식 문서화
- [ ] Master Dataset 컬럼 정의 완료

---

## Day 2 (화) — Product Master + Master Dataset

### Product Master 생성

- [ ] waste + inventory 병합 시작
  - [ ] 상품코드 기준 일치 확인
  - [ ] 원가(waste) + 매가(inventory) 매칭
  - [ ] Financial에 필요한 컬럼만 추출

- [ ] Product Master 파일 생성
  - [ ] `data/master/product_master.csv` 생성
  - [ ] 카테고리별 상품 수 확인
  - [ ] 필수 컬럼 존재 확인

### Master Dataset 생성

- [ ] sales + waste + inventory + orders 통합
  - [ ] 상품코드/상품명 기준 매칭
  - [ ] 카테고리별 데이터 통합

- [ ] Master Dataset 파일 생성
  - [ ] `data/master/merged_dataset.csv` 생성
  - [ ] MASTER_DATASET_SPEC.md와 컬럼 일치 확인
  - [ ] 카테고리별 row 수 확인
  - [ ] 결측치 확인

### Day 2 DoD 확인

- [ ] `data/master/product_master.csv` 생성 완료
- [ ] `data/master/merged_dataset.csv` 생성 완료
- [ ] MASTER_DATASET_SPEC.md와 컬럼 일치 확인
- [ ] 카테고리별 row 수 및 결측치 확인 완료

---

## Day 3 (수) — Financial Backend + Rule Engine V1

### Financial 계산 API

- [ ] 카테고리 평균 원가율 계산
  - [ ] 폐기 이력 있는 상품 기준 원가율 산출
  - [ ] 카테고리별 평균 원가율 계산
  - [ ] **값이 40~80% 범위인지 확인** (이상 시 매칭률 편차 점검)

- [ ] 마진액/마진율 계산
  - [ ] 카테고리별 마진액 계산
  - [ ] 카테고리별 마진율 계산
  - [ ] Express API 엔드포인트 구현

- [ ] 폐기손실/폐기율 계산
  - [ ] 폐기손실(금액) 계산
  - [ ] 폐기율 계산
  - [ ] Express API 엔드포인트 구현

- [ ] 순이익/순이익기여도 계산
  - [ ] 순이익(마진액 - 폐기손실) 계산
  - [ ] 순이익기여도 계산
  - [ ] Express API 엔드포인트 구현

- [ ] Financial API 테스트
  - [ ] `GET /api/financial` 응답 확인
  - [ ] 모든 지표 반환 확인

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

- [ ] `GET /api/financial` API 정상 동작
- [ ] `GET /api/recommendations` API 정상 동작
- [ ] 원가율이 상식적 범위(40~80%) 내에 있음

---

## Day 4 (목) — Financial Frontend + Dashboard 연결

### Financial Frontend

- [ ] 기존 mock 제거
  - [ ] Financial 페이지의 mock 데이터 제거
  - [ ] API 연결 준비

- [ ] Backend API 연결
  - [ ] `GET /api/financial` 호출
  - [ ] 평균 마진 카드 업데이트
  - [ ] 평균 마진율 카드 업데이트
  - [ ] 폐기 손실 카드 업데이트
  - [ ] 카테고리별 수익성 표 업데이트

- [ ] Financial 페이지 테스트
  - [ ] 실데이터로 렌더링 확인
  - [ ] "추정치" 라벨 표기 확인
  - [ ] `npx tsc --noEmit` 통과
  - [ ] `npm run build` 통과

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

- [ ] Dashboard의 총매출/평균 마진율/폐기손실/추정 순이익이 모두 실데이터
- [ ] Financial이 API 기반으로 렌더링
- [ ] `npx tsc --noEmit`, `npm run build` 성공

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

- [ ] **`Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작한다**
- [ ] `MASTER_DATASET_SPEC.md` 작성 완료
- [ ] Product Master / Master Dataset 생성
- [ ] Financial API가 핵심 지표(마진액/마진율/폐기손실/폐기율/순이익/순이익기여도) 반환
- [ ] Financial 페이지, Dashboard KPI가 실데이터 기반 동작
- [ ] Rule Engine V1이 최소 3개 규칙으로 추천 문구 생성
- [ ] Upload → Dashboard → Financial End-to-End 동작 확인
- [ ] `npx tsc --noEmit`, `npm run build` 성공
- [ ] 브라우저에서 콘솔 에러·흰 화면 없이 전체 시연 가능

---

*Last Updated: 2026-07-20*
