## Milestone 1 ✅

- [x] Project Planning
- [x] User Scenario
- [x] UI Prototype
- [x] GitHub Wiki
- [x] MVP Scope

## Milestone 2

- [x] React Setup
- [x] Tailwind
- [x] Layout
- [ ] Dashboard
- [ ] Analysis
- [ ] Financial
- [ ] Upload

---

# Backlog (Week 2~4)

> 우선순위: P0(필수/차단) > P1(중요) > P2(여유 시)

## Week 2 — P0 (Backend: Product Master / Data Pipeline)

> `data/raw` 실제 파일 확인 결과: 상품코드가 있는 파일은 `waste`/`inventory` 뿐이고, `sales`/`orders`는 상품명만 존재. 원가는 `waste`, 매가는 `inventory`에 나뉘어 있음. `sales`는 3단 그룹 헤더(조회기간/비교기간/차이)로 되어 있어 일반 파서로 바로 읽히지 않음.

- [ ] sales 파일 헤더 정규화: 3단 그룹 헤더 → 단일 헤더로 변환하는 파서 작성
- [ ] waste 상품코드 dtype 문제 해결: float(`2.700039e+12`) → 정수/문자열 변환, 정밀도 검증
- [ ] waste + inventory 병합: 상품코드 기준 원가+매가 통합 → Product Master 1차 버전
- [ ] inventory/waste 상품명 표기 규칙 확인: 두 파일 간 상품명 실제 일치 여부 샘플 대조
- [ ] sales 상품명 ↔ Product Master 매칭 로직: 정확 일치 실패 시 유사 매칭 or 수동 매핑 테이블
- [ ] orders 상품명 ↔ Product Master 매칭 (sales와 동일 로직 재사용)
- [ ] 매칭 실패 상품 리스트 산출 + 매칭률 검증
- [ ] Merged Dataset 조립: sales+waste+inventory+orders, 카테고리별 파일 통합 포함

### ⚠️ Risk: 월별/카테고리별 waste↔inventory 매칭률 편차

waste 상품코드가 inventory 상품코드에 포함되는 비율(매칭률)을 월×카테고리로 전수 확인한 결과:

| 카테고리 | 01월 | 02월 | 03월 | 04월 | 05월 | 06월 |
|---|---|---|---|---|---|---|
| 김밥 | 13% | 19% | 42% | 100% | 100% | 100% |
| 주먹밥 | 29% | 30% | 31% | 72% | 100% | 100% |
| 도시락 | 70% | 67% | 75% | 94% | 100% | 100% |
| 햄버거샌드위치 | 100% | 96% | 100% | 97% | 100% | 100% |

- 김밥/주먹밥은 01~03월 매칭률이 매우 낮음(13~42%). 도시락은 상대적으로 양호. 햄버거샌드위치는 처음부터 문제 없음.
- 04월 이후로는 전 카테고리 90%+ 로 안정화.
- **원인 불명** — 카테고리별 재고관리 도입 시점 차이인지, 원본 데이터 자체의 결측/오류인지 확인 필요.
- **대응 옵션**: (1) 01~03월 김밥/주먹밥 데이터는 분석 대상에서 제외, (2) 원본 데이터 재확보 요청, (3) 매칭 안 된 구간은 mock/추정치로 대체. Product Master 매칭 작업 중 실제 결측 원인을 먼저 파악한 뒤 세 옵션 중 결정.

## Week 2 — P0 (Frontend)
- [ ] MainLayout (완료 — 커밋 `54567f6`)
- [ ] Upload 페이지: 판매/발주/폐기 데이터 업로드, 업로드 이력, 데이터셋 상태
- [ ] Dashboard Skeleton: 실데이터 없이 UI 레이아웃/컴포넌트 구조만 구현

## Week 2~3 — P0
- [ ] Analysis 페이지 (`ANALYSIS_PAGE_SPEC.md` 기준): 요일별 판매 패턴, 시간대별 판매 패턴, 판매 추세, 폐기 추세 — Merged Dataset 기반

## Week 3 — P1 (Backend: 관리회계 계산)
- [ ] 마진액 계산
- [ ] 마진율 계산
- [ ] 폐기손실 계산
- [ ] 순이익 계산
- [ ] 순이익 기여도 계산
- [ ] 폐기율 계산

## Week 3 — P1 (Frontend)
- [ ] Financial 페이지 (`FINANCIAL_CALCULATION_SPEC.md` 기준): 평균 마진, 평균 마진율, 폐기 손실, 카테고리별 수익성

## Week 4 — P1
- [ ] Dashboard Data Integration: Analysis/Financial 실데이터 연동
- [ ] AI Recommendation (Rule-Based Decision Engine 연결)
- [ ] 통합 테스트, 버그 수정
- [ ] 반응형 점검

---

# Backlog — P2 (시간 남을 때 구현)

- [ ] 로그인/로그아웃: 사이드바 프로필 팝오버에 로그아웃 버튼 추가 (Supabase 인증 연동)
