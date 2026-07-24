# 매칭 조건 필터 + 점수 알고리즘 계획 (이슈 #43)

> 작성일: 2026-07-23 · 대상 이슈: [#43 매칭 조건 필터 + 점수 알고리즘 구현](https://github.com/syd348/hub/issues/43)

## 목표 (한 줄)

**온보딩 프로필(업종/지역/직원수/연매출/업력)과 지원금 조건을 비교해 실제로 필터링/가중치를
반영하고, `match` 점수를 조건 부합도 기반으로 계산한다.**

## 현재 상태 (전환 전)

- `server/src/db/subsidies-repo.ts:93` `match()`가 `_profile`을 언더스코어 prefix로 unused
  처리하고 정렬만 수행 — 구조화된 업종/지역 컬럼이 스키마에 없어서.
- `supabase/schema.sql`의 `subsidies` 테이블에는 업종/지역 컬럼이 아예 없음.
- 크롤러가 지금 버리고 있는 원본 필드 중 활용 후보를 발견함(2026-07-23, 실API 300건 샘플 조사):
  - **`pldirSportRealmLclasCodeNm`**(대분류: 경영/기술/금융/내수/수출/인력/기타/창업) — 이건
    "정책 지원분야" 분류다. **주의**: 신청자의 업종이 아니라 지원사업의 성격 분류라서
    `OnboardingProfile.industry`(신청자 업종)와 직접 매칭되지 않는다.
  - **`hashtags`** — 대분류 + 지역명(예: 서울/부산/경기) + 세부 키워드가 콤마로 섞인 문자열.
    `jrsdInsttNm`(관할기관 소재지)보다 지역 매칭에 더 정확해 보임 — 예: 관할기관이 중앙부처
    (과학기술정보통신부)인데 `hashtags`엔 실제 사업 대상 지역인 "부산"만 태그된 사례 확인.
  - **`trgetNm`**(지원대상 원문) — "중소기업"/"장애인기업" 등 카테고리성 표현이 일부 있으나
    자유 텍스트라 완전한 구조화는 아님.
- `OnboardingProfile.industry`(업종)에 정확히 대응하는 구조화 필드는 API에 없음 — `trgetNm`
  프리텍스트 파싱이 필요하거나, 이번 이슈 범위에서는 포기해야 할 수 있음.

> **2026-07-23 추가 발견**: bizinfo API는 **2026-07-01 전남광주통합특별시 출범**(광주광역시+
> 전라남도 통합)을 이미 반영해 `jrsdInsttNm`/`hashtags`에 "전남광주" 하나로만 태그한다(500건
> 조사, "광주"/"전남" 단독 토큰 0건). 그런데 온보딩 UI(`src/data/regions.ts`)는 아직 광주/전남을
> 분리한 옛 17개 체계였음 — **이번 이슈에서 바로 같이 수정**하기로 함(사용자 결정). 시/도 목록을
> `shared/src/regions.ts`(`REGIONS`, 16개)로 옮겨 온보딩 UI와 크롤러가 같은 목록을 참조하도록
> 통일함(구/군 매핑은 `src/data/regions.ts`에 그대로 유지, `전남광주` 키에 옛 광주 5개 구 + 옛
> 전남 22개 시/군 27개를 병합).

## 범위

### 포함 (이번 이슈)
- 스키마 확장 여부 결정 — **region 최소로 시작**, industry는 제한적 시도만
- region: `hashtags`에서 시/도 단위를 추출 → `subsidies.region` 컬럼 추가, `OnboardingProfile.region`과 비교
- match 점수: 조건 부합 항목 수 기반 가중치 계산 (region 일치 여부 등) — 완전 정밀 매칭이 아닌
  "가중치 기반" 초기 버전
- industry 매칭은 실험적 수준(`trgetNm` 키워드 매칭 시도)까지만 — 정확도가 낮으면 이번 이슈에서
  제외하고 그 사실을 완료 기준에 정직하게 기록

### 제외 (다음으로)
- 완전 정밀한 업종 코드 매칭 — API가 구조화 업종 코드를 안 줌 (별도 조사/설계 이슈가 필요할 수 있음)
- amount 기반 조건 매칭(예산 상한 비교) — [#44](https://github.com/syd348/hub/issues/44) 완료 후
  여지 있으면 검토
- Claude 기반 프로필-공고 의미 매칭 — 스코프 아님, 후순위

## 실행 순서

### 묶음 1 — region 추출 프로토타입 + 스키마 결정 (승인 필요) — **완료 (2026-07-23)**
- [x] `shared/src/regions.ts` 신설 — `REGIONS`(16개, 전남광주 통합 반영), `src/data/regions.ts`는
      재노출만 하도록 변경 (구/군 매핑은 그대로 유지)
- [x] `src/data/regions.ts` — 광주/전남을 `전남광주`로 병합, `DISTRICTS.전남광주`에 옛 광주 5개
      구 + 옛 전남 22개 시/군 27개 병합. 빌드(`npm run build:client`)·전체 테스트(46개) 통과
- [x] `crawler/src/mapper.ts`에 `extractRegions(hashtags)` 프로토타입 — 매칭된 지역을 그대로
      배열로 반환(개수로 분기 안 함: 전국 대상은 자연히 16개 전부 담김 → 호출부는 `.includes()`
      하나로 전국/광역권/단일 지역을 동일하게 처리 가능)
- [x] 정확도 샘플 확인 — 실API 500건 중 1~14개 태그 케이스 30건을 제목 대괄호(`[서울]` 등)와
      대조, 전부 일치. 지역 태그 개수 분포: 1개(64%)/16개 전국(33%)/2~14개 광역권(2.4%)
- [x] `subsidies.region` 컬럼 추가 결정 → **`text[]`** (배열, `not null default '{}'`) —
      2~14개 광역권 공고를 배열 그대로 저장하기로 한 결정과 일관되게 전국(16개)도 특수 sentinel
      없이 그대로 배열 저장. `supabase/schema.sql`에 `create table`과 기존 배포본용
      `alter table ... add column if not exists` 둘 다 반영

### 묶음 2 — 크롤러 매퍼에 region 반영 + 마이그레이션 — **완료 (2026-07-23)**
- [x] `crawler/src/mapper.ts`의 `mapAnnouncementToSubsidy`에서 `region: extractRegions(item.hashtags)` 연결
- [x] `server/src/db/mappers.ts`의 `SubsidyRow`/`rowToSubsidy`/`subsidyToRow`, `crawler/src/upsert.ts`의
      중복 `SubsidyRow`에도 `region` 반영
- [x] `shared/src/types/subsidy.ts`의 `Subsidy`에 `region: string[]` 필드 추가 (필수 필드로 결정 —
      샘플 데이터(`sample-subsidies.ts`/`mockSubsidies.ts`)도 서울 2건(`['서울']`)/전국 6건
      (`REGIONS` 전체) 기준으로 채움)
- [x] Supabase에 `alter table ... add column if not exists region text[]` 실행(사용자가 대시보드에서
      직접 실행, `.env`엔 REST API 키만 있어 DDL은 supabase-js로 불가) + 1500건 backfill 재실행
- [x] 검증 — `GET /api/subsidies` 1500건 기준 region 분포: 단일 지역 994건(66.3%), 15~16개(전국형)
      477건(31.8%), 2~14개(광역권) 28건(1.9%), 0개(정보없음) 1건. 500건 샘플 비율과 일관됨

### 묶음 3 — `match()` 조건 반영 + 점수 계산 — **완료 (2026-07-23)**
- [x] `server/src/db/subsidies-repo.ts`에 `scoreForProfile()` 추가 — `profile.region`이
      `subsidy.region` 배열에 포함되면 +20(cap 100), 안 맞으면 -20(floor 0), `region`이 빈
      배열(정보 없음)이면 기존 점수 유지. `match()`가 `loadAll()` 결과에 이 점수를 반영한 뒤
      정렬하도록 변경 (`_profile` unused prefix 제거)
- [x] industry 매칭 실험 — 실크롤링 1500건의 `qualifications`(=`trgetNm`) 텍스트에서 온보딩
      업종 6종(음식점/카페·베이커리/소매·유통/서비스업/제조업 등) 키워드를 검색한 결과
      **3/1500(0.2%)만 매칭** → 신뢰할 수 없다고 판단해 반영하지 않음. bizinfo API가 신청자
      업종 구조화 필드를 안 주고, `trgetNm`도 지역/기업규모 위주 자유 텍스트라서 (한계를
      `match()` 주석과 이 문서에 기록)
- [x] 샘플 8건 — `region` 필드는 묶음 2에서 이미 채움(서울 2건, 전국 6건), `npm run db:seed`로
      Supabase에 재반영

### 묶음 4 — 테스트/검증 — **완료 (2026-07-23)**
- [x] `server/src/db/subsidies-repo.test.ts` 신설 — `scoreForProfile`/`match()` 케이스 6건(가점/
      감점/정보없음 유지/cap 100/floor 0/정렬 순서)
- [x] `npm test`(60/60) / `npm run lint` / `npm run build -w @hub/server` 전부 통과
- [x] `POST /api/match` 수동 curl 검증 — 서울 프로필 vs 경남 프로필 vs 경북 프로필 비교, 지역
      일치 항목이 프로필별로 다르게 상위 정렬됨을 확인 (예: "[경북] 구미 방산혁신클러스터"가
      경북 프로필에선 70점, 서울/경남 프로필에선 30점)

## 완료 기준 — **전체 완료 (2026-07-23)**

- [x] region 조건에 맞는 지원금이 실제로 다르게 정렬/필터링된다
- [x] `match` 점수가 고정 50이 아니라 조건 부합도로 계산되어 프로필에 따라 달라진다
- [x] industry 매칭은 시도 결과와 한계를 문서로 남긴다 — 실크롤링 0.2% 매칭으로 신뢰 불가 판단,
      반영하지 않고 이유를 `match()` 주석 + 이 문서에 기록

## 리스크 / 결정 필요

| 항목 | 내용 | 제안 방침 |
|------|------|-----------|
| industry 매칭 불가 | API에 신청자 업종을 나타내는 구조화 필드가 없음 (`pldirSportRealmLclasCodeNm`은 정책분야 분류라 다른 개념) | 이번 이슈는 region 위주로 좁히고, industry는 `trgetNm` 키워드 매칭 실험까지만 시도 후 정확도 낮으면 후속 이슈로 이관 |
| 필터 vs 가중치 | 조건이 안 맞으면 아예 숨길지, 점수만 낮출지 | 가중치(점수 조정) 우선 — 완전 필터링하면 사용자가 "왜 안 보이지" 혼란 가능성. MVP는 정렬 우선순위 조정으로 시작 |
| 스키마 마이그레이션 범위 | 기존 1500+8건 전부 region을 채워야 함 | 크롤러 backfill 재실행으로 해결, 샘플 8건은 수동으로 region 채움 |
| `hashtags` 파싱 안정성 | API가 `hashtags` 포맷을 문서로 보장하지 않음 | 정규식보다 `shared/src/regions.ts`의 16개 시/도 화이트리스트 `Set.has()` 방식으로 안전하게 매칭 (검증 완료 — 500건 중 오탐 0건) |

## 다음 이슈 (참고)

- **#44**: amount 등 구조화 추출 — 별도 문서 [issue-44-amount-extraction-plan.md](issue-44-amount-extraction-plan.md)
  (서로 의존성 없어 병행 진행 가능)
