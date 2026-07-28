# 오늘 할 일 — 지원분야(pldirSportRealmLclasCodeNm) 필터 신설 (이슈 #90)

> 작성일: 2026-07-28 (화) · 대상 이슈: [#90 지원분야(pldirSportRealmLclasCodeNm) 필터 신설 — 업종 대신 실질 필터 축 추가](https://github.com/syd348/hub/issues/90)

## 오늘의 목표 (한 줄)

bizinfo API가 이미 100% 커버리지로 제공하는 지원분야 대/중분류를 크롤러→DB→API 파이프라인
전체에 통과시켜, 커버리지가 낮은 `industry`(6.6%)를 보완할 새 데이터 축을 확보한다.

## 현재 상태 (전환 전) — 전제 재확인 결과

- `BizinfoAnnouncement`(`crawler/src/bizinfo-client.ts:21-22`)엔 `pldirSportRealmLclasCodeNm`
  (필수 필드)/`pldirSportRealmMlsfcCodeNm`(옵션)가 이미 타입에 있지만, `mapper.ts`가 이 값을
  읽지 않고 버림 — 이슈 본문 전제와 일치.
- **실측 재확인(2026-07-28, 실 API 300건 샘플)**: `pldirSportRealmLclasCodeNm` 대분류는
  8개 고정값(수출 27.7%/기술 24.7%/경영 19.0%/내수 14.0%/창업 6.3%/인력 5.3%/금융 2.3%/
  기타 0.7%)이고 **결측 0%** — 이슈 본문의 "거의 100%" 추정보다 실제로 더 좋음(완전 커버리지).
  중분류(`MlsfcCodeNm`)도 300건 전부 값이 있었고 15개 이상의 세부값으로 나뉨(예: 기술사업화/
  이전/지도 18.7%, 디자인/상품화/사업화 11.7%, 해외진출 11.3% 등).
- `region`/`industry`는 `Subsidy`(`shared/src/types/subsidy.ts`) → `supabase/schema.sql`
  (text[] 컬럼) → `server/src/db/mappers.ts`(row ↔ 앱 타입) → `subsidies-repo.ts`의
  `scoreForProfile`/`match`까지 전 구간에 배선돼 있어, 이번 작업은 그 패턴을 그대로 따라간다.
- **범위 재조정이 필요한 지점 발견**: 이슈 완료 기준 2번째 항목("scoreForProfile/match에
  반영")은 `OnboardingProfile`에 지원분야에 대응하는 프로필 필드가 있다는 전제인데, 실제로는
  없다(`industry`/`region`/`district`/`employees`/`revenue`/`creditScore`/`businessYears`
  뿐). `employees`/`revenue`(이슈 #67)는 온보딩에 이미 있던 필드를 재사용해 스코어링만
  추가한 사례였지만, 지원분야는 온보딩 자체에 대응 질문이 없다 — 그런데 이슈 본문 "범위 외"엔
  "온보딩 step1 교체 여부는 별도 UX 결정, 이 이슈 범위 아님"이라고 명시돼 있어 **완료
  기준과 범위 외 항목이 서로 충돌**한다. 아래 "범위"에서 이 충돌을 어떻게 풀지 반영함.

## 범위

### 포함 (오늘)

- `crawler/src/mapper.ts`: `pldirSportRealmLclasCodeNm`(+ `MlsfcCodeNm`) 추출해
  `Subsidy`에 매핑 (`region`/`industry` 필드 배선과 동일 패턴)
- `shared/src/types/subsidy.ts`: `Subsidy`에 `supportRealm`(대분류) / `supportRealmDetail`
  (중분류, optional) 필드 추가
- `supabase/schema.sql`: `subsidies` 테이블에 `support_realm text`, `support_realm_detail
  text` 컬럼 추가 (`alter table ... add column if not exists` 패턴 유지)
- `server/src/db/mappers.ts`: row ↔ 앱 타입 변환에 두 필드 추가
- **스코어링(hard filter/soft score) 배선은 이번 이슈에서 하지 않는다** — 매칭 대상이 될
  온보딩 프로필 필드가 없어서 지금 배선해도 항상 무동작이 됨. 대신 `scoreForProfile`/`match`
  주석에 "온보딩에 지원분야 질문이 추가되면 이 자리에 배선" 한 줄만 남겨 다음 이슈가 바로
  이어받게 한다.
- `npm test` / `npm run lint` 통과

### 제외 (오늘 아님)

- 온보딩 step1(지원분야 질문 추가/업종 대체 여부) UX 결정 — 별도 이슈로 분리 (이슈 #90 본문
  "범위 외"와 동일 결론, 이번 계획에서 재확인만 함)
- 위 UX 결정이 나기 전까지의 실제 스코어링(hard filter vs soft score) 로직 구현 — 결정 이후
  후속 이슈에서 진행
- K-Startup/소상공인24의 지원분야 대응 필드 조사 — 이슈 #80 범위

## 실행 순서

### 묶음 1 — 크롤러: 지원분야 추출 (~20분)
- [ ] `mapper.ts`에 지원분야 대/중분류 추출 함수 추가 (region/industry 옆에 나란히)
- [ ] `mapAnnouncementToSubsidy`에서 새 필드 채우기

### 묶음 2 — 공유 타입 + DB 스키마 (~15분)
- [ ] `shared/src/types/subsidy.ts`에 `supportRealm`/`supportRealmDetail` 추가 + 주석
- [ ] `supabase/schema.sql`에 컬럼 추가(alter 문 포함)

### 묶음 3 — 서버 매퍼 + 배선 자리 표시 (~15분)
- [ ] `server/src/db/mappers.ts` row ↔ Subsidy 변환에 반영
- [ ] `subsidies-repo.ts`에 "다음 이슈에서 배선" 주석만 추가 (실제 스코어링 로직 없음)

### 묶음 4 — 검증 (~10분)
- [ ] `npm run build -w @hub/server`
- [ ] `npm test`
- [ ] `npm run lint`

## 완료 기준

- [ ] 지원분야 대/중분류가 mapper → shared → schema → server mappers까지 끊김 없이 흐름
- [ ] `npm test` / `npm run lint` 통과
- [ ] 스코어링은 온보딩 UX 결정 후 별도 이슈로 넘긴다는 점이 이슈/문서에 명시됨

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| 완료 기준 vs 범위 외 충돌 | 이슈 본문이 "scoreForProfile 반영"과 "온보딩 변경은 범위 외"를 동시에 요구 | 데이터 파이프라인만 오늘 완료, 스코어링은 온보딩 결정 후 별도 이슈로 분리(위 범위 참고) — 사용자 확인 필요 |
| hard filter vs soft score | 대분류 결측 0%로 region(98%)보다도 커버리지가 좋아 hard filter도 가능해 보이지만, 온보딩 질문이 아직 없어 지금은 결정 불필요 | 온보딩 질문 추가 이슈에서 실제 사용자 의도(원하는 지원분야 1개 vs 복수 선택)를 보고 결정 |
| 컬럼명(`support_realm` vs `pldir_sport_realm`) | 원문 필드명은 bizinfo 고유 축약어라 가독성이 떨어짐 | 앱 전역에서 쓰는 이름은 `supportRealm`으로 통일(다른 컬럼도 원문 그대로 안 쓰고 의미 기반 네이밍 — 예: `region`, `industry`) |

## 오늘 끝나면 다음 (참고)

- [#91](https://github.com/syd348/hub/issues/91) — 온보딩 지원분야 질문 추가 여부 UX 결정
- [#92](https://github.com/syd348/hub/issues/92) — #91 결정 이후 온보딩 반영 +
  `scoreForProfile`/`match` 배선 (#91 선행 필요)
