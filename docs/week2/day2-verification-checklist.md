# 기능 검증 체크리스트 — 2주차 월/화 구현 범위

`docs/week2/day1-mon.md` 화요일 TODO의 "기능 검증 Agent 산출물 초안" 항목.
월/화에 구현한 라우팅·온보딩·홈·상세·FE 데이터 계층(Query + API client + shared contract)이
의도대로 동작하는지 점검한다.

## 검증 방식 범례

| 표시 | 방법 |
|------|------|
| `[코드]` | 소스 코드를 직접 읽어 로직 경로를 추적 |
| `[API]` | `curl`로 Express 서버 응답을 실제로 호출해 확인 |
| `[UI 미검증]` | 브라우저 클릭·렌더링 확인이 필요하지만, 이 세션엔 브라우저 자동화 도구가 없어 코드 레벨로만 확인함. 실제 화면에서 한 번 더 훑어보는 걸 권장 |

---

## 1. 전체 플로우 (Welcome → 온보딩 → 완료 → 홈 → 상세 → 외부 신청)

- [x] `[코드]` 라우트 골격 — `/`, `/onboarding/:step`, `/onboarding/complete`, `/home`, `/subsidies/:id` 모두 [src/App.tsx](../../src/App.tsx)에 정의됨
- [x] `[코드]` 잘못된 step 번호(`0`, `5` 등)는 `/onboarding/1`로 정규화 ([src/pages/OnboardingStep.tsx](../../src/pages/OnboardingStep.tsx) L19-22)
- [x] `[코드]` step3는 지역 미선택 시, step4는 구·군 미선택 시 이전 단계로 리다이렉트 (같은 파일 L25-34)
- [x] `[코드]` step4 미완료 상태로 완료 화면 접근 시 `/onboarding/1`로 리다이렉트 ([src/pages/CompleteScreen.tsx](../../src/pages/CompleteScreen.tsx) L10-13)
- [x] `[코드]` 완료 화면 "맞춤 지원금 보러가기" → `/home` 이동 확인
- [x] `[코드]` 상세 화면 하단 CTA → `whereUrl` 또는 fallback URL로 `window.open` (외부 탭)
- [ ] `[UI 미검증]` 실제 브라우저에서 각 화면 전환 애니메이션/레이아웃이 와이어프레임과 일치하는지

## 2. 온보딩 단계별 "다음" 버튼 비활성 가드

- [x] `[코드]` step1: 업종 미선택 시 비활성, "기타" 선택 시 직접 입력 필요 ([Step1Industry.tsx](../../src/components/onboarding/Step1Industry.tsx) `isStep1Complete`)
- [x] `[코드]` step2: 시·도 미선택 시 비활성 (`isStep2Complete`)
- [x] `[코드]` step3: 구·군 미선택 시 비활성 (`isStep3Complete`)
- [x] `[코드]` step4: 직원 수 + 연매출 모두 선택해야 활성 (`isStep4Complete`)
- [x] `[코드]` `OnboardingStep.tsx`의 `canProceed`가 각 단계 가드를 취합해 `btn-next`의 `disabled`에 연결됨

## 3. 홈 화면

- [x] `[코드]` 정렬 칩 4종(전체/마감임박/지원금액/신규) → `sortSubsidies` 각 분기 존재 ([src/data/mockSubsidies.ts](../../src/data/mockSubsidies.ts))
- [x] `[코드]` 목록은 `useSubsidies(profile, sort)` → `submitProfile({ profile, sort })` 경유로 갱신됨
- [x] `[코드]` 로딩/에러/빈 결과 각각 `StatusBox` variant로 분기 처리됨 ([src/pages/HomeScreen.tsx](../../src/pages/HomeScreen.tsx))
- [ ] `[UI 미검증]` 정렬 칩 클릭 시 실제 카드 순서가 눈으로 바뀌는지

## 4. 상세 화면

- [x] `[코드]` `useSubsidy(id)` → 존재하지 않는 id는 `StatusBox(empty)` + "목록으로 돌아가기" 렌더링
- [x] `[코드]` 자격/서류/신청방법 섹션이 `subsidy.qualifications`/`documents`/`how`/`where`/`contact` 필드를 그대로 렌더링
- [ ] `[UI 미검증]` 상세 화면 진입 시 스크롤이 최상단으로 초기화되는지 (`bodyRef.current?.scrollTo(0, 0)`)

## 5. FE 데이터 계층 (오늘 신규 구현분)

- [x] `[API]` `GET /api/subsidies` — 실제 서버 실행 후 curl로 200 응답 확인
- [x] `[API]` `POST /api/match` — 서버에 미구현 상태라 404 확인 (직접 호출 및 Vite 프록시 `/api/*` 양쪽 모두 확인)
- [x] `[코드]` `submitProfile`이 `/api/match` 실패 시 `getDisplaySubsidies` + `sortSubsidies`로 mock 응답을 동일한 `MatchResponse` 형태로 반환
- [x] `[코드 → 수정]` **버그 발견 및 수정**: `getSubsidy`가 서버 404를 "진짜 없음"으로 취급해 mock(8건)으로 fallback하지 않는 문제 발견. 서버 샘플 데이터가 2건뿐이라 홈에서 보여준 mock 8건 중 6건이 상세 화면에서 깨지는 회귀였음 → 모든 실패(404 포함)를 mock fallback으로 통일해 수정 완료
- [x] `[코드]` `getSubsidies()`는 현재 어떤 화면에서도 쓰이지 않는 미사용 함수로 확인됨 (홈은 `submitProfile` 경유) — 당장 제거하진 않되 인지 필요
- [ ] `[UI 미검증]` 서버를 완전히 내린 상태에서 홈/상세 화면 진입 시 mock으로 자연스럽게 전환되는지 (네트워크 오류 케이스는 curl로 재현이 어려워 코드 추적으로만 확인함)

## 6. 자동 검사

- [x] `npx tsc --noEmit -p .` 통과
- [x] `npm run lint` (oxlint client + server) 통과
- [x] `npx vitest run` — 2 files, 11 tests 통과

---

## 남은 리스크 / 다음에 볼 것

1. **서버·mock 데이터 불일치**: 서버 샘플 2건 vs 클라이언트 mock 8건. Supabase 연동(이슈 #3) 시 서버 데이터를 mock과 동등한 양으로 맞추거나, mock을 서버 응답에 종속시키는 정리가 필요.
2. **`getSubsidies()` 미사용**: 지금은 죽은 코드. 서버 쪽 목록 API를 프로필 없이 그냥 쓸 일이 생기면 활용하거나, 안 쓰이면 다음 정리 때 제거 검토.
3. 위 `[UI 미검증]` 항목들은 브라우저 자동화 도구가 없어 실제 클릭 확인을 못했음 — 로컬에서 `npm run dev`로 한 번 훑어보는 걸 권장.
