## 작업 내용

`responses` 데이터를 집계해 화면10(최종 결과)에 히트맵으로 보여주고, 화면5(관리자 대시보드)에 "몇 명 중 몇 명 완료"를 표시한다.

결과는 마감 후에만 공개해야 하는데, `appointments`에 "마감됨" 상태를 저장하는 컬럼이 없고 `AdminDashboard`의 "투표 마감하기" 버튼도 API 호출 없는 스텁이다(원래 Day3 범위). 그래서 마감 상태 저장·전환 최소기능을 이번에 앞당겨 같이 만들고, 그 상태로 결과 화면 접근을 게이트한다. 마감 UX 개선·자동 마감·재오픈은 Day3 범위로 남긴다.

"몇 명 중 몇 명 완료"가 목표 인원을 넘어 보이는 상황을 막기 위해, `headcount`(관리자 포함 목표 인원) 기준으로 참여 자체를 제한하는 로직도 이번에 같이 반영한다.

Top-N 추천 카드, 히트맵 클릭 시 근거(가능/선호 인원) 표시는 `tasks.md`가 후순위로 명시한 항목이라 이번 범위에서 제외한다.

## 확정된 설계 결정

### API 계약
- `GET /api/appointments/:id/results` → `{ slots: SlotResult[] }` (`SlotResult = { date, time, availableCount, preferredCount }`). `availableCount === 0`인 슬롯은 생략(sparse) — `GetResponseResponse`/`ScheduleGrid`와 동일하게 FE가 `generateSlots`로 만든 전체 그리드에 얹는 방식.
- 응답 현황은 별도 엔드포인트: `GET /api/appointments/:id/response-status` → `{ completedCount: number }`. 대시보드는 가볍게, 결과 화면은 무겁게 — 소비 시점이 달라 분리하되 집계 로직(`server/src/lib/results.ts`)은 공용.
- `AppointmentDetailResponse`에 `title`, `headcount`, `closedAt` 추가 — Day4의 date/time 범위 확장과 동일 패턴.
- 완료 인원 = `responses`에 행이 하나라도 있는 distinct `participant_id` 수(PUT 성공 시 `availableSlots` 최소 1개 보장되므로 정확히 "입력 완료"를 의미).

### 집계 위치
- Supabase-js는 임의 GROUP BY/COUNT를 못 하므로 **Node에서 집계**: `participants`로 대상 id 조회 → `responses`를 `participant_id in (ids)`로 조회(2단계, `responses`엔 `appointment_id` 없음) → `Map`으로 순회 집계. 규모(수십 명 × 최대 1488슬롯)에서 비용 무시할 수준.

### 순위 · 색상 등급
- 순위 기준: 1) `availableCount` 내림차순 2) 동률이면 `preferredCount` 내림차순. 두 값이 모두 같으면 완전히 같은 순위로 취급하고 같은 색으로 칠한다.
- BE는 원시 카운트만 반환, 순위·등급 계산은 FE 책임(`SubmitResponseResponse`와 같은 원칙 — 색 조정 때마다 BE 재배포 안 해도 됨).
- 등급은 "최댓값 대비 비율"이 아니라 위 기준으로 매긴 **순위 위치**로 나눈다 — 슬롯을 정렬해 서로 다른 `(availableCount, preferredCount)` 조합마다 하나의 순위를 부여하고, 그 순위를 색상 단계에 매핑한다.
- 인접 등급끼리는 사용자가 명시적으로 구분할 수 있을 만큼 채도 차이를 크게 둔다 — 고유 순위가 색상 단계 수보다 많으면 여러 순위를 한 단계로 묶어서, 등급을 과도하게 잘게 나눠 구분이 안 되는 상황을 막는다. 정확한 채도 값/단계 수는 구현 시 `/design` 스킬로 확정한다.

### 마감 상태 (Day3 최소기능 선행)
- `appointments.closed_at timestamptz` nullable 추가. `null`=진행 중. 재오픈 없음(범위 제외, `tasks.md` 8번).
- `PUT /api/appointments/:id/participants/:participantId/close` — `responses.ts`와 동일한 `:id`/`:participantId` 경로 관례. 참여자 확인 후 `role !== 'admin'`이면 403. 이미 마감이면 그대로 반환(멱등).
- `ResultPage`: `closedAt` 없으면(마감 전) `/a/:id`로 리다이렉트. FE 리다이렉트만으론 API 직접 호출을 못 막으므로, 서버 `GET /:id/results`도 마감 전이면 409로 거부한다(진짜 잠금은 서버가 함). `GET /:id/response-status`는 반대로 마감 전에도 봐야 하는 용도(관리자가 마감 시점을 판단하려고 봄)라 이 가드를 걸지 않는다.
- `SchedulePage`: `closedAt` 있으면(마감 후) 리다이렉트, 서버 `responses.ts` PUT도 409로 거부(FE 우회 방어) — Day4가 남긴 "마감 후에도 수정 가능" 한계를 해소.
- 상태 코드 규칙: 역할 권한 실패(관리자 아님)는 403, `closed_at` 상태 때문에 막히는 경우(응답 제출 PUT, 결과 조회 GET)는 전부 409로 통일한다.
- 대시보드는 `closedAt` 유무로 "일정 투표하기" → "투표 결과 확인하기"(`/a/:id/result`) CTA만 전환. 대시보드 자체를 결과 화면으로 치환하지 않음 — `/a/:id`와 `/a/:id/result`는 이미 별도 경로이므로 라우팅 책임을 안 겹치게 유지.
- 관리자 "투표 마감하기" 버튼을 실제 close API 호출로 연결, 마감 후 "마감됨" 표시로 교체.
- `deadline` 도달 시 자동 마감은 제외(스케줄러 등 새 인프라 필요) — `deadline`은 안내 문구용으로만 유지.

### 참여 정원 제한 (headcount 정의 확정)
- `headcount`는 **관리자를 포함한** 약속 전체 목표 인원으로 정의한다 — 예: `headcount=5`면 관리자 1명 + 참여자 4명 = 5명이 정원.
- `POST /api/appointments/:id/participants`(기존 참여 라우트)에서 **신규 참여자를 생성하기 직전**에 현재 `participants` 행 수(관리자 포함)가 `headcount` 이상이면 409로 거부한다. 이름+비밀번호가 일치하는 **기존 참여자의 재접속은 이 검사를 받지 않는다**(이미 정원 안에 포함된 사람이므로).
- 이렇게 하면 "완료 인원이 목표 인원을 넘는" 상황이 구조적으로 불가능해진다 — `completedCount`(응답 제출자 수) ≤ 전체 참여자 수(참여 시점에 이미 `headcount`로 캡됨) ≤ `headcount`.
- 동시에 마지막 한 자리를 두고 여러 명이 동시에 참여 요청을 보내는 경쟁 상황까지 완벽히 막지는 않는다(카운트 조회와 삽입 사이 레이스) — Day2가 "참여자 insert 실패 시 보정삭제"에서 허용한 것과 같은 급의 위험이라 이번에도 허용.

### 훅 재사용 구조
- `GET /api/appointments/:id`(약속 상세)를 여러 화면(결과/일정입력/관리자·참여자 대시보드)이 공통으로 필요로 하므로, `client/src/lib/useAppointmentDetail.ts`(상세 조회 전용, `isLoading`/`error`/`detail` 반환)를 먼저 만들고 `useScheduleResult`/`useScheduleResponse`/`useResponseStatus`/`ParticipantDashboard`가 전부 이 훅을 내부적으로 재사용한다. 각자 따로 `GET /:id`를 호출하는 중복 구현을 피하기 위함.

## 완료 기준

- [ ] 1. API 계약 — `shared/src/results.ts` + `AppointmentDetailResponse` 확장 + `CloseAppointmentResponse`
- [ ] 2. DB 마이그레이션 — `appointments.closed_at`
- [ ] 3. BE 집계 라이브러리 — `server/src/lib/results.ts` + 테스트
- [ ] 4. BE 라우터 — `/results`, `/response-status`, `/close` + `appointments.ts` GET 확장 + `responses.ts` PUT 마감 가드 + `participants.ts` 참여 정원 제한 + 테스트
- [ ] 5. FE 공용 약속 상세 훅 — `useAppointmentDetail`
- [ ] 6. FE 결과 조회 훅 + 색상 등급 유틸 — `useScheduleResult`, `resultRanking.ts`
- [ ] 7. FE 히트맵 컴포넌트 + `ResultPage`(마감 게이트)
- [ ] 8. FE `SchedulePage` 마감 가드
- [ ] 9. FE 대시보드 — 응답 현황, 마감 버튼 연동, CTA 전환, 참여 정원 초과 안내
- [ ] 10. 통합 확인

## 우선순위

- 높음 — 핵심 사이클(일정 입력→결과 산출)의 마지막 조각, 이후 Day가 이 화면 존재를 전제로 진행됨
- 마감 상태 최소기능(플래그+전환), 참여 정원 제한(headcount 기준)만 앞당김. 마감 UX 개선·자동 마감·재오픈은 Day3 범위로 제외
- Top-N 카드·클릭 시 근거 표시는 범위 제외

## 작업 순서

각 묶음이 끝날 때마다 수동으로 확인한 뒤 다음으로 넘어간다. 각 항목 끝의 괄호는 그 작업을 아주 쉽게 풀어쓴 한줄 설명.

### 1. API 계약 정의
1. `shared/src/results.ts` 신설 — `SlotResult`, `GetResultsResponse`, `ResponseStatusResponse`(zod 불필요, 응답 전용). `index.ts`에 재수출 *(서버·화면이 결과 데이터를 주고받을 때 쓸 상자 모양을 미리 정하는 것)*
2. `shared/src/appointments.ts`에 `title`/`headcount`/`closedAt` 추가, `CloseAppointmentResponse` 추가 *(약속 정보에 제목·인원수·마감여부도 같이 담아 알려주게 하는 것)*

확인: 타입만으로 세 API가 뭘 주고받는지 서로 설명 가능한지.

### 2. DB 마이그레이션
3. `server/db/migrations/0004_add_closed_at.sql` — `alter table appointments add column closed_at timestamptz;` *(마감 시각을 적을 새 칸을 DB 표에 추가하는 설명서)*
4. Supabase 적용 확인 *(그 새 칸이 실제로 잘 생겼는지 눈으로 확인)*

확인: 컬럼이 nullable로 생겼고 기존 row는 전부 `null`인지.

### 3. BE - 집계 라이브러리
5. `server/src/lib/results.ts` — `getAppointmentResponseRows`(DB IO), `aggregateSlotCounts`/`countCompletedParticipants`(순수 함수). `pgTime.ts`의 DB IO/순수 함수 분리 패턴 따름 *(누가 언제 가능하다 했는지 모아서 시간대별로 세는 계산기 만들기)*
6. `server/src/lib/results.test.ts` — 카운트 합산 / `preferredCount` 분리 / 빈 배열 / 참여자 중복 슬롯도 완료 1로 카운트

확인: `npm run test -w server`로 이 파일만.

### 4. BE - 라우터 + 마감 가드 + 참여 정원 제한 + 테스트
7. `server/src/routes/results.ts` — `GET /:id/results`(`getAppointmentRange`로 `closedAt` 확인, 마감 전이면 409, 마감 후엔 집계 결과 반환), `GET /:id/response-status`(마감 여부와 무관하게 항상 응답 — 관리자가 마감 판단에 씀), `PUT /:id/participants/:participantId/close`(참여자 확인→role≠admin 403→기존 closed_at 있으면 그대로, 없으면 now()로 갱신). GET 두 개 다 DB 오류만 500, 별도 약속 존재 검증 안 함(알려진 한계) *(계산기를 실제로 쓸 수 있게, 요청에 답해주는 문 3개 만들기)*
8. `app.ts`에 `resultsRouter` 마운트 *(새로 만든 문을 서버 입구에 실제로 연결하기)*
9. `appointments.ts`의 `GET /:id`에 `title`/`headcount`/`closed_at` 추가 — `title`/`headcount`는 슬롯 검증과 무관한 표시 전용 필드라 `getAppointmentRange`를 쓰지 않고 이 라우트가 자체 select *(약속 상세를 물어보면 제목·인원수·마감여부까지 같이 대답해주게 하기)*
10. `server/src/lib/pgTime.ts`의 `getAppointmentRange` 확장 — range(`dateStart`~`timeEnd`)에 `closedAt`도 함께 반환하도록 변경(이제 "슬롯 관련 요청을 검증할 때 필요한 상태" 전체를 책임짐). `responses.ts` PUT과 7번 `results.ts`의 `GET /results` 둘 다 이 함수를 재사용해 `closedAt`이 있으면(PUT) / 없으면(GET) 각각 409 *(마감 여부에 따라 응답 제출·결과 조회를 막거나 열어주는 공통 판단 로직 만들기)*
11. `participants.ts` POST — 신규 참여자 생성 직전, 현재 참여자 수(관리자 포함)가 `headcount` 이상이면 409로 거부. 기존 참여자 재접속은 검사하지 않음 *(정원이 다 찬 약속엔 새로운 사람이 못 들어오게 문 앞에서 막기)*
12. `appointments.test.ts` 기대값 갱신, `responses.test.ts`에 마감 후 PUT 거부 케이스, `participants.test.ts`에 정원 초과 시 409·재접속은 통과하는 케이스, `results.test.ts` 신설(`responses.test.ts`의 mock 패턴 재사용, `in` 메서드 추가) — 집계 정확성 / 완료 카운트 / 참여자 0명 / DB 에러 500 / 마감 전 `/results` 409 · 마감 후 200 / `/response-status`는 마감 여부와 무관하게 항상 200 / `/close` 관리자 성공·참여자 403·재호출 멱등

확인: curl로 `/results`·`/response-status`·확장된 `GET /:id` 검증, 마감 전 `/results` 직접 호출 시 409 확인, 관리자 `/close` 호출 후 `closedAt` 반영 확인, 마감 후 `/responses` PUT 409·`/results` 200 확인, 정원이 찬 약속에 신규 참여 시도 시 409 확인.

### 5. FE - 공용 약속 상세 훅
13. `client/src/lib/useAppointmentDetail.ts` 신설 — `GET /api/appointments/:id`만 호출해 `detail`(title/headcount/closedAt/날짜시간 범위 전체)과 `isLoading`/`error` 반환. 이후 묶음의 훅들이 전부 이걸 내부적으로 재사용 *(약속 상세 정보를 물어보는 공용 심부름꾼 — 나머지 훅들이 이걸 갖다 쓰게 만들기)*

확인: 네트워크 탭에서 `GET /:id` 요청이 한 번만 정의돼 있고 다른 훅들이 그걸 불러 쓰는 구조인지 코드로 확인.

### 6. FE - 결과 조회 훅 + 색상 등급 유틸
14. `client/src/lib/useScheduleResult.ts` — `useAppointmentDetail`로 상세를 가져오고 별도로 `/results`를 조회해, `candidateSlots`(`generateSlots`), `resultMap`, `levelMap`(15번 함수로 계산), `closedAt`을 합쳐 반환. `/results` 호출이 409(마감 전)면 `error`로 취급하지 않고 조용히 빈 결과로 둔다 — 화면 전환은 `closedAt` 기반 리다이렉트(17번)가 담당하므로 두 군데서 중복으로 에러를 띄우지 않는다 *(결과 화면이 서버에 정보를 물어보고 받아오는 심부름꾼 만들기)*
15. `client/src/lib/resultRanking.ts` — `rankSlots(slots: SlotResult[]): Map<slotKey, level>` 순수 함수. `availableCount` desc → 동률이면 `preferredCount` desc로 정렬해 고유 조합마다 순위를 매기고, 색상 단계 수에 맞춰 등급으로 변환(동률은 같은 등급) + 테스트(동률 케이스, 순위 역전 없는지 등 경계값) *(합산된 숫자들을 보고 순위를 매겨서 몇 번째로 진한 색을 칠할지 정해주는 규칙 만들기)*

확인: 네트워크 탭에서 요청/반환값 확인.

### 7. FE - 히트맵 컴포넌트 + ResultPage(마감 게이트)
16. `client/src/components/ResultHeatmap.tsx`/`.css` — `ScheduleGrid.tsx`의 표 렌더링 뼈대 참고해 새로 작성(읽기 전용, 각 셀은 `levelMap.get(key) ?? 0`으로 등급을 조회해 `result-cell--heat-{n}` 클래스 적용). 정확한 색상 값은 구현 시 `/design` 스킬로 확정 *(달력 표를 그리고 칸마다 정해진 색을 칠해 보여주는 그림 만들기)*
17. `ResultPage.tsx`를 `SchedulePage.tsx`와 같은 게이트 구조로 — 세션 없음/로딩/에러/**마감 전(`/a/:id`로 리다이렉트)**/정상(`ResultHeatmap`) *(로그인 안 했거나 아직 마감 전이면 못 들어오게 막는 경비원 세우기)*

확인: 마감 전 직접 접속 시 튕기는지, 마감 후 색상 진하기가 실제 데이터와 맞는지.

### 8. FE - SchedulePage 마감 가드
18. `useScheduleResponse.ts`가 자체 상세 조회 대신 `useAppointmentDetail`을 내부적으로 재사용하도록 리팩터링 — `closedAt`이 자동으로 함께 반환됨 *(이미 있는 공용 심부름꾼을 갖다 써서 마감 여부도 같이 받기)*
19. `SchedulePage.tsx`에 마감 후 접근 시 `/a/:id` 리다이렉트 추가 *(마감된 약속이면 입력화면 대신 대시보드로 돌려보내기)*

확인: 마감된 약속의 `/a/:id/schedule` 직접 접속 시 튕기는지, devtools로 API 직접 호출해도 409인지.

### 9. FE - 대시보드(CTA 전환 + 응답 현황 + 마감 연동) + 참여 정원 초과 안내
20. `client/src/lib/useResponseStatus.ts` — `useAppointmentDetail`로 `headcount`/`closedAt`을 받고 별도로 `response-status`를 조회해 `completedCount` 합침 + `closeVoting()`(`/close` PUT 호출 후 로컬 상태 갱신) *(응답 현황을 묻고, 마감 버튼 누르면 실제 마감 요청도 보내는 심부름꾼 만들기)*
21. `AdminDashboard.tsx` — "n명 중 m명 완료" 인라인 표시, "마감할게요" 버튼을 `closeVoting()`에 연결(마감 후 "마감됨" 표시로 교체), `closedAt` 유무로 CTA를 "투표 결과 확인하기"로 전환 *(응답 현황 표시 + 마감 버튼 실제 연결 + 버튼을 결과보기로 바꾸기)*
22. `ParticipantDashboard.tsx` — `useAppointmentDetail`로 `closedAt`을 받아 CTA 전환(응답 현황 카운트는 표시 안 함) *(마감되면 버튼을 결과 확인하기로 바꾸기)*
23. `client/src/lib/useJoinAppointment.ts` — 참여 요청이 409면 "정원이 다 찼어요" 안내 표시 추가 *(자리가 다 찼을 때 사용자에게 이유를 알려주기)*

확인: 완료 인원 수 일치 확인, "마감하기" 클릭 시 버튼 잠금 및 양쪽 대시보드 CTA 전환 확인, 정원이 찬 약속에 새 이름으로 참여 시도 시 안내 문구 확인.

### 10. 통합 확인
24. 참여자 0명 시나리오
25. 일부 완료 시나리오 — 완료 인원 수·히트맵 진하기 일치
26. 슬롯 겹침 시나리오 — 가장 많이 겹친 슬롯이 가장 진하게(`plan.md` 11번)
27. 마감 전후 시나리오 — 마감 전 결과 화면 차단(FE 리다이렉트 + 서버 `/results` 409 둘 다)·CTA 유지, 마감 후 CTA 전환·입력 차단
28. 정원 초과 시나리오 — `headcount`만큼 참여자가 다 찬 상태에서 신규 참여 시도 시 차단되고, 기존 참여자 재접속은 그대로 되는지
29. 전체 워크스루 — 입력 → 대시보드 응답 현황 → 마감 → CTA 전환 → 결과 확인

## 이슈/커밋 전략

- 이슈: "2주차 Day1: 일정 결과 집계·결과 확인 기능 개발 + 관리자 응답 현황 표시(+ 마감·참여 정원 최소기능 선행)"
- 브랜치: `feat/week2-day1-result-aggregation`
- 커밋: API 계약 → DB 마이그레이션 → BE(집계) → BE(라우터+마감가드+정원제한+테스트) → FE(공용 상세훅) → FE(결과훅+색상유틸) → FE(히트맵+ResultPage게이트) → FE(SchedulePage가드) → FE(대시보드+정원안내) — 묶음별로
- PR: 사용자가 직접 진행

## 참고 사항

- `docs/rules/plan/plan.md` "선호 시간 투표 기획" 섹션 9~13번 항목 — 가능 인원/선호 점수 계산 기준(13번 제외)
- `docs/rules/tasks.md` 8번(재오픈 제외), 22번(Day1 범위), 24번(Day3 마감 기능), 34~36번(후순위 UX)
- `docs/rules/design/design.md` "10. 최종 결과 화면" — 파란 계열 내 명도/채도 조정
- `docs/prototype/script.js`의 `buildHeatmapGrid`/`RESULT_PRESET`, `style.css`의 `.heat-0`~`.heat-5` — 스타일만 참고(집계 알고리즘은 없음)
- `server/src/lib/pgTime.ts` — `getAppointmentRange`가 `closedAt`까지 반환하도록 확장, `responses.ts` PUT과 `results.ts`의 `GET /results` 양쪽이 재사용
- `server/src/routes/responses.ts` — 라우터 구조·mock·`requireParticipant` 재사용
- `server/src/routes/participants.ts`, `client/src/lib/useJoinAppointment.ts` — 참여 정원 제한 추가 대상(1주차 Day3 산출물)
- `client/src/lib/useScheduleResponse.ts`, `client/src/components/ScheduleGrid.tsx`/`.css` — 구조만 참고, 그대로 재사용 아님
- `client/src/pages/SchedulePage.tsx` — 세션 가드+로딩 게이트 패턴 참고
- `shared/src/schedule.ts` — `ScheduleSlot`/`slotKey`/`generateSlots` 재사용
- `client/src/components/AdminDashboard.tsx`의 "투표 마감하기" 모달 — 실제 API 연동으로 교체 대상(1주차 Day1 스텁)
