# industry 매칭 고도화 (이슈 #52)

> 작성일: 2026-07-25 (금) · 대상 이슈: [#52 industry 매칭 고도화 — bsnsSumryCn 기반 확장 키워드](https://github.com/syd348/hub/issues/52)

## 목표 (한 줄)

**크롤러가 `bsnsSumryCn`(사업개요 본문)에서 업종 태그를 추출해 `subsidies.industry` 컬럼에 저장하고, region과 동일한 패턴(가점만, 정보 없으면 중립)으로 매칭 점수에 반영한다.**

## 현재 상태 (전환 전)

- [#43](https://github.com/syd348/hub/issues/43)에서 `trgetNm`(짧은 텍스트)에 온보딩 업종명을 그대로 검색해 1500건 중 0.2%(3건)만 매칭 → 반영 보류 결정 (`docs/week3/issue-43-match-plan.md`)
- `server/src/db/subsidies-repo.ts`의 `match()`는 region만 `scoreForProfile`로 반영, industry는 주석으로 한계만 기록
- `subsidies` 테이블에 industry 관련 컬럼 없음
- 온보딩 업종 옵션(`src/data/onboardingSteps.ts`의 `INDUSTRY_OPTIONS`): 음식점 / 카페·베이커리 / 소매·유통 / 서비스업 / 제조업 / 기타(직접 입력)

## 새로 확인한 것

> 작성 시점(2026-07-25) 최초 조사는 300건 표본으로 9.3%(28/300, 오탐 미제거) 추정이었으나,
> 묶음 1에서 500건으로 재검증하며 오탐 2종을 제거한 최종 수치는 아래와 같다.

`bsnsSumryCn`까지 포함하고 동의어로 넓힌 뒤, 원문 대조로 오탐 2종(제과→제과점, "~업 제외" 부정 문맥)을 제거한 결과 **6.6%(33/500)** 매칭 — [#43](https://github.com/syd348/hub/issues/43)의 trgetNm 전용 매칭(0.2%)보다는 크게 개선됐지만, region(#43, 원문 대조 30건 오탐 0건, 커버리지 ~98%)보다는 여전히 낮은 신뢰도. 상세는 아래 "실행 순서 묶음 1" 참고.

## 범위

### 포함 (이번 이슈)
- `crawler/src/mapper.ts`에 `extractIndustry(bsnsSumryCn, trgetNm)` 추가 — 확장 키워드 사전으로 업종 태그 추출
- `subsidies.industry text[]` 컬럼 추가 (region과 동일 패턴: `not null default '{}'`)
- `shared/src/types/subsidy.ts`의 `Subsidy`에 `industry: string[]` 필드 추가
- `server/src/db/mappers.ts` / `crawler/src/upsert.ts`의 `SubsidyRow` 반영
- 기존 수집 데이터 backfill 재실행
- `scoreForProfile()`에 industry 가점 반영 — **가점만, 페널티 없음** (region과 다른 정책 — 아래 리스크 표 참고)

### 제외 (다음으로)
- 완전 정밀한 업종 코드 매칭 — API가 구조화 업종 필드를 안 줌, 키워드 기반 근사치 한계는 유지
- `기타`(직접 입력) 카테고리 추출 — 자유 텍스트라 매칭 대상에서 제외, 항상 중립 처리

## 실행 순서

### 묶음 1 — 키워드 사전 설계 + 정확도 검증 (승인 필요) — **완료 (2026-07-25)**
- [x] `crawler/src/mapper.ts`에 업종별 확장 키워드 사전 정의 (온보딩 5개 카테고리, `기타` 제외):
      - 음식점: 음식점, 외식업, 요식업, 식당
      - 카페·베이커리: 카페, 베이커리, **제과점**(당초 `제과` 제안이었으나 오탐 발견해 변경), 커피
      - 소매·유통: 도소매, 유통업, 소매업
      - 서비스업: 서비스업
      - 제조업: 제조업, 제조업체
      (`src/data/onboardingSteps.ts`의 `INDUSTRY_OPTIONS` 값과 정확히 일치해야 매칭이 동작 — 주석으로 동기화 필요성 명시함)
- [x] `extractIndustry(bsnsSumryCn, trgetNm)` 구현 — 두 텍스트를 합쳐 키워드 검색, 매칭된 카테고리를 배열로 반환 (여러 개 매칭 가능), "제외" 근접 문맥은 제외하는 가드 추가
- [x] 실 API 표본(500건)에서 매칭된 건을 원문과 대조해 오탐 2종 발견·수정:
      - `제과`가 "경제과학진흥원" 같은 무관한 단어에 substring으로 우연히 포함되던 문제 → `제과점`으로 좁혀 해결
      - "유통업체 제외"처럼 부정 문맥에서 오매칭되던 문제 → 매칭 키워드 뒤 20자 이내 "제외" 존재 시 제외하는 가드로 해결
      - 수정 후 최종 매칭률: **6.6%(33/500)** — 최초 추정치(9.3%, 오탐 미제거)보다 낮아졌지만 검증된 수치. region(#43, ~98% 커버리지)보다는 여전히 낮음
- [x] `mapper.test.ts`에 `extractIndustry` 단위 테스트 8건 추가 (카테고리별 매칭, 복수 매칭, 오탐 방지 2종, trgetNm 검색, 매칭 없음)

### 묶음 2 — 스키마 + 배관 (승인 필요) — **완료 (2026-07-25)**
- [x] `supabase/schema.sql`에 `industry text[] not null default '{}'` 컬럼 추가 (create table + alter table 둘 다, region 패턴 동일)
- [x] `shared/src/types/subsidy.ts` `Subsidy.industry: string[]` 추가
- [x] `server/src/db/mappers.ts`(`SubsidyRow`/`rowToSubsidy`/`subsidyToRow`), `crawler/src/upsert.ts`의 중복 `SubsidyRow`에 반영
- [x] `crawler/src/mapper.ts`의 `mapAnnouncementToSubsidy`에서 `industry: extractIndustry(...)` 연결 + 통합 테스트 추가
- [x] 샘플 데이터(`sample-subsidies.ts`/`mockSubsidies.ts`) 8건에도 industry 채움 (4번 "스마트오더 시스템 지원"만 `['음식점','카페·베이커리']`, 나머지는 빈 배열)
- [x] Supabase 컬럼 추가 실행(대시보드, 사용자 2026-07-25) + backfill 재실행(`npm run backfill -w @hub/crawler`, 1468건 upsert) → 매칭 비율 실측: **1554건 중 143건(9.2%)** — 500건 표본(6.6%) 대비 비슷한 범위 (제조업 111 / 음식점 25 / 서비스업 18 / 소매·유통 17 / 카페·베이커리 7)

### 묶음 3 — 매칭 점수 반영 + 검증 — **완료 (2026-07-25)**
- [x] `subsidies-repo.ts`에 industry 가점 로직 추가 — `profile.industry`가 `subsidy.industry` 배열에 포함되면 +10(cap 100), 그 외에는 **중립 유지(페널티 없음)**. region 가점/감점 적용 후 industry 가점을 추가로 얹는 방식
- [x] `subsidies-repo.test.ts`에 industry 케이스 5건 추가 (가점/중립/정보없음/region+industry 동시 적용/cap 100)
- [x] `npm test`(84/84) / `npm run lint` / `npm run build -w @hub/server` 전부 통과
- [x] 실DB 검증 — `subsidies-repo.ts`의 `match()`를 직접 호출(`tsx`), 동일 지역(경북) 프로필에서 업종만 제조업/음식점으로 바꿔 비교. 대상 공고(`PBLN_000000000124586`, industry: 제조업)가 제조업 프로필에서 80점, 음식점 프로필에서 70점 — 설계한 +10 가점이 정확히 반영됨 확인

## 완료 기준

- [x] 업종 키워드 매칭 정확도가 원문 대조로 검증된다 (오탐률 기록) — 500건 대조, 오탐 2종 발견·수정 후 6.6%
- [x] `subsidies.industry`가 채워지고 실제 DB 조회로 확인된다 — backfill 후 1554건 중 143건(9.2%) 채워짐
- [x] `match` 점수가 industry 일치 여부에 따라 달라진다 (프로필별 비교로 확인) — 동일 공고가 제조업 프로필 80점 vs 음식점 프로필 70점
- [x] 여전히 낮은 커버리지(9.2%)라는 한계가 문서에 명시된다

## 리스크 / 결정 필요

| 항목 | 내용 | 제안 방침 |
|------|------|-----------|
| 페널티 적용 여부 | region은 불일치 시 -20 페널티, industry도 동일하게 할지 | **페널티 없음으로 확정** — 묶음 1 검증 결과 오탐 2종을 고쳤어도 커버리지가 6.6%로 낮고, region(오탐 0건/30건, ~98% 커버리지)만큼 신뢰도가 높지 않다고 판단해 이번 이슈에서는 가점만 적용. 페널티 추가는 후속 이슈로 보류 |
| 가점 크기 | region은 +20 | 신뢰도가 region보다 낮으므로 **+10으로 낮춰 시작** — 실사용 데이터로 이상하면 조정 |
| 키워드 사전 위치 | `crawler/mapper.ts`에 로컬 정의 vs `shared/`로 이동 | 카테고리 목록이 자주 안 바뀌는 5개 고정값이라 **로컬 정의로 시작**. `INDUSTRY_OPTIONS`(client)와 값이 어긋나면(과거 region의 전남광주 사례처럼) 매칭이 조용히 실패하므로 주석으로 동기화 경고만 남기고, 실제 드리프트가 발생하면 그때 `shared/src/industries.ts`로 승격 |
| 커버리지 한계 | 9.3%도 여전히 낮음 | region처럼 필터링이 아니라 가점 방식이라 나머지 90%는 그냥 중립 — 사용자에게 "안 보임" 문제 없음. 완료 기준에 한계를 정직하게 기록 |

## 이번에 끝나면 다음 (참고)

- 페널티 적용 여부는 묶음 1 정확도 검증 결과에 따라 재논의
- 업력(#51) 조건도 같은 패턴(크롤러 추출 → 구조화 컬럼 → 가점)으로 확장 가능 — 후속 이슈 후보
