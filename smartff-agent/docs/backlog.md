# Backlog (미구현 항목만 정리)

이 문서는 `docs/tasks.md`에 흩어져 있는 미완료(`- [ ]`) 항목만 모은 파생 요약본이다. 완료 기록·과거 경과는 `docs/tasks.md`가 원본이며, 이 문서는 그것을 대체하지 않는다.

---

## Design Principles (2026-07-30 확정)

SmartFF가 "CSV를 저장하는 프로젝트"에서 "데이터 모델을 설계하는 프로젝트"로 넘어가는 시점에 맞춰, 이후 기능을 추가할 때 판단 기준이 되는 원칙을 남긴다.

- ETL은 원시 Fact만 생성한다.
- 파생 지표(비율 등)는 조회 시점(Service)에서 계산한다.
- 데이터는 날짜 기반으로 저장한다.
- 기존 데이터는 절대 재가공하지 않는다.
- Dashboard는 운영 브리핑을 위한 ViewModel을 제공한다.

---

## 4주차 잔여 (이번 주 작업 대상)

- [ ] Dashboard AI Insight 고도화 — 시간 남을 때만, 낮은 우선순위
- [ ] 반응형 UI 점검
- [ ] 시연 스크립트 작성
- [ ] 시연용 데이터셋 확정
- [ ] PPT/발표 자료 작성
- [ ] 시연 리허설

## Pattern ETL 검증 (보류)

- [ ] 실제 7월 1~3주차 원본 데이터로 요일/시간대 패턴 자동화 검증 — 데이터 미확보로 계속 보류 (`data/scripts/pattern_parser.py` 코드 자체는 완료됨)

---

## P2 백로그 (MVP 완성 이후 고도화)

- [ ] 폐기 요일/시간대 패턴 실데이터 연동 — 판매 패턴은 연동 완료, 폐기 쪽 원본 데이터 자체가 없어 보류
- [ ] 배송편(1편/2편) 데이터 모델 확장 검토 (v2 Rule Engine 범위) — `RecommendationService.ts`는 비교적 쉽게 확장 가능하나 `patternService.ts`는 원본 자체가 카테고리 단위 사전집계라 분리 불가
- [ ] 발주 데이터 활용 — 발주·판매 괴리 + 폐기율 교차 규칙 추가, orders 파서 신규 작성 필요 (상품명 매칭률 85.9%로 양호 확인됨)
- [ ] Fuzzy Matching — sales/orders 상품명 유사 매칭
- [ ] Product Master 자동 보정 — 수동 매핑 테이블 구축
- [ ] Rule Engine V2 — 더 복잡한 규칙 추가
- [ ] Dashboard '운영 브리핑' 재설계 — 점주 업무 흐름(오늘 발주 → 내일 입고 → 내일 판매) 기반 재구성, 자세한 내용은 `docs/discussion.md` Discussion 8 참고
- [ ] Dashboard AI Insight 자연어 분석 고도화
- [ ] 로그인/로그아웃 — Supabase 인증 연동, 배포 시점에 경량 보호부터 우선 검토
- [ ] 프론트엔드 번들 코드 스플리팅 — `npm run build` 시 679KB 메인 청크 경고, 페이지별 `React.lazy()` 분리 고려

---

## 신규 논의 (2026-07-27, 아직 tasks.md에 미반영)

- [ ] **SmartFF 방향 전환 검토**: "FF 운영 의사결정 지원 시스템"으로 재정의, 분석 기간(Analysis Period: 최근 7일/14일/MTD/30일/3개월) 개념 도입
  - 현재 `master_dataset_builder.py`는 월+카테고리 단위로 매번 전체 재계산하는 stateless 구조라, 일 단위 기간 분석을 하려면 **날짜(일) 단위 누적 저장으로 집계 그레인 자체를 바꿔야 함** — "구조는 유지"라고 논의됐지만 실제로는 상당한 리팩터링
  - `patternService.ts`(요일/시간대 패턴)는 원본이 카테고리 단위 사전집계라 이 방향 전환과 별개로 여전히 세분화 불가
  - 착수 전 별도 기술 검토(현재 ETL 파이프라인에 필요한 변경 범위 산정) 선행 권장, 발표 이후 시점에 논의 재개
  - **방향 전환을 뒷받침하는 근거 (2026-07-27 논의)**:
    1. **재고 개념 자체가 FF에 안 맞음**: FF 상품은 유통기한이 3일 이내라 "재고를 보유한다"는 개념이 성립하지 않음. Upload 페이지의 재고 카드는 코드상으로도 미사용(`backend/src/types/upload.ts`에만 타입으로 존재, ETL/Financial/RecommendationService 어디서도 참조 안 됨)이고, 개념적으로도 이 제품군에는 맞지 않는 지표임.
    2. **FF는 초단기 회전 구조**: 발주→판매→폐기가 2~3일 안에 끝나는 구조라, "이번 달 vs 지난 달" 같은 월 단위 비교보다 "최근 7일/14일" 같은 짧은 분석 기간이 실제 운영 리듬에 더 맞음.
    3. **Dashboard 사용 빈도와 데이터 그레인의 불일치**: Dashboard는 "오늘 뭘 해야 하나"를 매일(발주 타이밍마다 하루 1~2번) 확인하는 화면으로 설계됐는데, 현재 데이터가 월 단위 집계라 매일 봐도 같은 숫자만 보임. Analysis/Financial은 주 단위 회고용이라 월 단위 그레인과 궁합이 맞지만, Dashboard만 사용 주기와 데이터 갱신 주기가 어긋남.

---

## 신규 논의 (2026-07-30) — 주 단위(Weekly-grain) 데이터 전환 기술 검토

발표(2026-07-31) 임박으로 **지금 착수하지 않고 기술 검토 내용만 전부 기록**. 발표 이후 재개.

### 배경 / 결정 사항

- 2026-07-27 논의("SmartFF 방향 전환 검토")에서 나온 "월 단위 → 세분화" 방향을 구체화한 기술 검토.
- 처음엔 "일 단위(daily)"까지 검토했으나, **실제 매장 POS 리포트는 조회 기간(일/주/월)을 뭘 선택하든 파일 안에 날짜가 찍히지 않고 상품별 합산값만 나오는 고정 양식**이라 기간 정보는 파일명으로만 표현 가능하다는 게 확인됨. 이 때문에 일 단위로 가면 사장님이 매일 8개 파일(판매4+폐기4)을 올려야 해서 월 240개 파일 — 지금(월 8개)의 30배 부담이라 비현실적.
- 반면 `data/raw/weekly_waste/weekly_waste_{MM}_w{N}_{category}.xlsx`가 **이미 존재**(주 단위 상품별 폐기 데이터, 현재 미사용)하고, `weekday_sales`/`hourly_sales`도 이미 `{MM}_w{N}_{category}` 패턴으로 주 단위 조회를 쓰고 있어 POS가 주 단위 조회를 지원한다는 게 증명됨. 주 단위면 월 32~35개 파일(지금의 약 4배) 수준으로 현실적.
- **결론: 주 단위(Weekly-grain)를 기본 방향으로 채택.** 일 단위는 향후 POS 연동 자동화(지금 MVP 범위 밖) 없이는 권장하지 않음.

### 목표

- Dashboard/Analysis/Financial이 "최근 1주/2주/한 달/3개월" 롤링 기간을 볼 수 있도록 매출/폐기 데이터를 주 단위(월+주차)로 저장·집계
- 기존 월 단위 이력은 그대로 보존(재계산·삭제 없음), 새 업로드부터 주 단위로 전환하는 **공존(coexistence) 모델**
- `patternService.ts`(요일/시간대 패턴)는 이번 전환과 무관, 손대지 않음

### Dashboard 재설계와의 관계

`docs/discussion.md` Discussion 8(2026-07-24)에서 이미 "Dashboard를 운영 브리핑(내일 운영 준비) 화면으로 재정의"하기로 결론 냈고, "최근 4주 판매 증가·폐기 감소 → 이번 주 발주 확대 검토" 같은 전략 제안이 주간 데이터로 가능하다고 판단했었음. **이번 주 단위 전환이 그 재설계의 전제조건**이다. 순서: 데이터 구조 전환(본 항목) → Dashboard 운영 브리핑 재설계(후속 별도 작업). 이번 항목의 "Dashboard 기간 선택"은 최소 기간 선택 UI 추가일 뿐, Discussion 8이 말하는 전면 재설계와는 다름 — 혼동 금지.

### 파일 형식 및 업로드 흐름

- 새 파일명: `sales_{MM}_w{N}_{category}.xlsx`, `waste_{MM}_w{N}_{category}.xlsx` (`{N}`=1~5, 기존 `weekday_sales`/`hourly_sales`/`weekly_waste`와 동일 컨벤션)
- 폐기: 새 파일을 받을지, 기존 `weekly_waste_{MM}_w{N}_{category}.xlsx`를 그대로 채택할지 결정 필요
- 판매: 사장님이 POS에서 "주" 단위로 조회·추출하도록 export 방식 변경 필요 (요일/시간대 리포트로 이미 검증된 방식)
- `backend/src/controllers/uploadController.ts` `createUploadHandler`: `month`(1~12)에 `week`(1~5) 파라미터 추가
- `backend/src/services/uploadAutomationService.ts`: `buildSalesWasteFilename`에 week 추가, `findMissingFiles(month)` → `findMissingFiles(month, week)`
- `frontend/src/pages/upload/UploadPage.tsx`: 월 드롭다운 옆 주차(1~5) 드롭다운 추가 — `data/scripts/pattern_parser.py:63`의 기존 주차 열거 로직(`for week_num in range(1, MAX_WEEKS_PER_MONTH + 1)`) 재사용
- 파일명에서 뽑은 `month`+`week`는 파싱 시점에 실제 달력 날짜(`period_start`/`period_end`)로 변환한다 (아래 "A. 날짜 기반 저장" 참고). 업로드 UI 자체는 여전히 월+주차 드롭다운으로 충분 — 사장님이 날짜를 직접 입력할 필요는 없음.

---

### 1. 반드시 반영 (Architecture Decision) — 2026-07-30 리뷰 반영

리뷰를 거쳐 아래 두 가지는 스타일 취향이 아니라 **정확성/확장성 문제**로 판단, 최초안에서 수정한다.

#### A. month+week 대신 날짜 기반(period_start/period_end) 저장

기존 계획: `month,week,category,...` 컬럼 구조.
**수정**: `period_start,period_end,category,...` (또는 `start_date,end_date`)로 저장. 주차(w1~w5)는 UI/파서가 계산해서 넣어주고, 저장은 날짜 범위로 한다.

이유: "최근 4주", "최근 28일", "지난 90일", "임의 기간" 전부 날짜 비교로 처리 가능해지고, 나중에 일 단위로 세분화돼도 스키마를 또 바꿀 필요가 없다.

- `data/scripts/sales_parser.py`, `waste_parser.py`: 파일명에서 뽑은 `month`+`week`를 실제 달력 날짜(해당 주의 시작일/종료일)로 변환해 `period_start`/`period_end`로 저장
- `data/scripts/master_dataset_builder.py`: `groupby(['period_start','period_end','category'])`로 변경
- `backend/src/types/financial.ts`, `CsvDataRepository.ts`, `financialService.ts`, `financialRoutes.ts`: `month`/`week` 대신 `period_start`/`period_end` 기준 필터링·조회로 변경

**미확정 사항 추가**: 주차(w1~w5)를 실제 날짜로 변환하는 규칙 정의 필요 — POS의 주차 기준 확인(매월 1일부터 7일 단위인지, ISO Week 기준인지 등). 이걸 확정해야 위 변환 로직을 구현할 수 있음.

#### B. ETL은 Fact만 생성, 비율 계산은 서비스 계층으로 이동

기존 계획: `master_dataset_builder.py`가 `avg_cost_rate`, `margin_rate`, `waste_rate`, `net_rate` 같은 파생 비율까지 계산해서 `merged_dataset.csv`에 저장.

**수정**: ETL은 `sales_qty`, `sales_amount`, `waste_qty`, `waste_amount` 같은 원시 합계(Fact)까지만 만들고, 비율 계산은 `financialService.ts`가 조회 시점에 한다.

**이유(중요, 반드시 문서에 남길 것)**: 비율은 집계 후 재계산해야 하며, 기간별 비율의 평균은 올바른 결과를 보장하지 않는다. 예를 들어 "최근 4주" margin_rate를 구할 때, 각 주차별로 미리 계산된 margin_rate 4개를 평균 내면 틀린 값이 나온다 — 4주치 sales_amount와 margin_amount를 각각 합산한 뒤 그 합계로 margin_rate를 다시 계산해야 정확하다. 이건 스타일이 아니라 **주 단위 롤링 집계를 도입하는 순간 발생하는 정확성 버그**라서 최초안(월+주 grain에서 비율까지 미리 계산)은 이 문제를 그대로 갖고 있었음 — 이번에 발견해서 수정.

---

### 2. 권장 사항 (Future Architecture, 지금 당장 구현 대상은 아님)

#### DashboardService 계층 추가

```
Dashboard → DashboardService → FinancialService → RecommendationService
```

Dashboard 전용 ViewModel(DTO)을 만드는 계층. 지금은 `recommendationRoutes.ts`가 `financialService`와 `RecommendationService`를 라우트 핸들러에서 직접 둘 다 import해서 조합하고 있음(계층 없음, 확인 완료) — Dashboard가 커질수록 이 조합 로직을 라우트 밖으로 빼는 게 좋음.

#### Data Timeline (데이터 기준 시각 표시)

Dashboard에 "기준 데이터: 2026-08-03 22:15 최근 업로드 완료" 같은 표시 추가. 실사용에서는 사용자가 지금 보는 숫자가 언제 기준인지 아는 게 중요함. (Upload 페이지 하단엔 "데이터 기준일"이 이미 있으나 Dashboard에는 없음.)

### 3. Optional (구현 직전에 다시 결정해도 됨)

- `grain: 'month' | 'week'` 공존 컬럼 외에, 스키마 자체의 버전을 표시하는 필드(`schema_version` 또는 `dataset_version`/`dataset_format`) 추가 검토 — 나중에 일 단위/POS API 연동으로 넘어갈 때 마이그레이션 경로가 명확해짐. CSV 기반이라는 점을 감안하면 `dataset_version`이 `schema_version`보다 더 적합할 수 있음. 이름/도입 여부는 구현 직전에 결정.

---

### 하위 호환 / 마이그레이션 (반드시 처리)

기존 1~7월 데이터는 월 전체 합산으로만 존재 — 주 단위로 소급 분할 불가(데이터 지어낼 수 없음, CLAUDE.md "raw data 직접 수정 금지"와도 배치).

**추천: 공존(coexistence) 모델, 소급 마이그레이션 금지**
- 기존 월 단위 행은 `grain: 'month'`로 표시하고 `period_start`=해당 월 1일, `period_end`=해당 월 말일로 채워 넣어 스키마 일관성만 맞춤 — 롤링 윈도우 계산 시 월/주 데이터가 섞여 잘못된 평균이 나오는 걸 막는 핵심 안전장치
- 전환 시점(cutover) 이후 업로드부터만 `grain: 'week'` 행 생성
- Dashboard "최근 N주"가 전환 이전 기간을 요청하면 조용히 잘못된 값 대신 "주 단위 데이터 없음, 월 데이터로 대체 표시" 같은 명시적 안내 필요

### 건드리지 않는 것

- `backend/src/services/patternService.ts`, `patternRoutes.ts`, `weekday_sales`/`hourly_sales` 파이프라인 — 이미 주 단위 패턴이고 구조가 다름(카테고리 단위 사전집계), 스코프 아님

### 구현 순서 (첫 출시 가능한 마일스톤 포함)

1. ETL 스크립트(`sales_parser.py`, `waste_parser.py`, `master_dataset_builder.py`) — 파일명 패턴/날짜 변환/groupby 키/공존 컬럼, 비율 계산 제거(Fact만 출력). 수작업 테스트 파일로 스크립트 단독 검증 먼저
2. 백엔드 스키마/조회 경로(`financial.ts`, `CsvDataRepository.ts`, `financialService.ts`, `financialRoutes.ts`) — `period_start`/`period_end` 읽기, 롤링 윈도우 필터 + 비율 재계산 로직. 수작업 fixture로 curl 검증 — **업로드 UI 없이도 독립 출시/테스트 가능한 첫 마일스톤**
3. 업로드 자동화/컨트롤러(`uploadAutomationService.ts`, `uploadController.ts`) — 주 단위 파일명, `findMissingFiles` 주 단위 완결성 체크
4. 업로드 UI(`UploadPage.tsx`) — 주차 드롭다운 추가
5. Dashboard 기간 선택 — 최근 1주/2주/한달/3개월, 전환 이전 구간 안내 UX

### 미확정 사항 (착수 전 확인 필요)

- **주차(w1~w5) → 실제 날짜 변환 규칙** (POS 주차 기준, ISO Week 여부, 매월 7일 단위 여부 등) — 위 "A. 날짜 기반 저장" 참고
- 폐기: 신규 파일 vs 기존 `weekly_waste_*` 채택 여부
- 전환 시점(cutover) 날짜
- 주 단위 업로드가 매주 1회씩인지, 몰아서 여러 주 한 번에인지 (`findMissingFiles` 설계에 영향)
- Dashboard 필터 없을 때 기본 동작 (예: MTD 기본값)
- 전환 이전 구간 정확한 UX 문구/동작
- `schema_version`/`dataset_version` 도입 여부 및 명칭 (Optional, 구현 직전 결정)

### 검증 방법

- 실제 POS에서 최근 2~3개 주차 x 4개 카테고리 x 판매/폐기(16개 파일) 테스트 데이터로 새 파일명 규칙 배치
- `sales_parser.py` → `waste_parser.py` → `master_dataset_builder.py` 순서 수동 실행, `merged_dataset.csv` 결과 눈으로 확인
- 백엔드 변경 후 `npx tsc --noEmit`, `month` 관련 코드 전체 grep으로 컴파일 에러 확인
- 프론트 변경 후 `npm run build` + `claude-in-chrome`으로 업로드→Dashboard 기간 선택 반영까지 브라우저 확인
- `patternService.ts` 기반 요일/시간대 차트 회귀 확인

### 관련 파일

`data/scripts/sales_parser.py`, `waste_parser.py`, `master_dataset_builder.py` · `data/raw/weekly_waste/` · `backend/src/types/financial.ts`, `repositories/CsvDataRepository.ts`, `services/financialService.ts`, `routes/financialRoutes.ts` · `backend/src/services/uploadAutomationService.ts`, `controllers/uploadController.ts` · `frontend/src/pages/upload/UploadPage.tsx`

---

## 신규 논의 (2026-07-30) — 멀티테넌시(다른 매장 사장님도 사용 가능하게) 검토

### 문제 인식

배포해서 다른 GS25 사장님들도 쓰게 하려면, 지금 구조로는 다들 우리 강남역점 데이터를 보게 됨 — 완전 싱글 테넌트.

### 현재 상태 (조사 완료, 2026-07-30)

- **인증/로그인: 전혀 없음.** backend/frontend 어디에도 auth/login/jwt/session 관련 코드 없음. `supabaseClient.ts`는 service role key(전권한, RLS 우회)만 사용, 요청별 사용자 컨텍스트 없음.
- **store_id/tenant_id/user_id 컬럼: 전혀 없음.** 전체 코드베이스 grep 결과 어디에도 없음(죽은 코드 포함).
- **Supabase 스키마** (SQL 마이그레이션 파일 자체가 없어 코드로만 추정): `uploads` 테이블(id/category/filename/status/uploaded_at), `master-dataset` Storage 버킷(merged_dataset.csv/sales.csv/waste.csv/weekday_sales.csv/hourly_sales.csv — 매장 구분 없는 flat 파일 1세트).
- **ETL 파이프라인(`data/scripts/`, 총 606줄)**: 5개 스크립트 전부 `data/raw/sales`, `data/master/sales.csv` 같은 하드코딩된 단일 경로 — store_id 세그먼트 없음. 606줄 규모라 파라미터화 자체는 "포함되지만 큰 리팩터링은 아닌" 수준.
- **백엔드 서비스**: `uploadAutomationService.ts`, `masterDataSyncService.ts` 전부 store 파라미터 없이 고정 파일 경로/Supabase 버킷 세트 사용. **`patternService.ts`는 싱글턴 클래스로 `weekdayData`/`hourlyData`를 인스턴스 필드(사실상 프로세스 전역 상태)로 캐싱** — 두 매장의 요청이 동시에 들어오면 서로의 캐시를 덮어써서 **멀티테넌시 없이는 그대로 깨짐**.
- **배포**: Render 백엔드 1개 + Vercel 프론트엔드 1개 + Supabase 프로젝트 1개, `VITE_API_BASE_URL`은 빌드 타임에 고정 — 매장별 배포 개념 자체가 없음.

### 방향 결정: 두 가지 옵션 비교

1. **매장별 별도 배포** — 매장마다 Render+Vercel+Supabase 프로젝트를 새로 만들어 완전 분리. 코드 변경 거의 없음(설정/배포 스크립트 정도), 데이터 물리적 분리로 안전. 단, 매장이 늘수록 배포/운영 부담이 매장 수만큼 증가 — "회원가입하면 바로 쓰는 서비스"가 아니라 "요청받으면 관리자가 수동 배포"에 가까움.
2. **진짜 멀티테넌트 SaaS** — 로그인 신규 구축 + DB/파일/캐시 전체에 store_id 관통 + 하나의 배포를 여러 매장이 공유. 인증 신규 구축, Supabase 스키마 변경, ETL 파이프라인(606줄) 전체 store_id 파라미터화, `PatternService` 등 싱글턴 캐시를 매장별로 분리하는 리팩터링 필요.

**결론(2026-07-30 논의)**: 여러 매장 사장님이 각자 가입해서 쓰는 걸 실제 목표로 한다면 **결국 2번(진짜 멀티테넌트 SaaS)으로 가야 함** — 1번은 매장 수만큼 운영 부담이 늘어 확장 안 됨. 시간 제약이 없는 지금이 처음부터 2번 방향으로 설계하기 좋은 시점.

### 이미 백로그에 있던 관련 항목과의 관계

P2 백로그의 "로그인/로그아웃 — Supabase 인증 연동" 항목이 사실상 이 멀티테넌시 작업의 1단계(인증)와 동일 — 별개 트랙이 아니라 그 항목의 확장판.

### 우선순위 (2026-07-30 논의 결론)

1. **주 단위(Weekly-grain) 데이터 전환** (위 항목) 먼저 — 이유: (a) 멀티테넌시는 결국 지금 스키마에 store_id만 얹는 구조라 먼저 스키마를 주 단위로 정리해두는 게 재작업이 적음, (b) 주 단위 전환은 지금 매장 자체에 바로 가치가 있지만 멀티테넌시는 다른 사장님이 실제로 쓸 때만 가치가 생김, (c) 범위/리스크가 더 작고 이미 구체적 계획이 나와 있음
2. 그 다음 Dashboard 운영 브리핑 재설계 (Discussion 8, 위 항목 참고)
3. 그 다음(시간 될 때) 멀티테넌시 — 인증 먼저 → DB에 store_id 추가 → 파일 기반 파이프라인을 매장별로 분리하는 순서로 단계적 진행 추천

### 미확정 사항

- 어디까지 멀티테넌시로 갈지(전체 셀프서비스 가입 vs 제한적 초대제)
- 인증 방식(Supabase Auth 활용 여력 있음 — 이미 Supabase 쓰는 중)
- ETL을 store_id로 파라미터화할지, 아예 DB 기반으로 전환할지

---

## Out of Scope (항상 제외, CLAUDE.md 준수)

- 머신러닝 기반 수요예측
- 자동 발주 기능
- POS 연동
- 실시간 재고 조회
- 발주 자동 실행
