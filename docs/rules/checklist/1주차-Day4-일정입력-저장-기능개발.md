## 작업 내용

1주차 Day4 "일정 입력·저장 기능 개발(기본형)" 작업. 참여자가 화면7(일정 입력)에서 "가능한 시간 → 선호 시간" 2단계로 시간대를 선택하고, 그 결과를 실제 DB에 저장한다. 드래그/long-press 선택 UX는 tasks.md가 2주차 Day2로 명시적으로 미뤄뒀으므로, 이번엔 셀 클릭 토글 방식으로만 구현한다(Day1이 `SchedulePage.tsx`에 만들어둔 2단계 step 골격을, 비동기 로딩과의 Hook 규칙 충돌 때문에 신설할 `ScheduleEditor` 컴포넌트로 옮겨 재사용 — 이유는 "확정된 설계 결정" 참고).

작업을 짜기 전 확인해보니, 그리드를 그리려면 참여자가 선택 가능한 날짜/시간 범위(약속의 date_start~date_end, time_start~time_end)를 FE가 알아야 하는데, 현재 `GET /api/appointments/:id`는 `{ appointmentId }`만 반환한다. 이 응답 확장이 계획에 없던 선행 작업으로 추가됐다.

## 확정된 설계 결정

(사전 코드리뷰를 거쳐 아래로 정리됨)

### 저장 구조
- `responses` 테이블은 참여자 × 날짜 × 시간 슬롯 하나당 한 줄. 2주차 집계(슬롯별 가능인원/선호점수)에 유리하기 때문.
- 슬롯 단위 30분, `date`+`time` 컬럼. 선호 여부는 `is_preferred boolean` 하나로 표현(row 존재=가능한 시간, `true`=그중 선호 시간).
- `appointment_id`는 저장하지 않음 — `participant_id`만 저장하고 집계 시 `participants.appointment_id`로 join. 비정규화하면 "participant는 A약속 소속인데 appointment_id는 B약속"인 모순 행이 생길 위험이 있고, `participants`엔 이미 `unique(appointment_id, name)` 인덱스가 있어 join 성능도 문제없다.
- 제출은 participant별 전체 교체(delete-then-insert). Supabase-js에 멀티스테이트먼트 트랜잭션 API가 없어 순차 처리(완전한 원자성은 아니지만, Day2 "참여자 insert 실패 시 보정삭제"와 같은 급의 위험이라 허용).

### API 계약
- `GET`/`PUT` 모두 `/api/appointments/:id/participants/:participantId/responses` 하나의 경로. PUT은 항상 "전체 교체" 의미(응답은 항상 200).
- 기존 `GET /api/appointments/:id` 응답에 `dateStart/dateEnd/timeStart/timeEnd` 추가 — Postgres `time` 컬럼 정규화(CLAUDE.md 규칙)를 여기서 처음 실제로 다룬다.
- 검증 규칙: 선호 슬롯은 가능 슬롯의 부분집합(zod refine + BE 방어적 재검증) / 가능 슬롯은 최소 1개 이상.

### 슬롯 계산 (`generateSlots`, `shared/`)
- 약속의 date/time 범위로 "선택 가능한 전체 슬롯 목록"을 만드는 함수를 `shared/`에 둬서 FE(그리드 렌더링)·BE(제출 슬롯 범위 검증) 공용으로 쓴다.
- 종료 시각은 exclusive(`timeEnd`가 18:00이면 마지막 슬롯은 17:30 시작분까지).
- 날짜 계산은 `date-fns`(`parseISO`/`eachDayOfInterval`/`format`)를 쓴다. `shared/package.json`에 `date-fns`를 의존성으로 추가.
- 잘못된 달력 날짜(`2026-02-31` 등) 자체를 거부하는 건 이 함수 책임이 아니라 향후 Day2 스키마 보강 쪽 몫.
- `generateSlots` 자체엔 슬롯 개수 상한을 두지 않는다 — 대신 근본 원인 쪽(약속 생성 시 날짜 범위)을 `createAppointmentRequestSchema`에서 최대 31일로 제한해서(Day2, `shared/src/appointments.ts`), 슬롯 개수가 최대 31일×48슬롯=1488개로 자연히 한정된다. `submitResponseRequestSchema`의 `.max(2000)`은 이 실제 최대치보다 넉넉한 값으로, 클라이언트가 보내는 제출 배열 자체(중복 포함)를 거르는 느슨한 안전장치로 유지한다.
- 경계값 유닛테스트는 `shared`가 아니라 `server`에 둔다 — `shared/package.json`엔 테스트 러너가 없어서, 이미 `"shared": "*"` workspace 의존성이 있는 `server`쪽 `server/src/lib/schedule.test.ts`에서 `'shared'`를 import해 검증한다.
- `'shared'` import는 `shared/dist`를 보므로 테스트 전 빌드가 보장돼야 한다 — 루트 `package.json`에 기존 `"predev"`와 동일한 패턴으로 `"pretest": "npm run build -w shared"`를 추가한다.

### BE 헬퍼
- `normalizeTime(pgTime)`과 `getAppointmentRange(db, appointmentId)`를 `server/src/lib/pgTime.ts` 한 파일에 함께 둔다 — 둘 다 "Postgres time 컬럼 다루기"라는 같은 주제이고, `getAppointmentRange`가 내부에서 바로 `normalizeTime`을 호출해 쓰는 사이라 파일을 나눌 만큼 무관하지 않다. `appointments`뿐 아니라 `responses.time`도 같은 Postgres `time` 타입이라 `appointments.ts`/`responses.ts` 라우트 둘 다 이 파일에서 필요한 함수를 가져다 쓴다.

### FE 상태 관리
- `useScheduleResponse`는 서버 I/O 전용(상세/기존 응답 조회, `isLoading`, `error`, 제출 함수)만 맡고, 선택 상태(Set)·`step`·토글·확정 모달은 `ScheduleEditor`가 소유한다. 비동기 조회 후 첫 렌더에서 `useState` 초기값을 시딩해야 하는데, 로딩 게이트 역할을 하는 `SchedulePage` 자신은 로딩 중일 때부터 이미 렌더링되고 있어 "로딩 후 첫 렌더"가 될 수 없다(Hook을 조건부로 호출할 수도 없음) — 그래서 `isLoading`이 꺼진 뒤에만 마운트되는 별도 컴포넌트 `ScheduleEditor`가 이 상태를 가져야 한다. `ScheduleGrid`는 순수 렌더링 전용.
- `isLoading`과 별개로 `error` 상태를 반환한다 — GET 실패 시에도 `isLoading`만으론 "조회 중"과 "실패"를 구분할 수 없으므로, `SchedulePage`는 로딩/에러/정상(`ScheduleEditor` 마운트) 세 갈래로 분기한다.
- "가능한 시간" 토글 해제 시 같은 슬롯을 선호 Set에서도 함께 제거한다(선호⊆가능 불변식을 FE에서도 유지).
- "입력 완료"/"건너뛰기" 클릭은 `confirmIntent`(`'submit'|'skip'`)만 세팅하고 모달을 열 뿐, 이 시점엔 선호 Set을 건드리지 않는다. 모달 "확정하기"에서만 `confirmIntent === 'skip'`이면 `preferredSlots: []`로 제출하고, "돌아가기"는 `confirmIntent`만 초기화한다. 클릭 즉시 Set을 비우면 "돌아가기"를 눌러도 기존 선택이 복구되지 않기 때문이다.

### 범위 제외
- 화살표로 7일씩 넘기는 페이지네이션은 이번엔 구현하지 않고, 날짜 범위 전체를 가로 스크롤 표로 한 번에 렌더링한다(드래그 선택과 함께 2주차 Day2로 미룸).
- `/a/:id/schedule`에 세션 없이 직접 진입하면 `/a/:id`로 리다이렉트한다.

### 알려진 한계 (이번 범위에서 고치지 않음)
- **마감 안내 문구 불일치**: 화면 안내는 "마감 전까지 수정 가능"이라 하지만 이번 PUT은 deadline을 검사하지 않아 마감 후에도 계속 수정 가능하다. 마감 검증은 2주차 Day3 몫.
- **원자성**: delete-then-insert 중간에 실패하면 참여자의 응답이 빈 상태로 남을 수 있다. zod+범위 검증을 통과한 뒤라 실패 확률은 낮고, Day2와 같은 급의 위험이라 허용.
- **인증**: `participantId`만 알면 비밀번호 재확인 없이 GET/PUT 호출 가능하다. Day1~3에서 이미 정해진 세션 모델(로컬스토리지에 participantId만 저장, 매 요청 재인증 없음) 전체의 특성이라 Day4 범위에서 혼자 고치지 않는다.

## 완료 기준

묶음(1~7) 단위로 완료 여부만 표시한다. 아래 "작업 순서"의 세부 스텝 번호와 굳이 1:1로 맞추지 않는다. 완료 표시는 여기서만 하고, "작업 순서" 섹션 자체는 수정하지 않는다.

- [x] 1. 스키마 설계 — `responses` 테이블 마이그레이션 작성 및 Supabase 적용
- [x] 2. API 계약 정의 — `shared/src/schedule.ts`(`generateSlots` 포함) + `AppointmentDetailResponse` + 루트 `pretest` 스크립트
- [x] 3. BE 약속 상세 조회 확장 — `pgTime.ts` 헬퍼(`normalizeTime`+`getAppointmentRange`) + `GET /:id` 확장 + 테스트
- [x] 4. BE 응답 제출/조회 API — `responses.ts`(GET/PUT) + 라우터 마운트 + 테스트
- [ ] 5. FE 연동 훅 — `useScheduleResponse` + `SchedulePage` 세션 가드
- [ ] 6. FE 그리드 컴포넌트 — `ScheduleGrid` + `ScheduleEditor`(1단계 → 2단계 → 확정 모달 순으로 단계적 구현) + `SchedulePage` 로딩 게이트 전환
- [ ] 7. 통합 확인 — 신규 입력 / 재접속 / 전체 워크스루 수동 확인

## 우선순위

- 우선순위: 높음 — 2주차 Day1(일정 결과 집계)이 이 데이터를 그대로 사용하므로 선행 필요
- 페이지네이션(화살표)·드래그 선택은 이번 범위에서 제외, 2주차 Day2로 미룸

## 작업 순서

아래 순서대로 진행한다. 각 묶음이 끝날 때마다 수동으로 동작을 확인한 뒤 다음 묶음으로 넘어간다.

### 1. 스키마 설계
1. `server/db/migrations/0003_create_responses.sql` 작성 — `id`(uuid pk), `participant_id`(fk, on delete cascade), `date`, `time`, `is_preferred`(boolean, default false), `created_at`, `unique(participant_id, date, time)`(이 unique 인덱스가 `participant_id` 기준 조회도 커버), `alter table responses enable row level security;`(기존 `0001`/`0002`와 동일 패턴). `appointment_id`는 저장하지 않음(설계 결정 참고).
2. Supabase에 SQL 실행 — 테이블·FK·unique·인덱스가 의도대로 생성됐는지 대시보드에서 확인

이 묶음이 끝나면: Supabase 테이블 편집기에서 `responses` 테이블과 제약조건·인덱스를 직접 확인한다.

### 2. API 계약 정의
3. 루트 `package.json`에 `"pretest": "npm run build -w shared"` 추가 — `shared`를 매번 빌드해 최신 `dist` 기준으로 테스트가 돌게 함(설계 결정 참고).
4. `shared/src/schedule.ts` 신설 + `shared/src/index.ts`에 재수출 추가 (한 커밋 단위로 같이 처리)
   - `scheduleSlotSchema`: `{ date: 'YYYY-MM-DD' 형식, time: 'HH:mm' 30분 단위(00 또는 30) }`
   - `submitResponseRequestSchema`: `{ availableSlots: scheduleSlotSchema[] (최소 1개, 최대 2000개), preferredSlots: scheduleSlotSchema[] (최대 2000개) }` + `preferredSlots ⊆ availableSlots` refine — 최대 개수는 클라이언트가 비정상적으로 큰 배열을 보내는 것만 막기 위한 느슨한 상한이며, `generateSlots` 자체엔 대응하는 상한이 없다(알려진 한계 참고)
   - `SubmitResponseResponse` 타입(예: `{ availableCount: number; preferredCount: number }`)
   - `GetResponseResponse` 타입(`{ availableSlots: ScheduleSlot[]; preferredSlots: ScheduleSlot[] }`)
   - `generateSlots(dateStart, dateEnd, timeStart, timeEnd): ScheduleSlot[]` — 약속 범위 안의 30분 단위 전체 슬롯 생성 (FE 그리드 렌더링 + BE 범위 검증 공용, 경계 규칙은 설계 결정 참고). 경계값 유닛테스트는 묶음4(10번)에서 `server` 쪽에 작성한다.
5. `shared/src/appointments.ts`에 `AppointmentDetailResponse` 타입 추가 — `{ appointmentId, dateStart, dateEnd, timeStart, timeEnd }`. 이 파일은 이미 `index.ts`에서 `export *`로 재수출되고 있으므로 `index.ts`는 추가로 건드리지 않는다.

이 묶음이 끝나면: `npm test`를 루트에서 실행해 `pretest`가 `shared`를 빌드한 뒤 테스트가 도는지 확인하고, 타입/유틸만 보고 "제출 요청이 어떤 모양이고, 약속 상세 응답이 뭘 담고 있는지"를 서로 설명할 수 있는지 확인한다.

### 3. BE - 약속 상세 조회 확장 (+ 범위 조회 헬퍼)
6. `server/src/lib/pgTime.ts`에 `normalizeTime(pgTime: string): string`(`"HH:MM:SS"` → `"HH:MM"`)과 `getAppointmentRange(db, appointmentId)`(`appointments` 테이블에서 `date_start, date_end, time_start, time_end`를 조회하고 `normalizeTime`으로 정규화해서 반환, 없으면 null)를 함께 작성. `server/src/routes/appointments.ts`의 `GET /:id` 핸들러가 `getAppointmentRange`를 사용해 `AppointmentDetailResponse`를 응답하도록 수정. `getAppointmentRange`는 묶음4(PUT 범위 검증)에서, `normalizeTime`은 묶음4(GET 응답 조회)에서 각각 재사용되므로, 이 스텝이 묶음4보다 먼저 끝나야 한다.
7. `appointments.test.ts`의 기존 GET 테스트 기대값 갱신(확장된 응답 필드 반영)

이 묶음이 끝나면: curl로 `GET /api/appointments/:id`를 호출해 날짜/시간 범위가 `"HH:MM"` 형식으로 정확히 오는지 확인한다.

### 4. BE - 응답 제출/조회 API
8. `server/src/routes/responses.ts` 신설
   - 공통: `:id`(appointmentId)와 `:participantId`로 `participants` 테이블에서 `appointment_id`가 일치하는 row 존재 확인(없으면 404)
   - `GET .../responses`: 해당 participant의 기존 `responses` 행 조회 → 각 행의 `time`을 `normalizeTime`(6번 헬퍼)으로 정규화 → `GetResponseResponse` 형태로 변환(없으면 빈 배열 두 개)
   - `PUT .../responses`: `submitResponseRequestSchema`로 검증(400) → `getAppointmentRange`(6번 헬퍼)로 약속의 date/time 범위 조회(참여자 존재 확인을 이미 통과했으므로 여기서 null이 나올 일은 없지만 방어적으로 500 처리) → `generateSlots`로 후보 슬롯 집합 계산 → 그 슬롯 집합에 없는 제출 슬롯이 섞여 있는지 검사해 있으면 400 → `availableSlots`/`preferredSlots`를 각각 `date+time` 기준으로 중복 제거(같은 슬롯이 중복 제출돼도 `unique(participant_id, date, time)` 위반으로 500이 나지 않도록 방어) → 기존 `participant_id` 행 전체 delete → 남은 `availableSlots`를 `is_preferred=false`로, 그중 `preferredSlots`에 포함된 것만 `is_preferred=true`로 bulk insert → `SubmitResponseResponse` 반환
9. `server/src/app.ts`에 `responsesRouter`를 `/api/appointments`에 마운트
10. `server/src/routes/responses.test.ts` 신설 — 신규 제출(가능만) / 신규 제출(가능+선호) / 재제출(덮어쓰기 확인) / 범위 밖 슬롯 400 / 선호가 가능의 부분집합 아님 400 / 가능 0개 400 / 참여자 없음 404 / GET으로 저장된 값 그대로 조회되는지. 별도로 `server/src/lib/schedule.test.ts` 신설 — `'shared'`에서 `generateSlots`/`submitResponseRequestSchema`를 import해 경계값을 검증(3번의 `pretest` 덕분에 최신 `shared/dist` 기준으로 검증됨): `09:00~10:00` → `09:00`/`09:30` 두 개만 생성(종료 exclusive) / 월말(`1/31`→`2/1`)·연말(`12/31`→다음해 `1/1`) 날짜 증가 / 윤년 `2/29` 포함 계산 / `submitResponseRequestSchema`에 슬롯 2000개는 통과, 2001개는 zod 에러

이 묶음이 끝나면: curl/Postman으로 같은 participantId에 대해 (1)최초 제출 → 저장, (2)다른 내용으로 재제출 → 기존 값이 완전히 교체되는지, (3)범위 밖 슬롯 제출 시 400이 되는지 직접 확인한다.

### 5. FE - 상세/기존 응답 연동 훅 (서버 I/O 전용)
11. `client/src/lib/useScheduleResponse.ts` 신설 — `appointmentId`, `participantId`를 받아 (a) `GET /api/appointments/:id`로 상세 조회 후 `generateSlots`로 전체 슬롯 목록 계산, (b) `GET .../responses`로 기존 응답 조회, (c) 제출 함수(`PUT` 호출, 성공/실패 결과 반환)를 제공하고, (d) 이 모든 비동기 조회가 끝났는지 나타내는 `isLoading`을 함께 반환한다(16번에서 로딩 게이팅에 사용). GET 요청 실패는 내부에서 `try/catch`로 잡아 `error` 상태로도 반환한다. 선택 상태(Set)·`step`·토글 함수·확정 모달은 이 훅에 넣지 않고 묶음6의 `ScheduleEditor.tsx`(14~16번)가 소유한다(설계 결정 참고).
12. `SchedulePage.tsx`에서 `getSession(appointmentId)`로 participantId 확인 — 세션 없으면 `/a/:id`로 리다이렉트

이 묶음이 끝나면: 브라우저 콘솔/네트워크 탭에서 `/a/:id/schedule` 진입 시 상세 조회·기존 응답 조회 요청이 정상적으로 나가는지 확인한다.

### 6. FE - 그리드 컴포넌트
13. `client/src/components/ScheduleGrid.tsx` 신설 — 날짜(열) × 시간(행) 표 렌더링, 셀 클릭 시 부모(`ScheduleEditor`)로부터 받은 토글 콜백 호출(드래그 없음, 컴포넌트 자체는 상태를 갖지 않고 props로 받은 걸 그대로 렌더링), `step`(`available`/`preferred`)에 따라 전체 슬롯을 보여줄지 1단계에서 선택된 슬롯만 보여줄지는 부모가 필터링해서 넘겨준 목록을 그대로 그림, 선택 상태에 따라 연한/진한 파랑 색상 구분(design skill 스타일 규칙 준수)
14. `client/src/components/ScheduleEditor.tsx` 신설 — 우선 1단계(가능한 시간)만 구현한다. `candidateSlots`/`initialAvailable`을 props로 받아 가능 Set과 `step`을 `useState`로 소유하고(props로 받은 `initialAvailable`이 이 컴포넌트의 진짜 최초 렌더 값이 되도록 그대로 초기화), `ScheduleGrid`에 목록과 토글 콜백만 넘겨 클릭으로 켜고 끄는 것까지 만든다.
    - 확인: 그리드 셀 클릭으로 선택/해제가 되는지 먼저 브라우저에서 확인한 뒤 다음 스텝으로 넘어간다.
15. 위 `ScheduleEditor`에 2단계(선호 시간)를 추가한다 — `initialPreferred`를 props로 받아 선호 Set을 추가로 소유하고, "다음"으로 `step`을 `preferred`로 전환하면 1단계에서 선택된 슬롯만 필터링해 `ScheduleGrid`에 넘긴다. "가능한 시간" 토글 해제 핸들러는 같은 슬롯을 선호 Set에서도 함께 제거한다(선호 ⊆ 가능 불변식을 FE에서도 유지).
    - 확인: 1단계→2단계 전환 시 선택된 슬롯만 보이는지 확인한 뒤 다음 스텝으로 넘어간다.
16. 확정 모달을 연결하고 `SchedulePage.tsx`를 로딩 게이트로 축소한다.
    - "입력 완료"/"건너뛰기" 버튼은 각각 `confirmIntent`(`'submit' | 'skip' | null`)를 `useState`로 세팅하고 모달을 열 뿐, 이 시점엔 선호 Set을 건드리지 않는다. 모달의 "확정하기"에서만 `confirmIntent === 'skip'`이면 `preferredSlots: []`로, 아니면 현재 선호 Set 그대로 `onSubmit` 호출. "돌아가기"는 `confirmIntent`만 `null`로 되돌리고 Set은 그대로 둔다.
    - `SchedulePage.tsx`는 11번 훅만 호출하는 얇은 게이트로 축소 — `isLoading`이 true인 동안은 로딩 화면, 11번 훅의 `error`가 있으면 에러 화면을 렌더링하고, 그 둘 다 아닐 때만 `<ScheduleEditor initialAvailable=... initialPreferred=... candidateSlots=... onSubmit=... />`를 마운트한다. `ScheduleEditor` 입장에선 이게 진짜 "최초 렌더"이므로 `useState` 초기값 시딩이 정상 동작한다.

이 묶음이 끝나면: 브라우저에서 그리드 셀을 클릭해 선택/해제가 되는지, 1단계→2단계 전환 시 선택된 슬롯만 보이는지, 확정 모달의 건너뛰기/입력완료가 의도대로 제출되는지 확인한다.

### 7. 통합 확인
17. 신규 참여자 최초 입력 시나리오 — 가능한 시간만 선택 후 "건너뛰기" / 가능한 시간 선택 후 일부를 선호로 선택, 두 경우 모두 저장 확인
18. 재접속 시나리오 — 한 번 제출한 참여자가 다시 `/a/:id/schedule`에 들어왔을 때 (a) 이전 선택이 그대로 그리드에 표시되는지, (b) 기존에 선호 시간이 있던 참여자가 2단계에서 "건너뛰기"를 눌렀을 때 선호 목록이 비워진 채로 제출되는지 확인
19. 전체 워크스루 — 참여(Day3 흐름) → 대시보드 → "일정 투표하기" → 그리드 선택 → 확정 모달 → 저장 → 대시보드 복귀 → 재접속 시 유지 확인까지 처음부터 끝까지 수동 확인

이 묶음이 끝나면: 두 시나리오(최초 입력/재접속)가 끊김 없이 동작하는지 최종 확인한다.

## 이슈/커밋 전략

- 이슈: "Day4: 일정 입력·저장 기능 개발"
- 브랜치: `feat/day4-schedule-input` (이미 생성됨)
- 커밋: 스키마 설계 → API 계약 → BE(약속 상세 조회 확장) → BE(응답 제출/조회) → FE(훅) → FE(그리드 컴포넌트) — 묶음별로
- PR: 사용자가 직접 진행

## 참고 사항

- `docs/rules/plan/plan.md` 19~31번째 줄 — 선호 시간 투표 기획(2단계 입력, 부분집합 규칙, 집계 기준)
- `docs/rules/tasks.md` 34번째 줄 — 드래그 UX 후순위 근거
- `docs/rules/design/design.md` "7. 일정 입력" 섹션 — 색상 진하기 구분, 그리드 레이아웃
- `CLAUDE.md` — Postgres `time` 컬럼 정규화 주의사항(이번에 처음 실제로 다루게 됨)
- `client/src/pages/SchedulePage.tsx` — Day1에서 만든 2단계 step 골격의 출발점(실제 step 상태는 신설 `ScheduleEditor.tsx`로 이동)
- `client/src/lib/session.ts` — `getSession`으로 participantId 확보
- `client/src/components/JoinAppointmentForm.tsx` / `client/src/lib/useJoinAppointment.ts` — 컴포넌트/훅 분리 패턴 참고
- `server/src/lib/zodFields.ts`, `server/src/lib/supabase.ts`(`requireSupabase`) — 기존 유틸 재사용
- `server/db/migrations/0001_create_appointments.sql`, `0002_create_participants.sql` — 마이그레이션 파일 번호 이어서 `0003`
- 루트 `package.json`의 `"predev": "npm run build -w shared"` — 이번에 추가하는 `pretest`가 따르는 기존 선례
