# 업력(연차) 필드 온보딩 UI 추가 (이슈 #51)

> 작성일: 2026-07-25 (금) · 대상 이슈: [#51 업력(연차) 필드 온보딩 UI 추가](https://github.com/syd348/hub/issues/51)

## 목표 (한 줄)

**Step4(사업 규모)에 업력 select 필드를 추가해, 4스텝 온보딩을 유지하면서 `docs/plan.md` 기획서의 필수 입력 조건(업종/지역/업력/직원수)을 채운다.**

## 현재 상태 (전환 전)

- `shared/src/types/subsidy.ts`의 `OnboardingProfile.businessYears?: string` — 타입은 이미 있음
- `server/src/routes/match.ts:16` zod 검증, `server/src/db/mappers.ts:89` `match_requests` 저장까지 배관 완료
- 온보딩 UI(`Step4Scale.tsx`)엔 직원 수 + 연매출만 있고 업력 입력 필드가 없음 — 항상 `undefined`로 저장됨
- `subsidies` 테이블엔 업력 조건에 대응하는 구조화 컬럼이 없음 (region과 달리 아직 없음)

## 범위

### 포함 (이번 이슈)
- `src/data/onboardingSteps.ts`에 `BUSINESS_YEARS_OPTIONS` 추가
- `Step4Scale.tsx`에 업력 select 필드 추가 (연매출과 동일한 `<select>` 패턴)
- `isStep4Complete`에 businessYears 포함 → 값 없으면 다음 버튼 disabled
- `OnboardingContext.tsx`의 `EMPTY_PROFILE`에 businessYears 초기값 추가
- 수동 검증: 온보딩 완료 → `POST /api/match` 호출 → `match_requests`에 businessYears 값 저장 확인

### 제외 (다음 이슈로)
- subsidies 매칭 점수(`scoreForProfile`) 반영 — subsidies 쪽에 구조화된 업력 조건 컬럼이 없어서 범위 밖. bizinfo 원문에서 업력 조건을 추출하는 크롤러 작업이 선행돼야 함 (region이 #43에서 걸었던 것과 같은 경로). 필요시 별도 이슈로 등록.

## 실행 순서

### 묶음 1 — 옵션 정의 + Step4 UI 반영 (승인 필요)
- [ ] `onboardingSteps.ts`에 `BUSINESS_YEARS_OPTIONS: string[]` 추가:
      `['예비창업자', '1년 미만', '1~3년', '3~5년', '5~7년', '7~10년', '10년 이상']`
      (근거: 실 API 300건 표본에서 업력 조건 컷오프가 1/3/5/7/10년에 몰려 있음 — 아래 리스크 표 참고)
- [ ] `Step4Scale.tsx`에 업력 `<select>` 필드 추가 (연매출 select와 동일 스타일, `field-group--business-years` 클래스)
- [ ] `isStep4Complete(employees, revenue, businessYears)` 시그니처 확장, `OnboardingStep.tsx`의 `canProceed` 호출부 갱신
- [ ] `OnboardingContext.tsx` `EMPTY_PROFILE`에 `businessYears: ''` 추가

### 묶음 2 — 검증
- [ ] `npm run build -w @hub/server` / `npm test` / `npm run lint`
- [ ] 로컬 서버 기동 후 온보딩 4스텝 실제로 진행 → `match_requests` 테이블에 businessYears 값 저장 확인 (`npm run db:check -w @hub/server` 또는 직접 조회)

## 완료 기준

- [ ] 온보딩 Step4에서 업력을 선택하지 않으면 다음 버튼이 비활성화된다
- [ ] 온보딩 완료 시 `businessYears` 값이 `POST /api/match` 요청에 실려 `match_requests`에 저장된다
- [ ] 기존 4스텝 흐름(진행바, 뒤로가기 등)이 그대로 동작한다

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 |
|------|------|-----------|
| 스텝 구성 | Step5 신설 vs Step4에 필드 추가 | **Step4에 필드 추가로 결정** (사용자 확인, 2026-07-25) — gov-subsidy-design 스킬의 "4스텝 온보딩" 원칙 유지 |
| 업력 버킷 경계 | 몇 개 구간으로 나눌지 | 실 API 300건 조사(2026-07-25) 결과 반영해 1/3/5/7/10년 경계로 7개 버킷 채택 — 향후 "업력 5년 이내" 같은 조건과 정밀 비교 가능하게 함 |
| 매칭 점수 미반영 | 이번엔 수집만 하고 점수엔 안 씀 | 의도된 스코프 — subsidies 쪽 구조화 컬럼 부재. 후속 이슈에서 크롤러 추출 작업 선행 필요 |

## 이번에 끝나면 다음 (참고)

- 업력 조건을 실제 매칭 점수에 반영하려면 크롤러가 `bsnsSumryCn`에서 업력 조건을 추출해 `subsidies`에 구조화 컬럼을 채우는 작업이 선행돼야 함 (region/#43, industry/#52와 같은 패턴) — 별도 이슈 후보
