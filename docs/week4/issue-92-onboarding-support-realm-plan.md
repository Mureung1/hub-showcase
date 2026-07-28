# 오늘 할 일 — 온보딩 지원분야 질문 도입 (이슈 #92)

> 작성일: 2026-07-28 (화) · 대상 이슈: [#92 지원분야 조건 온보딩 반영 + scoreForProfile/match 배선](https://github.com/syd348/hub/issues/92)
> 선행 이슈: [#91 온보딩 지원분야 질문 추가 여부 UX 결정](https://github.com/syd348/hub/issues/91) — 아래 "UX 결정 내역"이 그 결정 결과

## 오늘의 목표 (한 줄)

온보딩 step1(업종 질문)을 지원분야(수출/기술/경영/내수/창업/인력/금융) 복수선택 질문으로
완전히 교체하고, 선택 결과를 `scoreForProfile`/`match`에 hard filter로 반영한다.

## UX 결정 내역 (사용자 확정, 2026-07-28)

| 결정 항목 | 결과 |
|---|---|
| 온보딩 구조 | step1(업종)을 지원분야 질문으로 **교체**(4스텝 유지, 5번째 스텝 추가 아님) |
| 필드명 | `OnboardingProfile.industry` → `supportRealm`으로 **완전히 교체**(이름도 값도) |
| 선택 방식 | **복수선택** — 여러 분야를 동시에 고를 수 있음 |
| 매칭 반영 | **Hard filter** — `profile.supportRealm`과 안 맞는 지원금은 결과에서 제외(region과 동일 방식) |

## 현재 상태 (전환 전) — 실제 참조 지점 전수 조사

`grep`으로 `profile.industry`/`INDUSTRY_OPTIONS`/`Step1Industry` 전체 참조를 확인함:

- `shared/src/types/subsidy.ts`: `OnboardingProfile.industry: string`
- `src/context/OnboardingContext.tsx`: `EMPTY_PROFILE.industry: ''`
- `src/data/onboardingSteps.ts`: `INDUSTRY_OPTIONS`(6개, "기타" 자유입력 포함), `STEP_META[1].field: 'industry'`
- `src/components/onboarding/Step1Industry.tsx`: 단일선택 + "기타" 커스텀 텍스트 입력 컴포넌트
- `src/pages/OnboardingStep.tsx`: `Step1Industry`/`isStep1Complete` 참조
- `src/pages/CompleteScreen.tsx`: 요약 화면에 `profile.industry` 표시
- `src/pages/HomeScreen.tsx`: 홈 헤더 프로필 텍스트에 `profile.industry` 표시
- `src/api/client.ts`: `getSubsidy()`가 상세 매칭도 재계산용으로 `region`+`industry` 쿼리스트링 전달(이슈 #61)
- `server/src/routes/match.ts`: `profileSchema`의 `industry: z.string()`
- `server/src/routes/subsidies.ts`: `detailProfileSchema`의 `industry: z.string()` (상세 페이지 매칭도 재계산용)
- `server/src/db/mappers.ts`: `MatchRequestRow.industry`, `profileToMatchRequestRow`
- `server/src/db/subsidies-repo.ts`: `scoreForProfile`의 `INDUSTRY_MATCH_BONUS` 가점 로직, `ScoringProfile` 타입
- `supabase/schema.sql`: `match_requests.industry text not null`

### ⚠️ 전제 재확인 — `Subsidy.industry`(크롤러 추출 업종)는 별개 필드, 건드리지 않음

`Subsidy.industry: string[]`(크롤러가 `bsnsSumryCn`/`trgetNm`에서 키워드로 추출한 값, 이슈 #52)는
**`OnboardingProfile.industry`와 이름만 같은 완전히 다른 필드**다. 이번 작업은
`OnboardingProfile.industry`만 `supportRealm`으로 바꾸고, `Subsidy.industry`(크롤러/스키마/
`crawler/src/mapper.ts`의 `extractIndustry`)는 그대로 둔다.

**부작용 인지**: `scoreForProfile`에서 `profile.industry`를 제거하면 `subsidy.industry.includes(...)`
가점 로직도 같이 제거되므로, **`Subsidy.industry` 필드는 이제 매칭에 전혀 안 쓰이는 정보성
데이터가 된다**(카드에 직접 노출하는 곳도 없음 — 현재는 내부 데이터로만 존재). 이슈 #52 추출
파이프라인 자체를 걷어내는 건 훨씬 큰 별개 작업이라 이번 범위에 넣지 않고, 필요해지면 후속
이슈로 분리한다.

## 범위

### 포함 (오늘)

**Shared**
- `shared/src/types/subsidy.ts`: `OnboardingProfile.industry: string` → `supportRealm: string[]`

**클라이언트**
- `src/data/onboardingSteps.ts`: `INDUSTRY_OPTIONS` → `SUPPORT_REALM_OPTIONS`(7개: 수출/기술/
  경영/내수/창업/인력/금융, "기타" 자유입력 없음 — 고정 분류라 자유 텍스트가 안 맞음),
  `STEP_META[1]` 질문 문구를 "어떤 분야의\n지원이 필요하세요?"로, `field: 'supportRealm'`
- `src/components/onboarding/Step1Industry.tsx` → `Step1SupportRealm.tsx`로 교체 —
  단일선택(라디오처럼 교체)이 아니라 **복수선택(토글)**으로 동작, "기타" 커스텀 입력 제거
- `src/pages/OnboardingStep.tsx`: `Step1Industry` → `Step1SupportRealm` 참조 교체,
  `isStep1Complete` 시그니처를 `string[]` 기준으로
- `src/pages/CompleteScreen.tsx`: "업종" 라벨 → "지원분야", 값은 `profile.supportRealm.join(', ')`
- `src/pages/HomeScreen.tsx`: 헤더 프로필 텍스트의 `profile.industry || '내 업종'` →
  `profile.supportRealm.join(', ') || '관심 분야'`
- `src/api/client.ts`: `getSubsidy()` 쿼리스트링 `industry` → `supportRealm`(콤마 join)

**서버**
- `server/src/routes/match.ts`: `profileSchema.industry` → `supportRealm: z.array(z.string()).min(1)`
- `server/src/routes/subsidies.ts`: `detailProfileSchema.industry` → `supportRealm`(콤마 문자열
  → 배열로 파싱, region과 마찬가지로 상세 페이지 매칭도 재계산 fallback 경로)
- `server/src/db/mappers.ts`: `MatchRequestRow.industry` → `support_realm: string[]`,
  `profileToMatchRequestRow` 반영
- `server/src/db/subsidies-repo.ts`:
  - `ScoringProfile` 타입에서 `industry` 제거, `supportRealm: string[]` 추가
  - `INDUSTRY_MATCH_BONUS`/`subsidy.industry.includes(profile.industry)` 가점 로직 제거
  - `matchesSupportRealm(subsidy, profile)` hard filter 추가(`matchesRegion`과 동일 패턴,
    `match()`에서 `matchesRegion`과 나란히 적용) — `profile.supportRealm.length === 0 ||
    profile.supportRealm.includes(subsidy.supportRealm)`(빈 배열은 방어적으로 "필터 없음"
    취급 — zod가 `min(1)`로 막아서 실제로는 안 생기지만 repo 함수 자체의 안전한 기본값)
- `supabase/schema.sql`: `match_requests`에 `support_realm text[] not null default '{}'` 컬럼
  추가(기존 `industry` 컬럼은 이 프로젝트의 기존 관례대로 **드롭하지 않고 그대로 둠** — #43/#52/
  #67/#77/#82/#84/#87/#90 전부 컬럼 추가만 하고 삭제한 적 없음, 같은 원칙 유지)

**테스트**
- 위 변경으로 깨지는 모든 테스트 픽스처(`match.test.ts`, `subsidies.test.ts`,
  `subsidies-repo.test.ts`, `Step1SupportRealm` 관련 클라이언트 테스트 있으면) 갱신
- `matchesSupportRealm`/hard filter 신규 테스트 케이스 추가(region의 `matchesRegion` 테스트
  패턴 참고)

### 제외 (오늘 아님)

- `Subsidy.industry`(크롤러 추출 업종) 파이프라인 제거 — 매칭에 안 쓰이는 정보성 데이터로
  남겨두고, 필요해지면 후속 이슈로 분리(위 "전제 재확인" 참고)
- `match_requests.industry` 컬럼 드롭 — 관례대로 유지

## 실행 순서

### 묶음 1 — Shared 타입 + 온보딩 데이터 (~15분)
- [ ] `shared/src/types/subsidy.ts`: `supportRealm: string[]`로 교체
- [ ] `src/data/onboardingSteps.ts`: `SUPPORT_REALM_OPTIONS` 추가, `STEP_META[1]` 갱신

### 묶음 2 — 온보딩 UI 컴포넌트 (~20분)
- [ ] `Step1SupportRealm.tsx` 신규(복수선택 토글) + 기존 `Step1Industry.tsx` 삭제
- [ ] `OnboardingStep.tsx`/`OnboardingContext.tsx` 참조 갱신
- [ ] `CompleteScreen.tsx`/`HomeScreen.tsx` 표시 문구 갱신
- [ ] `api/client.ts` 쿼리스트링 갱신

### 묶음 3 — 서버 라우트/매퍼/스키마 (~20분)
- [ ] `match.ts`/`subsidies.ts` zod 스키마 교체
- [ ] `mappers.ts` `MatchRequestRow` + 변환 함수 교체
- [ ] `schema.sql`에 `support_realm` 컬럼 추가

### 묶음 4 — 스코어링 로직 (~15분)
- [ ] `subsidies-repo.ts`: `ScoringProfile`/`scoreForProfile`/`matchesSupportRealm`/`match()` 반영

### 묶음 5 — 테스트 전수 갱신 + 검증 (~25분)
- [ ] 깨지는 테스트 전부 갱신 + `matchesSupportRealm` 신규 테스트
- [ ] `npm test` / `npm run lint` / `npm run build`(server+client) / `npm run build -w @hub/crawler`

## 완료 기준

- [ ] 온보딩 step1에서 지원분야를 복수선택할 수 있고, 완료 화면/홈 화면에 정상 표시됨
- [ ] `POST /api/match` 요청이 `supportRealm: string[]`을 받아 hard filter로 반영
- [ ] `GET /api/subsidies/:id`의 상세 매칭도 재계산도 동일하게 반영
- [ ] `Subsidy.industry`(크롤러 필드)는 변경 없이 그대로 유지됨
- [ ] `npm test` / `npm run lint` / 전체 빌드 통과

## 오늘 끝나면 다음 (참고)

- `Subsidy.industry` 추출 파이프라인(이슈 #52)이 매칭에 더 이상 안 쓰이는 상태 — 완전히
  걷어낼지, 카드에 정보성으로라도 노출할지는 후속 결정 필요
- K-Startup(#94, PR #97)의 `supportRealm` 번역표도 이 hard filter의 영향을 받음 — 번역표
  정확도가 낮으면 K-Startup 공고가 부당하게 필터링될 수 있어 운영 데이터로 지켜봐야 함
