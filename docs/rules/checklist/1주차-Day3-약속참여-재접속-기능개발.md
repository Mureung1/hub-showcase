## 작업 내용

화면3(기존 약속 참여하기)의 이름/비밀번호 입력을 실제 검증 로직으로 교체한다. 처음 보는 이름이면 신규 participant 생성, 기존 이름이면 비밀번호 확인 후 재접속. 관리자도 같은 흐름을 탄다(생성자가 이미 role='admin' participant이므로 자동 충족). `session.ts`를 participantId까지 포함한 실제 세션으로 교체한다.

디자인 목업 확인 결과 참여 화면엔 "참여 링크" 입력칸이 있고, 홈에서 들어올 땐 이 칸이 비어있어야 한다. 지금은 `/a/:id` 라우트뿐이라 id 없이 들어올 방법이 없으므로, `/join` 라우트를 새로 만들어 같은 화면을 공유하게 한다.

3회 비밀번호 실패 시 삭제 요청 기능(plan.md 13~14번)은 tasks.md가 후순위로 명시했으므로 이번 범위에서 제외한다.

## 확정된 설계 결정

- 이름+비밀번호는 한 폼에서 같이 제출(2단계 확인 없음). 서버가 신규/재접속/실패를 판단.
- 엔드포인트 하나로 통합: `POST /api/appointments/:id/participants` (이름 trim 후 조회 → 없으면 생성/201, 있으면 비밀번호 비교 → 200 또는 401)
- 상태 코드: 400(검증) / 404(약속 없음) / 401(비밀번호 불일치) / 500
- 관리자 비밀번호 분실도 별도 문구 없이 일반 "비밀번호가 일치하지 않아요"로 통일
- DB 마이그레이션 불필요(기존 participants 테이블로 충분). 실패 횟수 컬럼은 이번엔 안 만듦
- `POST /api/appointments` 응답에 관리자 `participantId` 추가 (Day2 계약 확장)
- `session.ts`는 `{ participantId, role }`을 저장/조회 (Role 타입은 shared에서 재사용)
- `/join` 라우트 신설 + `HomePage`의 "기존 약속 참여하기" 링크를 `/join`으로 변경
- 참여 폼을 `JoinAppointmentForm` 컴포넌트로 분리, `appointmentId?` prop으로 `/a/:id`(자동 채움+비활성)와 `/join`(빈 입력, 붙여넣은 링크에서 id 파싱) 공유
- 파싱 유틸 `parseAppointmentId(input): string | null` — 실패 시 "올바른 참여 링크가 아니에요" 에러

## 완료 기준

작업 순서의 번호와 1:1로 대응한다. 완료 표시는 여기서만 하고, 아래 "작업 순서" 섹션 자체는 수정하지 않는다.

### 묶음 1: 스키마 검토
- [x] 1. 기존 participants 스키마 검토 완료 — 결론: 새 마이그레이션 불필요, 기존 스키마 그대로 진행. 3회 실패 잠금 컬럼은 후순위로 미추가. `unique(appointment_id, name)`은 trim을 대신 해주지 않으므로 4~5번에서 trim 필수.

### 묶음 2: API 계약 정의
- [x] 2. `shared/src/participants.ts` 신설(요청/응답 타입) — `joinAppointmentRequestSchema`(name trim 처리 포함), `JoinAppointmentResponse`, `Role` 타입 정의, `index.ts` 재수출 완료
- [x] 3. `CreateAppointmentResponse`에 `participantId` 추가 — 서버 라우트가 아직 안 채워서 묶음3까지 타입 에러 상태(예정된 흐름)

### 묶음 3: BE 구현
- [ ] 4. `POST /api/appointments/:id/participants` 라우트 추가
- [ ] 5. 신규 생성/재접속 분기 로직(bcrypt 해시·비교)
- [ ] 6. 약속 생성 응답에 관리자 participantId 포함
- [ ] 7. supertest 테스트 추가(신규/재접속/401/404/400)

### 묶음 4: FE 세션 로직 교체
- [ ] 8. `session.ts`를 `{ participantId, role }` 구조로 교체
- [ ] 9. 기존 호출부(`AppointmentPage.tsx`, `NewAppointmentPage.tsx`) 갱신

### 묶음 5: 참여 진입점 라우팅 및 화면 공유 설계
- [ ] 10. `/join` 라우트 추가
- [ ] 11. `HomePage.tsx` 링크를 `/join`으로 변경
- [ ] 12. 링크 파싱 유틸(`parseAppointmentId`) 작성
- [ ] 13. `JoinAppointmentForm` 공유 컴포넌트 분리

### 묶음 6: FE 폼 연결
- [ ] 14. `JoinAppointmentForm`에 react-hook-form + zodResolver 연결
- [ ] 15. 제출 시 대상 appointmentId 결정 로직(prop 또는 파싱)
- [ ] 16. 실제 API 호출 연동(성공 시 세션 설정+이동)
- [ ] 17. 실패 처리(401/400/네트워크·500)
- [ ] 18. `NewAppointmentPage.tsx`의 `setRole` 호출을 세션 함수로 교체

### 묶음 7: 통합 확인
- [ ] 19. 관리자 재접속 시나리오 수동 확인
- [ ] 20. 전체 워크스루(초대링크 경로 / `/join` 경로 둘 다)

## 우선순위

- 높음 — Day4가 participantId 기준으로 응답을 저장해야 하므로 선행 필요
- 3회 실패 삭제 요청 기능은 후순위, 이번 범위 제외

## 작업 순서

아래 순서대로 진행한다. 각 묶음이 끝날 때마다 수동으로 동작을 확인한 뒤 다음 묶음으로 넘어간다.

### 1. 스키마 검토
1. 기존 `participants` 테이블 스키마로 이름+비밀번호 기반 신규 생성/재접속 흐름을 충분히 처리할 수 있는지 검토 — 3회 실패 잠금용 컬럼(failed_attempts 등) 추가 여부 결론(이번 Day3 범위에서는 미추가, 후순위로 명시)

이 묶음이 끝나면: 새 마이그레이션 파일 없이 기존 `0002_create_participants.sql` 스키마 그대로 진행해도 되는지 스스로 확인한다.

### 2. API 계약 정의
2. `shared/src/participants.ts` 신설 — `joinAppointmentRequestSchema`(name: trim 후 min 1, password: 숫자 4자리 regex) + `JoinAppointmentResponse` 타입(`participantId`, `role`) 정의, `shared/src/index.ts`에 재수출
3. 기존 `CreateAppointmentResponse`(`shared/src/appointments.ts`)에 `participantId` 필드 추가

이 묶음이 끝나면: 두 계약 타입만 보고 참여/재접속 요청·응답 모양과 약속 생성 응답 변경분을 서로 설명할 수 있는지 확인한다.

### 3. BE 구현
4. `POST /api/appointments/:id/participants` 라우트 추가 — zod 검증, 약속 존재 확인(없으면 404), 이름 trim 후 조회
5. 신규 이름이면 bcrypt 해시 후 participant 생성(role=participant, 201) / 기존 이름이면 `verifyPassword`로 비교해 일치 시 기존 participantId+role 반환(200), 불일치 시 401 + 안내 메시지
6. 기존 `POST /api/appointments` 핸들러 수정 — participants insert에 `.select('id')` 추가해 응답에 관리자 participantId 포함
7. supertest 테스트 추가/보완 — 신규 생성, 재접속 성공, 비밀번호 불일치(401), 존재하지 않는 약속(404), 필수값 누락(400), 기존 `appointments.test.ts`의 participants insert mock 결과값 갱신(participantId 포함하도록)

이 묶음이 끝나면: curl/Postman으로 같은 이름에 대해 (1)최초 요청 → 신규 생성, (2)같은 비밀번호로 재요청 → 재접속, (3)틀린 비밀번호 → 401이 되는지 직접 확인한다.

### 4. FE 세션 로직 교체
8. `client/src/lib/session.ts`를 role만 저장하던 구조에서 `{ participantId, role }`을 함께 저장/조회하는 구조로 교체(예: `setSession`/`getSession`) — `Role` 타입은 shared에서 가져와 재사용
9. `session.ts`를 사용하던 기존 호출부(`AppointmentPage.tsx`, `NewAppointmentPage.tsx`)를 새 인터페이스에 맞춰 갱신

이 묶음이 끝나면: 브라우저 개발자 도구에서 localStorage에 participantId까지 저장되는지 직접 확인한다.

### 5. 참여 진입점 라우팅 및 화면 공유 설계
10. `App.tsx`에 `/join` 라우트 추가 — id route param 없이 참여 화면에 진입하는 경로
11. `HomePage.tsx`의 "기존 약속 참여하기" 링크를 `/a/demo`(Day1 스텁)에서 `/join`으로 변경
12. 참여 링크 파싱 유틸 작성 — `client/src/lib/appointmentLink.ts`의 `parseAppointmentId(input: string): string | null`(전체 URL에서 `/a/<id>` 패턴 추출, 실패 시 null)
13. 참여 화면 공통 컴포넌트 분리 — `client/src/components/JoinAppointmentForm.tsx`를 신설해 `appointmentId?: string` prop을 받고, 있으면 링크 입력칸을 `${origin}/a/${appointmentId}`로 채운 disabled 필드로, 없으면(=`/join` 진입) 빈 편집 가능 필드(placeholder "공유받은 링크를 붙여넣으세요")로 렌더링. `AppointmentPage.tsx`(role 없을 때)와 신설 `JoinAppointmentPage.tsx`(`/join`) 양쪽에서 이 컴포넌트를 재사용

이 묶음이 끝나면: `/join`으로 직접 들어갔을 때 링크 입력칸이 비어있고 편집 가능한지, `/a/:id`로 들어갔을 때는 여전히 링크가 자동으로 채워지고 비활성 상태인지 화면에서 확인한다.

### 6. FE 폼 연결 (실제 참여 API 연동)
14. `JoinAppointmentForm`을 react-hook-form + zodResolver(`joinAppointmentRequestSchema`) 기반으로 구성 — 이름/비밀번호 필드 검증
15. 제출 시 대상 `appointmentId` 결정 로직 연결 — prop으로 받은 id가 있으면 그대로 사용, 없으면(=`/join`) 링크 입력값을 12번 유틸로 파싱해 id 추출(파싱 실패 시 링크 필드에 "올바른 참여 링크가 아니에요" 에러를 표시하고 API 호출로 넘어가지 않음)
16. 결정된 id로 `POST /api/appointments/:id/participants` 호출 — 성공 시 세션 설정(participantId/role) 후, `/join`에서 왔다면 `/a/:id`로 이동, `/a/:id`에서 이미 있었다면 그 자리에서 role 갱신
17. 실패 처리 — 401(비밀번호 불일치) 안내+재입력 유도, 400 필드 에러 표시, 네트워크/500 공통 에러 메시지
18. `NewAppointmentPage.tsx`의 기존 `setRole(...)` 호출을 확장된 세션 설정 함수 호출로 교체(participantId 포함, Day2 계약 확장분 반영)

이 묶음이 끝나면: 홈 → "기존 약속 참여하기" → `/join`에서 실제 링크 붙여넣기 → 이름/비밀번호 입력 → 신규 참여자 생성 후 `/a/:id`로 이동하는지, 초대 링크로 바로 `/a/:id`에 진입했을 때도 동일하게 동작하는지 확인한다.

### 7. 통합 확인
19. 관리자 재접속 시나리오 수동 확인 — localStorage를 비운 새 세션/다른 브라우저에서 생성자 이름+비밀번호로 입장했을 때 관리자 대시보드가 뜨는지 확인(초대 링크 경로/`/join` 경로 둘 다)
20. 전체 워크스루 — (a) 초대 링크 직접 클릭 → 참여 → 재접속, (b) 홈 → `/join` → 링크 붙여넣기 → 참여 → 재접속, 두 경로 모두 처음부터 끝까지 수동 시나리오 확인

이 묶음이 끝나면: 두 진입 경로(초대 링크 직접 진입 / 홈 경유 `/join`) 모두 끊김 없이 동작하는지 최종 확인한다.

## 이슈/커밋 전략

- 이슈: "Day3: 약속 참여 및 재접속 기능 개발"
- 브랜치: `feat/day3-participant-join`
- 커밋: 스키마 검토 → API 계약 → BE 구현 → 세션 로직 교체 → 참여 진입 라우팅 → FE 폼 연결 (묶음별로)
- PR: 사용자가 직접 진행

## 참고 사항

- `docs/rules/plan/plan.md` 1~17번, `docs/rules/tasks.md` 37번째 줄(후순위 근거)
- `server/db/migrations/0002_create_participants.sql`, `server/src/lib/password.ts` 그대로 재사용
- `client/src/lib/session.ts`, `client/src/pages/AppointmentPage.tsx`, `HomePage.tsx`, `App.tsx` — 이번에 교체/추가 대상
- `client/src/components/Modal.tsx` — 신설할 `JoinAppointmentForm` 컴포넌트 스타일 참고
- `AdminDashboard`/`ParticipantDashboard`에 participantId 전달하는 건 Day4 이후 범위
