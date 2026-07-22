# Hub 전체 코드·문서 감사 보고서

- 감사일: 2026-07-22
- 감사 기준: 감사 당시 로컬 작업 트리(기존 미커밋 변경 포함)
- 대상: `client/`, `server/`, `shared/`, `docs/`, DB migration, 테스트, 설정, CI, 배포, 자산, 의존성
- 원칙: 감사 중 소스 코드는 수정하지 않았으며, 본 문서는 사용자의 후속 요청에 따라 새로 작성했다.

## 1. 요약

현재 상태로는 외부 공개 배포를 권장하지 않는다. 가장 큰 이유는 리팩터링이나 UI 완성도가 아니라 인증·인가 결함이다. 초대 링크의 약속 ID만 알면 참가자 ID를 수집해 타인의 응답을 읽거나 덮어쓰고, 관리자 ID를 찾아 투표를 강제 마감할 수 있다.

프로젝트 소유 파일 147개 전체와 현재 미추적 소스, `docs/`, 숨김 설정, 마이그레이션, 프로토타입, 이미지, 패키지 잠금·의존성, 기존 생성물을 확인했다. `node_modules`와 `.git` 내부 객체는 프로젝트 소스처럼 줄 단위로 검토하지 않고 의존성 감사와 저장소 상태로 점검했다.

가장 먼저 처리할 순서는 다음과 같다.

1. 인증 세션 도입 및 응답 소유권·관리자 권한 서버 검증
2. 참가자 ID 공개 제거 및 PIN rate limit 적용
3. `timeEnd` 의미 확정과 `24:00` 계약 오류 해결
4. deadline을 실제로 강제하거나 UI에서 제거
5. 응답 교체·가입·생성·마감의 DB 트랜잭션화
6. 입력값·UUID·body size·pagination 계약 정리
7. route ID 변경 시 stale state와 stale localStorage 복구
8. Modal·ScheduleGrid 접근성 및 실제 모바일 검증
9. CI 품질 게이트 도입 후 위험한 자동 병합 workflow 교체
10. 개발 의존성 취약점 처리

## 2. Critical: 인증·인가 결함

### 2.1 참가자 ID만으로 타인의 응답과 관리자 권한을 탈취할 수 있음

관련 위치:

- `server/src/routes/results.ts:86-98`
- `server/src/lib/results.ts:65-94`
- `server/src/routes/responses.ts:19-140`
- `server/src/routes/results.ts:16-40,101-143`
- `client/src/lib/session.ts:12-20`
- `client/src/pages/AppointmentPage.tsx:48-51`

현재 공격 흐름은 다음과 같다.

1. 인증 없이 `GET /api/appointments/{appointmentId}/participants` 호출
2. 모든 참가자의 `id`, 이름, 완료 여부 획득
3. 획득한 ID를 `GET/PUT .../:participantId/responses`에 넣어 타인의 응답 조회·변조
4. 각 ID로 `PUT .../:participantId/close`를 호출
5. 일반 참가자는 403, 관리자는 200을 반환하므로 관리자 ID를 식별해 즉시 마감

서버는 로그인 후 인증 세션을 발급하지 않으며, URL에 들어온 `participantId`가 DB에 존재하는지만 검사한다. close API 역시 요청자가 해당 관리자 ID의 소유자인지 증명하지 않는다. CORS는 브라우저 응답 공개 정책일 뿐 인증 수단이 아니다.

클라이언트도 localStorage의 `participantId`와 `role`을 신뢰한다. localStorage role 변조만으로 서버 권한을 얻는 것은 아니지만 관리자 UI를 노출하고, 서버의 ID 기반 취약점과 결합하면 전체 공격이 가능해진다.

필수 개선:

- 이름·비밀번호 확인 성공 시 서버가 서명한 세션 또는 충분히 긴 불투명 토큰 발급
- HttpOnly, Secure, SameSite 쿠키 또는 Authorization Bearer 인증 도입
- 서버 미들웨어가 인증 토큰에서 appointment, participant, role을 파생
- URL의 임의 participant ID를 신뢰하지 않는 `/me/responses` 형태 검토
- 참가자 목록과 마감 API에 관리자 인증 적용
- 참가자 목록 DTO에서 내부 UUID 제거
- 개인 응답에는 소유권 검사 및 `Cache-Control: no-store` 적용 검토
- 인증·소유권·관리자 권한에 대한 적대적 테스트 추가

## 3. High: 즉시 수정할 기능·보안 문제

### 3.1 4자리 PIN에 rate limit이 없음

관련 위치:

- `shared/src/appointments.ts:17`
- `shared/src/participants.ts:5-8`
- `server/src/routes/participants.ts:36-60`
- `server/src/lib/password.ts:5-13`
- `server/src/app.ts:12-26`

PIN 경우의 수는 10,000개뿐이다. bcrypt 저장은 평문 저장보다 낫지만 낮은 엔트로피와 무제한 온라인 시도를 해결하지 못한다. 반복 bcrypt 연산은 CPU DoS에도 악용될 수 있다.

개선:

- IP + appointment + name 기준 rate limit
- 실패 횟수, 지수 백오프, 일시 잠금, 감사 로그
- 더 긴 비밀번호 또는 충분히 큰 무작위 복구 코드
- 사용자 존재 여부를 과도하게 구분하지 않는 오류 응답
- PIN UX를 유지한다면 서버 pepper와 강한 온라인 제한을 함께 적용

### 3.2 `24:00` 슬롯은 화면에 나오지만 저장할 수 없음

관련 위치:

- `client/src/components/TimeRangeSlider.tsx:9-19`
- `shared/src/schedule.ts:4-7,53-70`
- `server/src/lib/schedule.test.ts`
- `docs/rules/checklist/subTask5.md:15`

`TimeRangeSlider`는 `00:00`부터 `24:00`까지 49개 옵션을 제공한다. 현재 작업 트리의 `generateSlots`는 종료 시각을 포함하지만 `scheduleSlotSchema`는 `23:30`까지만 허용한다.

실제 확인 결과:

- `23:30~24:00` 생성 결과는 `23:30`, `24:00`
- 같은 응답을 `submitResponseRequestSchema`로 검증하면 실패
- 사용자는 화면에 표시된 `24:00`을 선택한 후 저장 시 400을 받음

근본적으로 `timeEnd`가 마지막 슬롯 시작 시각인지 시간 범위 끝 경계인지 확정되지 않았다.

- 끝 경계라면 exclusive 방식이 자연스럽고 `24:00`은 경계로만 사용
- 마지막 시작 시각이라면 필드명과 안내를 바꾸고 `24:00` 슬롯 금지
- inclusive 방식이라면 `timeStart === timeEnd` 단일 슬롯 약속 허용 여부 결정
- UI, Zod, DB, 생성기, 테스트, 문서를 동시에 통일

### 3.3 응답 마감 UI가 실제 동작을 약속하지만 서버는 강제하지 않음

관련 위치:

- `client/src/pages/NewAppointmentPage.tsx:20,59-68,105-109`
- `shared/src/appointments.ts:11,39-48`
- `server/src/routes/appointments.ts:36`
- `server/src/lib/pgTime.ts:28-45`
- `server/src/routes/responses.ts:87-97`

UI는 날짜를 선택하면 offset 없는 `다음날T00:00:00`을 저장하고 “선택한 날짜 자정까지 응답을 받아요”라고 안내한다.

그러나 현재는 다음 문제가 있다.

- deadline을 DB에 저장만 함
- 상세 응답에 deadline이 없음
- 이후 화면에 deadline이 표시되지 않음
- 응답 PUT은 `closedAt`만 검사함
- deadline 이후에도 신규 참여와 응답 수정 가능
- 문서는 날짜+시간 선택을 완료했다고 적었으나 현재는 날짜만 선택
- offset 없는 문자열을 `timestamptz`에 넣어 DB 시간대에 따라 한국 자정과 다르게 저장될 수 있음

자동 스케줄러가 없어도 모든 쓰기 요청에서 `deadline <= now()`를 검사할 수 있다. 기능을 지원하지 않을 계획이라면 입력 필드와 “자정까지 응답을 받는다”는 안내를 제거하거나 참고용임을 명확히 해야 한다.

### 3.4 응답 수정이 `DELETE → INSERT`여서 기존 데이터가 유실될 수 있음

관련 위치:

- `server/src/routes/responses.ts:84-99,122-134`
- `server/db/migrations/0003_create_responses.sql:1-8`

가능한 문제:

- delete 성공 후 insert 실패 시 기존 응답 완전 유실
- 동시 제출의 delete/insert가 교차해 unique 오류 또는 예측 불가능한 최종 상태 발생
- delete와 insert 사이 조회 시 일시적으로 미응답으로 집계
- `closedAt === null` 확인 직후 관리자가 마감해도 기존 요청이 계속 insert 가능

DB RPC/함수 안에서 appointment 행을 잠그고 마감 상태와 deadline을 다시 확인한 뒤 delete+insert를 하나의 트랜잭션으로 처리해야 한다.

### 3.5 약속과 관리자 생성이 트랜잭션이 아님

관련 위치:

- `server/src/routes/appointments.ts:28-65`

약속을 먼저 만들고 이후 관리자 참가자를 삽입한다. bcrypt, 네트워크, 프로세스 오류가 나면 관리자 없는 약속이 남을 수 있다. 참가자 insert 실패 시 보상 delete를 수행하지만 delete 결과를 검사하지 않는다.

개선:

- 비밀번호 해시는 DB 쓰기 전에 계산
- 약속과 관리자 insert를 단일 DB 트랜잭션/RPC로 처리
- 실패 시 전체 rollback
- 생성 요청에 idempotency key 적용
- participant insert 실패와 rollback 실패 테스트 추가

### 3.6 정원 초과 race condition

관련 위치:

- `server/src/routes/participants.ts:64-92`
- `server/db/migrations/0001_create_appointments.sql:9`
- `server/db/migrations/0002_create_participants.sql:1-8`

참가자 수를 센 뒤 별도로 insert한다. 남은 한 자리에 두 요청이 동시에 들어오면 둘 다 count를 통과할 수 있다. 동일 이름 동시 가입의 unique violation도 현재는 500이 된다.

appointment 행을 잠근 트랜잭션 안에서 `closed/deadline/count/insert`를 함께 처리해야 한다.

### 3.7 약속 생성 입력 검증이 DB·슬롯 규칙과 불일치

관련 위치:

- `shared/src/appointments.ts:4-30`
- `shared/src/schedule.ts:4-7,53-70`
- `server/src/routes/appointments.ts:28-45`
- `server/db/migrations/0001_create_appointments.sql:3-9`

직접 검증했을 때 다음 입력이 현재 스키마를 통과했다.

- `timeStart: "a"`, `timeEnd: "b"`
- `09:01~09:02`
- `deadline: "garbage"`
- PostgreSQL integer 범위를 넘는 headcount
- 공백뿐인 제목과 생성자 이름
- `"2026"` 같은 불완전한 날짜

특히 `09:01` 약속은 DB에는 저장되지만 응답 슬롯 스키마가 `:00/:30`만 허용하므로 아무도 응답을 저장할 수 없다. 공백 생성자 이름은 생성 시 저장되지만 재접속 스키마에서 trim되어 관리자가 다시 로그인할 수 없다.

필요한 검증:

- 실제 달력상 유효한 `YYYY-MM-DD`
- `00:00~23:30` 범위의 30분 단위 시간
- offset 또는 명시적 시간대를 포함한 deadline
- 이름·제목에 `trim().min().max()`
- 합리적인 headcount 상한
- deadline과 약속 범위의 관계
- 동일 규칙의 DB CHECK 또는 RPC 방어

### 3.8 동일 route의 appointment ID 변경 시 이전 데이터가 남음

관련 위치:

- `client/src/pages/AppointmentPage.tsx:20-23`
- `client/src/lib/useAppointmentDetail.ts:7-30`
- `client/src/lib/useScheduleResponse.ts`
- `client/src/lib/useScheduleResult.ts:10-37`
- `client/src/lib/useCompletionStatus.ts:11-34`
- `client/src/lib/useParticipantsStatus.ts:7-30`
- `client/src/lib/useMyResponseStatus.ts:8-33`

`/a/A`에서 `/a/B`로 같은 route의 parameter만 바뀌면 `AppointmentPage`의 세션 state initializer는 다시 실행되지 않는다. 모든 조회 훅도 ID 변경 시 loading, error, data를 초기화하지 않는다.

그 결과 A의 role, participant ID, 상세, 선택, 마감 상태가 B 화면에 잠시 또는 요청 실패 후 계속 남을 수 있다.

개선:

- ID에서 세션을 직접 파생하거나 route를 ID로 key 처리
- query key 기반 데이터 계층 사용
- dependency 변경 시 loading, error, data를 원자적으로 초기화
- A→B 전환 회귀 테스트 추가

### 3.9 Express 4 async 오류 처리 계층이 없음

관련 위치:

- `server/package.json`
- `server/src/app.ts:10-29`
- 모든 async route handler

Supabase 또는 bcrypt가 결과 객체가 아니라 Promise rejection을 던지면 요청 중단이나 unhandled rejection으로 이어질 수 있다. malformed JSON, 413, 미등록 API도 기본 HTML 오류가 될 수 있다.

개선:

- 공용 `asyncHandler`
- JSON 404 및 중앙 오류 미들웨어
- Zod, DB, 외부 의존성, 예상하지 못한 오류 구분
- request ID와 구조화 로그
- Supabase 호출 timeout/abort
- 민감정보 redaction

### 3.10 CI 없이 PR을 자동 병합함

관련 위치:

- `.github/workflows/auto-merge.yml`

현재 workflow는 main 대상 PR만 건너뛰고 나머지 열린 PR을 기본 병합한다.

문제:

- 승인과 required review를 확인하지 않음
- build, lint, test, status check를 확인하지 않음
- draft 여부 미확인
- 마지막 review 1개만 확인
- conflict PR을 자동 close
- merge 실패를 catch/log만 해 workflow가 성공처럼 끝날 수 있음
- main PR에 매일 오해를 부르는 댓글을 남길 수 있음
- PR 100개, label 10개, review 1개 제한과 pagination 없음
- `mergeable: UNKNOWN`도 기본 merge 시도
- Action을 commit SHA가 아닌 `@v7` tag로 고정
- concurrency와 timeout 없음
- 별도 CI workflow 자체가 없음

먼저 CI를 만들고 자동 병합은 명시적 opt-in label, 승인, required checks 성공이 모두 충족될 때만 수행해야 한다. conflict 자동 close는 제거해야 한다.

## 4. Medium: 서버·API·DB 개선 사항

### 4.1 마감 후에도 신규 참여 가능

`server/src/routes/participants.ts:23-27`은 약속 조회 시 `id, headcount`만 확인한다. 마감 후 신규 참가자는 가입은 되지만 응답 제출은 409가 되어 사용할 수 없는 상태가 된다. 결과 확정 후 참가자 집합도 변한다.

### 4.2 close가 동시 요청에서 진정한 멱등이 아님

`server/src/routes/results.ts:109-133`은 먼저 `closed_at`을 읽고 별도 update를 한다. 동시 요청이 모두 null을 읽으면 서로 다른 시각을 저장·반환할 수 있다.

`UPDATE ... SET closed_at = now() WHERE closed_at IS NULL RETURNING closed_at` 형태로 원자화하고 DB 시계를 사용해야 한다.

### 4.3 정상 최대 요청이 Express body 한도를 초과함

관련 위치:

- `server/src/app.ts:15`
- `shared/src/schedule.ts:15-19`

Express JSON 기본 한도는 100KB인데 공유 스키마는 available/preferred 각각 최대 2,000개를 허용한다. 31일 × 48슬롯을 양쪽 배열에 담은 요청은 약 110,151바이트였고 실제 HTTP 경계에서 `413 text/html`이 반환됐다.

개선:

- 실제 최대 슬롯 수에 맞는 배열 제한
- 중복 슬롯 거부
- 명시적이고 안전한 body limit
- 413 JSON 오류 처리
- 필요하면 압축된 슬롯 표현 사용

### 4.4 대량 조회에 pagination이 없음

관련 위치:

- `server/src/routes/responses.ts:48-65`
- `server/src/lib/results.ts:13-33,65-94`

한 사람의 유효 슬롯도 최대 약 1,488개다. PostgREST 프로젝트의 row cap 설정에 따라 응답이 잘릴 수 있지만 `.range()`나 pagination이 없다. 결과 집계도 참가자 ID 전체를 `.in(...)` URL에 넣고 모든 원시 응답을 애플리케이션 메모리에서 계산한다.

개선:

- DB view/RPC에서 appointment join + `GROUP BY date,time`
- `COUNT(DISTINCT participant_id)`
- 참가자 완료 여부는 `EXISTS` 또는 left join
- 명시적인 전체 pagination
- headcount 상한

### 4.5 DB 오류·미존재·잘못된 ID의 HTTP 의미가 섞여 있음

예:

- `getAppointmentDetail`이 DB 오류와 미존재를 모두 `null`로 반환
- 상세 API는 DB 장애도 404
- 결과 API의 미존재 약속은 500
- response-status와 participants는 미존재 약속에 빈 결과 200
- participant 조회 DB 오류도 404
- 경로 UUID 형식 자체를 검증하지 않음

Repository 결과를 `found/notFound/dbError`로 분리하고 잘못된 UUID 400, 미존재 404, DB 장애 503 또는 일관된 500으로 처리해야 한다.

### 4.6 환경변수 누락 상태로 health가 200을 반환함

관련 위치:

- `server/src/lib/env.ts:4-9`
- `server/src/lib/supabase.ts:5-14`
- `server/src/app.ts:19-21`

Supabase URL과 service role key가 optional이어서 DB가 설정되지 않아도 서버가 기동되고 `/api/health`가 정상 응답한다. 핵심 API만 500이 된다.

- production에서는 필수 env를 시작 시 검증
- liveness와 DB readiness 분리
- PORT 정수·범위, Supabase URL, 허용 origin 목록 검증

### 4.7 API 응답에 런타임 검증이 없음

`shared/src/results.ts`, `appointments.ts`, `schedule.ts`의 응답 계약은 대부분 TypeScript type뿐이다. `axios.get<T>`는 런타임 보장이 아니다.

공유 response Zod schema를 만들고 클라이언트 API 경계에서 parse해야 한다.

### 4.8 Supabase 생성 타입을 사용하지 않음

`SupabaseClient`에 Database generic이 없고 여러 DB 결과를 `as`로 단언한다. Supabase CLI 생성 타입과 `createClient<Database>()`를 적용해야 컬럼·nullable 변경을 컴파일 단계에서 잡을 수 있다.

### 4.9 RLS가 서버의 service role 접근을 보호하지 못함

마이그레이션에서 RLS를 활성화했지만 서버는 service role을 사용하므로 RLS를 우회한다. anon 접근은 fail-closed지만 서버 내부 데이터 격리는 route의 `.eq(...)` 조건에만 의존한다.

- service role 노출 범위 최소화
- 제한된 서버 역할 또는 엄격한 SECURITY DEFINER RPC 검토
- 함수 내부에서 appointment, participant, role 검증
- anon 직접 접근 차단 RLS 테스트

### 4.10 조회 순서와 completedAt이 비결정적

조회에 `.order()`가 없고 응답 조회는 임의의 첫 행 `created_at`을 completedAt으로 사용한다. 제출 단위를 별도 row로 모델링하거나 명시적 timestamp 집계와 정렬이 필요하다.

### 4.11 participant ID가 로그에 남음

Morgan이 개인 응답과 마감 URL 전체를 기록한다. 현재 participant ID가 사실상 권한 수단이라 접근 로그·프록시 로그·브라우저 기록에 자격증명이 남는 것과 같다. 인증 구조 변경과 path redaction이 필요하다.

### 4.12 명시적인 보안 헤더 정책이 없음

앱 또는 배포 설정에 CSP, Referrer-Policy, X-Content-Type-Options 등의 명시적 정책이 없다. 인증 개선 후 쿠키 정책과 CSRF 검토를 포함해 보안 헤더를 정리해야 한다.

## 5. Medium: 클라이언트 상태·UX

### 5.1 stale localStorage 세션에서 복구할 방법이 없음

관련 위치:

- `client/src/lib/session.ts:12-28`
- `client/src/pages/AppointmentPage.tsx:20,42-44`
- `client/src/lib/useJoinAppointment.ts:35-39`

localStorage에 구조상 유효한 세션이 있으면 서버 검증 없이 참여 폼을 건너뛴다. 참가자가 삭제됐거나 DB가 초기화되면 오류 대시보드에 갇힌다. 같은 브라우저에서 다른 사용자로 참여하는 기능도 없다.

개선:

- 진입 시 서버 세션 검증
- 401/404에서 해당 세션 제거 후 참여 폼 복구
- 로그아웃과 “다른 사용자로 참여” 제공
- 세션 만료와 다른 탭 동기화

### 5.2 localStorage 오류가 중복 약속 생성으로 이어질 수 있음

`NewAppointmentPage.tsx:41-55`는 POST 성공 후 `setSession`과 navigation도 같은 `try` 안에서 수행한다. storage 오류가 나면 이미 생성된 약속을 “생성 실패”로 표시해 사용자가 재시도할 수 있다.

서버 성공, 로컬 저장 실패, navigation 실패를 분리하고 이미 생성된 약속으로 이동할 복구 경로가 필요하다.

### 5.3 세션이 없어도 개인 API를 먼저 호출함

`SchedulePage.tsx`와 `ResultPage.tsx`는 redirect 판단 전에 데이터 훅을 호출한다. 빈 participant ID 요청과 불필요한 상세·결과 요청이 먼저 시작된다.

인증 gate와 데이터 컴포넌트를 분리하거나 훅에 `enabled` 조건을 넣어야 한다.

### 5.4 도메인 오류를 일반 장애로 처리함

참가자가 편집하는 사이 관리자가 마감하면 PUT 409를 받지만 현재는 “잠시 후 다시 시도”만 표시한다.

- 409: 마감 안내 후 결과 또는 대시보드 이동
- 404/401: stale session 복구
- 400: 검증 오류
- 네트워크/5xx: 제한적 재시도

### 5.5 timeout·실제 abort·재시도 UI가 없음

모든 fetch 훅의 `cancelled` boolean은 state update만 막고 네트워크 요청은 취소하지 않는다. 요청이 멈추면 spinner나 제출 모달이 무기한 잠길 수 있다.

설치돼 있으나 미사용인 React Query를 적용하거나 공용 Axios 계층에 AbortSignal, timeout, bounded retry, focus refetch를 구현하는 것이 좋다.

### 5.6 로딩·오류 중에도 위험 CTA가 활성화됨

AdminDashboard와 ParticipantDashboard의 마감·일정 투표 CTA가 상세 상태 gate 밖에 있다. `closedAt` 초기값이 null이므로 마감된 약속도 로딩 중 투표·마감 버튼을 표시하며 조회 실패 후에도 동작이 남는다.

### 5.7 관리자 진행 현황이 자동 갱신되지 않음

완료 수와 참가자 목록은 mount 시 한 번만 읽는다. 오래 열린 관리자 화면은 다른 참가자의 제출을 반영하지 않아 잘못된 시점에 마감할 수 있다.

Polling, focus refetch, 수동 새로고침 또는 Supabase realtime이 필요하다.

### 5.8 일정 선택 2단계에서 이전 단계로 돌아갈 수 없음

“다음”을 누른 후 가능 시간 선택을 수정할 이전 버튼이 없다. 상태를 보존한 이전 단계 이동이 필요하다.

### 5.9 결과 안내와 실제 순위 기준이 다름

`ResultHeatmap`은 “색이 진할수록 더 많은 사람이 선호”한다고 안내하지만 실제 `rankSlots`는 가능 인원 우선, 동률일 때 선호 인원을 비교한다.

“가능 인원이 많고, 동률이면 선호 인원이 많은 순”이라고 정확히 설명하고 색상이 절대 비율이 아닌 상대 순위임을 안내해야 한다.

### 5.10 결과·참가자 empty state가 없음

마감 후 응답이 없으면 회색 비활성 그리드만 보이고 참가자가 없으면 빈 목록만 보인다. 원인과 다음 행동을 안내하는 명시적 empty state가 필요하다.

### 5.11 복사 실패를 조용히 무시함

Clipboard API가 없거나 권한이 거부되면 아무 반응도 없다. 읽기 전용 input, 전체 선택, fallback copy와 실패 안내를 제공해야 한다.

### 5.12 직접 진입 시 뒤로가기가 외부 사이트로 이동할 수 있음

`Layout.tsx`의 `navigate(-1)`은 초대 링크 직접 방문 시 앱 내부 상위 화면이 아닐 수 있다. 앱 내 fallback 경로가 필요하다.

## 6. 현재 미커밋 변경에서 발견된 회귀 위험

감사 시작 전에 다음 변경이 이미 존재했다.

- `client/src/components/Modal.tsx`
- `client/src/components/ResultHeatmap.css`
- `client/src/components/ResultHeatmap.tsx`
- `client/src/components/ScheduleEditor.tsx`
- `client/src/components/ScheduleGrid.tsx`
- `client/src/pages/ResultPage.tsx`
- `docs/rules/checklist/subTask5.md`
- `server/src/lib/schedule.test.ts`
- `shared/src/schedule.ts`
- 미추적 `client/src/components/ResultHeatmap.test.tsx`

### 6.1 Modal effect가 부모 렌더마다 포커스를 빼앗을 수 있음

`Modal.tsx`의 effect는 `[open, onClose]`에 의존하지만 모든 사용처가 inline `onClose`를 넘긴다. 모달이 열린 상태에서 부모가 렌더되면 cleanup이 trigger로 포커스를 되돌리고 다시 dialog 카드로 옮긴다.

특히 달력에서 날짜를 선택해 부모 form이 렌더될 때 현재 날짜 버튼의 포커스가 카드로 튈 수 있다.

개선:

- `onClose` 최신값은 ref로 유지
- effect는 실제 open 전환만 추적
- 실제 닫힘·언마운트에만 trigger focus 복원
- `aria-labelledby`, `aria-describedby`, focus trap 적용
- 최상위 modal만 Escape 처리
- 배경 inert와 scroll lock 적용

### 6.2 long-press drag는 실제 모바일에서 실패할 가능성이 큼

`ScheduleGrid.tsx`는 pointerdown 300ms 뒤에 `body.style.touchAction='none'`을 설정한다. 브라우저는 gesture 시작 시 스크롤 여부를 결정하므로 먼저 pan을 시작해 `pointercancel`을 보낼 수 있다.

추가 문제:

- `preventDefault()`와 pointer capture 없음
- 기존 body inline `touchAction`, `userSelect`를 저장하지 않고 빈 문자열로 복원
- primary pointer·마우스 좌클릭 확인 없음
- multi-touch 및 pointer ID 구분 없음
- context menu 방지 없음
- 문서가 요구한 직사각형 범위가 아니라 실제 지나간 셀만 처리
- 실제 iOS/Android 테스트와 자동 테스트 없음

### 6.3 신규 ResultHeatmap 테스트 범위가 좁음

미추적 테스트는 클릭 성공과 disabled 두 경우만 확인한다.

누락된 검증:

- dialog accessible name
- Escape와 focus 복원
- 날짜 페이지 이동
- empty result
- 키보드 동작과 focus-visible
- mutable map·state 갱신

### 6.4 “만날 시간” 개수 표현이 모호함

`ScheduleEditor.tsx`는 전체 가능 수에서 선호 수를 빼 `availableOnlyCount`를 표시하면서 “만날 시간 N건 · 선호 시간 M건”이라고 표현한다. 선호 슬롯도 만날 수 있는 시간에 포함되므로 총수에서 빠진 것처럼 보인다.

“일반 가능 N건 · 선호 M건”이라고 명확히 하거나 전체 가능 수와 선호 수를 각각 표시해야 한다.

### 6.5 ResultHeatmap 계획 문서와 구현 차이

`subTask5.md`는 `:focus-visible` 스타일 추가를 계획하지만 현재 CSS에는 명시적 focus-visible 스타일이 없다. Modal 접근성도 role과 Escape 일부만 적용됐으며 접근 가능한 이름과 focus trap은 빠져 있다.

## 7. 접근성·반응형

### 7.1 일정 그리드 버튼에 accessible name이 없음

`ScheduleGrid.tsx`의 버튼은 `aria-pressed`만 있고 날짜·시간 이름이 없다. 스크린리더 사용자는 어떤 슬롯인지 알 수 없다.

필요 사항:

- 날짜, 시간, 선택 상태가 포함된 버튼 이름
- table caption
- 날짜 `<th scope="col">`
- 좌상단 빈 header 의미 처리

### 7.2 시간 select label 구조가 잘못됨

시작·종료 문구는 `<span>`이고 두 select가 바깥 label 하나에 들어간다. 각각 고유 id와 `<label htmlFor>`를 사용하고 fieldset/legend로 그룹화해야 한다.

### 7.3 ProgressBar에 시맨틱 정보가 없음

현재 시각적 div일 뿐이다. `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, label이 필요하며 퍼센트는 0~100으로 clamp해야 한다.

### 7.4 폼 오류가 input·보조기기에 연결되지 않음

생성·참여 폼에 `aria-invalid`, `aria-describedby`, async 오류 live region, 최초 오류 focus 이동이 없다. custom control의 `setValue`에도 `shouldValidate`, `shouldDirty`, `shouldTouch`가 없어 값을 수정해도 오류가 다음 제출까지 남을 수 있다.

### 7.5 색상 대비와 색상 단독 표현

대표 측정값:

- 흰 글자 / `#3182F6`: 약 3.71:1
- 오류 `#F04452` / 흰 배경: 약 3.71:1
- placeholder 계열: 약 1.82:1

현재 16px 버튼과 13px 오류 텍스트에는 부족하다. 가능·선호·heat level도 파란 명암에 주로 의존한다.

더 어두운 토큰, 패턴·아이콘·텍스트 보조, axe/contrast 자동 검사가 필요하다.

### 7.6 핵심 터치 타깃이 자체 디자인 기준보다 작음

저장소 디자인 규칙은 최소 44px을 요구하지만 다음 요소가 더 작다.

- 일정·결과 셀 36px
- 날짜 picker 버튼 34~36px
- 페이지 화살표 40px

### 7.7 Modal이 작은 화면에서 잘릴 수 있음

viewport 기반 max-height, 내부 overflow, safe-area 대응, 전역 `box-sizing:border-box`가 없다. 폭 320px, 가로 모드, 화상 키보드 환경에서 DayPicker와 하단 버튼이 접근 불가능할 수 있다.

### 7.8 모션 감소 설정 없음

전역 fade/slide animation과 progress transition에 `prefers-reduced-motion` 대응이 없다.

### 7.9 route별 문서 제목과 heading 체계 부족

HTML title은 항상 `hub`다. 일부 화면은 h1 없이 h2 또는 strong으로 시작하며 route 전환 후 main heading focus/announcement도 없다. wildcard 404와 route error 화면도 없다.

## 8. 성능·리팩터링·유지보수

### 8.1 초기 bundle과 이미지가 큼

모든 페이지가 `App.tsx`에서 정적 import된다. 기존 ignored build 기준 JS는 약 481KB였지만 현재 소스를 다시 build한 authoritative 수치는 아니다.

실제 `client/src/assets/logo.png`는 1254×1254, 438,095바이트이며 작은 header 이미지로 그대로 배포된다.

개선:

- route lazy loading
- 표시 크기 2배 정도의 최적화 PNG/WebP/AVIF 또는 SVG
- 이미지 width/height 명시
- bundle analyzer와 bundle budget

### 8.2 사용하지 않는 의존성·환경변수

- React Query는 설치됐지만 import가 없음
- client Supabase는 모듈만 있고 사용처 없음
- `VITE_API_BASE_URL`은 선언됐지만 모든 Axios 호출은 상대 `/api`
- `VITE_SUPABASE_*`도 현재 dead module만 사용
- 실제 server 환경에는 example/schema에 없는 추가 DB 변수명이 존재

현재 Vercel 같은 same-origin reverse proxy에서는 상대 `/api`가 맞지만 별도 origin 배포를 지원하려면 공용 Axios baseURL이 필요하다. 사용하지 않을 계획이면 변수, 의존성, dead module을 제거해야 한다.

### 8.3 중복 코드

주요 리팩터링 후보:

- Admin/Participant dashboard의 제목, 기간, 진행률, 링크 영역
- ScheduleGrid/ResultHeatmap의 날짜·시간 축, header, cell CSS
- 모든 fetch hook의 loading/error/cancelled boilerplate
- `requireParticipant`와 `requireAdminParticipant`
- route 안에 섞인 검증, DB, 도메인, HTTP 오류 책임
- `pgTime.ts`에 섞인 시간 유틸과 appointment repository 역할

권장 구조는 `auth middleware → service → typed repository → route response mapper`다.

### 8.4 shared package build가 개발 중 자동 갱신되지 않음

루트 `predev`는 shared를 시작 전에 한 번만 build한다. shared watch가 없어 실행 중 shared/src 변경이 client/server에 즉시 반영되지 않을 수 있다.

server `start`는 prebuild 없이 ignored `dist/index.js`를 실행한다. 감사 당시 로컬 dist에는 일부 source 변경이 반영되지 않은 stale 상태가 확인됐다.

### 8.5 server production build에 테스트가 포함됨

`server/tsconfig.json`은 `src` 전체를 include한다. 기존 `server/dist`에 단위·통합 테스트와 integration helper까지 생성돼 있다.

build용 tsconfig에서 `*.test.ts`, `*.integration.test.ts`, helper를 제외하고 test tsconfig를 분리해야 한다.

### 8.6 shared는 ESLint 대상이 아님

`eslint.config.js`는 client와 server만 대상으로 한다. shared를 명시적으로 lint하면 적용 설정이 없어 ignored 오류가 발생한다. shared용 TypeScript lint 블록과 자체 test script가 필요하다.

### 8.7 설명·작업 이력 주석이 과도함

`study:`와 `claude:` 주석이 문법 설명, 과거 변경 이력, 작업 계획까지 장문으로 남아 핵심 불변식을 가린다. 특히 CORS가 특정 origin의 요청만 “받는다”는 설명은 부정확하다.

보안 이유, 트랜잭션 경계, 비자명한 불변식만 남기고 학습 기록과 변경 이력은 별도 문서나 Git으로 이동하는 것이 좋다.

## 9. 테스트·검증 결과

### 9.1 실행 결과

- client typecheck: 통과
- client 테스트: 7개 파일, 42개 전부 통과
- server typecheck: 통과
- shared typecheck: 통과
- server 단위 테스트: 8개 파일, 49개 전부 통과
- root ESLint: 오류 0, 경고 1
- 경고: `client/src/components/ToastProvider.tsx:34`의 `react-refresh/only-export-components`
- `git diff --check`: 오류 없음
- production dependency audit: 취약점 0건
- build: 생성물 쓰기를 피하기 위해 실행하지 않음
- live browser: 사용 가능한 브라우저 런타임이 없어 실제 모바일 gesture와 시각 QA는 수행하지 못함

테스트가 통과하더라도 현재 보안상 잘못된 무인증 성공 동작 자체가 정상 계약으로 테스트되고 있어 안전성을 의미하지 않는다.

### 9.2 핵심 테스트 공백

- 인증, 소유권, 관리자 권한 우회
- 공개 participant ID 공격
- PIN brute-force와 rate limit
- 트랜잭션 rollback과 insert 실패
- 동시 정원, 동시 close, close-submit race
- deadline과 `24:00`
- 100KB 경계, pagination, 대량 행
- 잘못된 UUID, 없는 appointment, DB 장애
- Modal focus, Escape, onClose identity
- ScheduleGrid long-press, ghost click, pointercancel, multi-touch
- route ID 변경
- storage 예외와 stale session
- Dashboard 상태 전환과 갱신
- 실제 DateRangeField와 TimeRangeSlider
- clipboard 실패
- 반응형, 접근성, 색 대비
- 생성→참여→응답→수정→마감→결과 전체 E2E

서버의 Supabase mock builder는 `.eq()`, `.in()`, select, insert payload를 충분히 검증하지 않아 appointment 필터가 빠져도 테스트가 통과할 수 있다.

### 9.3 통합 테스트의 실제 DB 안전 문제

관련 위치:

- `server/src/routes/integrationHelpers.ts`
- `server/src/routes/*.integration.test.ts`

Supabase 환경변수가 있으면 어떤 프로젝트인지 확인하지 않고 실제 row를 생성·삭제한다. 생성 status를 확인하지 않고 body를 string으로 단언하며 cleanup 오류도 무시한다.

감사 과정에서 통합 테스트가 한 번 실행됐다.

- 13개 중 12개 통과, 1개 실패
- 최초 POST에서 `PGRST303: JWT issued at future`로 500
- helper가 실패를 확인하지 않아 `undefined` ID의 후속 404로 원인을 왜곡
- 성공 테스트가 만든 임시 약속은 `afterEach` cleanup 대상에 등록되어 삭제가 시도됨
- cleanup 오류를 검사하지 않으므로 잔여 데이터가 없다고 독립적으로 증명할 수는 없음
- 기존 실행 중인 개발 서버는 건드리지 않음

필수 개선:

- 전용 테스트 Supabase 프로젝트 또는 격리 schema
- `ALLOW_INTEGRATION_TESTS=true` 같은 명시적 opt-in
- URL/project ref allowlist와 production 차단
- create helper의 status/body fail-fast 검증
- cleanup 결과 assertion과 누수 보고

## 10. 의존성·도구 설정

### 10.1 개발 의존성 취약점 7건

2026-07-22 기준 `npm audit` 결과:

- Critical 1
- High 3
- Moderate 3
- production dependency만 검사하면 0건

직접 관련 패키지:

- Vitest 2.1.9: Critical, `GHSA-5xrq-8626-4rwp`
- Vite 5.4.21: Windows path, UNC, 개발 서버 관련 High 취약점 포함
- concurrently 9.2.3: 하위 shell-quote quadratic DoS

`client/vite.config.ts`가 `host:true`여서 취약한 개발 서버가 LAN 인터페이스에 노출되는 점도 고려해야 한다.

concurrently는 wanted 9.2.4가 있으며 Vite/Vitest는 패치된 지원 major로 계획된 마이그레이션이 필요하다. React 19, Router 8, Express 5, Zod 4, Vite 8, Vitest 4, TypeScript 7 등 major 업데이트는 일괄 갱신하지 말고 별도 회귀 테스트와 함께 진행해야 한다.

### 10.2 실행 버전·품질 명령이 고정되지 않음

루트 package에 `engines`, `packageManager`, 통합 `typecheck`, `format:check`, `check`, coverage script가 없다. Node/npm 버전을 고정하고 CI와 배포에서도 동일하게 사용해야 한다.

### 10.3 `shared`라는 package 이름이 지나치게 일반적

`"shared": "*"` 때문에 `npm outdated`가 로컬 패키지를 registry의 동명 패키지와 비교한다. monorepo 밖에서 server만 설치할 때 공개 동명 패키지를 받을 위험도 있다.

`@hub/shared` 같은 scoped name과 명시적 workspace dependency가 더 안전하다.

## 11. 배포·DB 운영

### 11.1 Vercel 설정은 현행 문법과 맞지만 운영 전제가 문서화되지 않음

`vercel.json`의 `services`와 service rewrite 문법은 2026년 7월 기준 현행 Vercel 형식에 부합한다. Express default export도 지원 형태다.

다만 다음이 빠져 있다.

- Services가 Beta라는 점
- Dashboard Framework Preset을 `Services`로 설정해야 한다는 점
- service별 env scope
- Vercel CLI, Node, npm 버전
- preview smoke test
- config validation CI
- logs, rollback, 장애 대응
- `$schema`

참고:

- <https://vercel.com/kb/guide/vercel-services>
- <https://vercel.com/docs/services>
- <https://vercel.com/docs/services/config-reference>
- <https://vercel.com/docs/frameworks/backend/express>

### 11.2 migration 운영 절차가 없음

SQL 0001~0004와 destructive `reset.sql`은 있으나 다음이 없다.

- migration runner와 적용 이력
- schema drift 검사
- 대상 DB 확인
- preview/prod 분리
- backup과 rollback
- 배포 전 migration 검증
- 데이터 보존·삭제·복원 정책

`reset.sql`의 운영 DB 금지 안전장치도 주석뿐이다.

## 12. 문서 감사

### 12.1 README가 온보딩 문서 역할을 못 함

현재 README는 제목과 외부 링크 3개뿐이다.

필요 내용:

- 제품 목적과 현재 지원 기능
- architecture와 route/API 개요
- Node/npm 요구 버전
- `npm ci`, env 복사
- migration 적용 순서
- dev/build/lint/test/integration 실행법
- 통합 테스트 DB 안전 주의
- Vercel Services 설정
- 배포, rollback, 장애 대응
- 데이터 보존, 삭제, 개인정보
- 기여 규칙과 라이선스

### 12.2 체크리스트 상태가 구현과 맞지 않음

- 부모 Day1/Day2/2주차 문서는 대부분 미체크인데 구현은 존재
- `subTasks.md`는 핵심 사이클 완료라고 쓰면서 하위 체크박스는 비어 있음
- subTask1~4는 대부분 완료
- 현재 subTask5는 진행 상태와 기준 commit 없이 모두 미체크

각 문서에 `Status`, `Last verified commit/date`, `Superseded by`를 넣고 active specification과 historical plan을 분리해야 한다.

### 12.3 종료 시각 문서가 서로 반대

Day4 체크리스트는 종료 시각 exclusive를 정의하지만 subTask5는 inclusive를 요구한다. 현재 `24:00` 계약 오류의 직접 원인이다.

### 12.4 rc-slider 완료 표시는 사실과 다름

문서는 dual-handle rc-slider 설치와 적용을 완료로 표시하지만 package에 rc-slider가 없고 실제 구현은 select 두 개다. 현재 UX가 최종 결정이면 컴포넌트명과 문서를 수정해야 한다.

### 12.5 화면 번호·제품명·로고 기준이 통일되지 않음

- design 문서: 10개 화면
- 프로토타입 이미지: 12개 화면
- Day1: 10개 화면 + 모달
- subTask4: 다른 의미의 10/11/12
- 제품명: `hub`, `PREFER`, `선호시간`
- 실제 앱 로고와 디자인 참고 이미지가 다름

`route → 화면명 → 문서 번호 → 컴포넌트` 표와 canonical 제품명·로고 source를 확정해야 한다.

### 12.6 Toast·ProgressBar 설명이 구현과 모순

문서는 CopyLinkBox가 전역 Toast를 사용한다고 완료 표시하지만 실제로는 로컬 “복사됨” 상태를 쓰고 실패를 무시한다. ProgressBar가 퍼센트를 렌더한다고 적은 문서도 있지만 실제 컴포넌트는 bar만 렌더한다.

### 12.7 프로토타입이 현재 구현과 크게 다름

프로토타입에는 다음이 남아 있다.

- `prefer.app/j/...` URL
- 마감 후 재오픈
- AI 일정 입력, 설정, 하단 navigation
- 클릭 요소를 div로 구현
- modal semantics, focus, Escape 없음
- clipboard 실패에도 성공 안내
- 한 클릭으로 none→ok→pref→no 순환
- 일부 중복 날짜
- inline style과 반복 markup

유지하지 않을 자산이라면 `ARCHIVED / non-authoritative`와 기준 commit을 명시해야 한다.

### 12.8 CLAUDE 문서 설명이 부정확

- client/server 포트 모두 env override 가능하다고 하지만 Vite proxy는 4000 고정
- 모든 API 요청·응답이 공유 Zod라고 하지만 응답은 대부분 TS type
- React Query와 client Supabase를 주요 라이브러리로 기록했지만 실제 미사용
- requirements가 docs에 집중됐는데 기본적으로 docs를 읽지 말라고 해 문서 drift를 촉진

### 12.9 docs가 lint와 formatter에서 제외됨

ESLint와 Prettier 설정이 docs 전체를 제외한다. Markdown lint, link check, formatter, 문서 상태 검증을 CI에 추가하는 편이 좋다.

## 13. 저장소·자산 위생

### 13.1 `.env*` ignore가 example까지 막음

`.gitignore`의 `.env*`는 새 `.env.example`도 기본 ignore한다. 현재 example은 이미 tracked라 남아 있을 뿐이다.

`!.env.example`, `!**/.env.example` 같은 예외를 명시해야 한다. 감사한 tracked 파일과 Git history에서는 실제 env 또는 명백한 secret이 발견되지 않았다.

### 13.2 `.gitattributes`와 `.editorconfig` 없음

Windows `core.autocrlf=true` 환경에서 현재 변경 파일에도 LF→CRLF 경고가 발생한다. EOL, encoding, indent 규칙을 저장소에 고정해야 한다.

### 13.3 이미지 크기·출처 관리

- `client/src/assets/logo.png`: 1254×1254, 438,095바이트
- `docs/prototype/imag(edited).png`: 1448×1086, 약 1.44MB
- 일부 파일명은 용도가 불명확
- 원본, 라이선스, 생성 도구, 버전 설명이 없음

최적화된 자산, 명확한 파일명, provenance 기록이 필요하다.

### 13.4 로컬 `.git` 크기

감사 당시 로컬 `.git`은 약 317MB였고 unreachable 객체가 다수 있었다. Codex checkpoint/turn refs의 영향으로 보이며 원격 clone 크기 문제라고 단정할 수는 없다. 관련 참조와 백업을 확인하기 전 GC나 삭제를 실행하면 안 된다.

## 14. 긍정적으로 확인된 부분

- 비밀번호를 평문이 아닌 bcrypt hash로 저장
- FK cascade와 `(appointment_id, name)`, `(participant_id, date, time)` unique 제약
- anon 접근 관점에서 policy 없는 RLS가 fail-closed로 동작
- preferred slot이 available slot의 부분집합인지 서버에서 검증
- 제출 슬롯이 appointment 범위 안인지 서버에서 재검증
- 일반적인 순차 요청에서는 마감 후 응답 PUT 차단
- package lock 존재
- 실제 env, dist, node_modules가 Git에 추적되지 않음
- tracked 파일과 Git history에서 명백한 secret이 발견되지 않음
- 현재 client/server/shared TypeScript typecheck 통과
- client 42개, server unit 49개 테스트 통과
- production dependency audit 0건
- Vercel Express entry와 Services rewrite 구조 자체는 현행 형식과 부합

다만 최우선 인증 결함과 비원자적 쓰기가 위 장점들을 실질적인 보안·무결성 경계로 만들지 못하고 있다.

## 15. 권장 실행 순서

### P0: 공개 배포 전 필수

1. 서버 인증 세션과 권한 middleware 도입
2. participant ID 공개 제거 및 본인 응답 소유권 검증
3. 관리자 목록·마감 API 보호
4. PIN rate limit과 잠금 정책
5. `24:00` 및 종료 시각 의미 통일
6. deadline의 실제 강제 또는 UI 제거

### P1: 다음 배포 전

1. 응답 교체, 생성, 가입, 마감 트랜잭션화
2. 입력·UUID·body size·pagination 계약 강화
3. route ID 변경 stale state와 stale session 복구
4. 도메인 오류 코드와 중앙 오류 처리
5. Modal과 ScheduleGrid 접근성·모바일 회귀 수정
6. CI 품질 gate 구축 후 auto-merge 변경
7. 개발 의존성 취약점 처리

### P2: 운영 안정화

1. DB 집계 RPC와 generated Database types
2. realtime/focus refetch와 재시도 UX
3. build/test tsconfig 분리와 shared watch
4. 통합 테스트 전용 DB와 migration pipeline
5. README와 canonical spec 정비
6. 이미지·bundle 최적화
7. Markdown lint, EOL, editor 설정

