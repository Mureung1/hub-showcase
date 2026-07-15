## 작업 내용

1주차 Day2 "핵심 DB 구조 설계 및 약속 생성 기능 개발" 작업. Day1의 화면2(약속 만들기) 폼 뼈대를 실제 API 호출로 교체하고, 이를 뒷받침할 최소 DB 스키마(appointments, participants)를 설계·적용한다. mock 단계 없이 FE·BE·DB를 한 번에 완성하며, 완료 시 화면4(생성 완료 모달)가 실제 생성된 약속 ID로 동작한다. 참여자가 기존 약속에 합류하는 기능(화면3, 이름/비밀번호 검증)은 Day3 범위이므로 다루지 않는다.

## 확정된 설계 결정

- **약속 식별자**: 별도 초대 코드 없이 `appointments` 테이블의 uuid PK를 그대로 URL(`/a/:id`) id로 사용한다.
- **관리자 비밀번호**: 평문 저장하지 않고 bcrypt로 해시해서 저장한다. Day3 로그인 검증도 해시 비교로 구현한다.
- **후보 날짜/시간**: `NewAppointmentPage`의 자유 텍스트 `dateRange`/`timeRange` 입력을 구조화된 date/time 입력(date_start/date_end, time_start/time_end)으로 교체하고 그 값을 DB에 저장한다.

## 완료 기준

- [ ] `appointments`/`participants` 테이블이 Supabase에 생성되어 있고, 마이그레이션 SQL이 저장소에 파일로 남아있다.
- [ ] `POST /api/appointments` 요청/응답 타입이 FE/BE가 공유하는 형태로 정의되어 있다.
- [ ] 서버에 `POST /api/appointments` 라우트가 있고 zod로 요청 바디를 검증하며, 성공 시 `appointments` + `participants`(role=admin) 레코드를 생성한다.
- [ ] 필수값 누락 등 실패 케이스에 400과 필드별 에러 메시지를 반환한다.
- [ ] `NewAppointmentPage` 제출 시 실제 API를 호출해 생성된 `appointmentId`로 `/a/:id`로 이동하고, role은 실제 생성된 관리자 participant 기준으로 저장된다.
- [ ] `/a/:id` 진입 시 화면4(생성 완료 모달)가 실제 생성된 약속 ID/링크로 표시된다.
- [ ] 서버 API에 대한 최소 테스트(supertest)가 통과한다.
- [ ] 전체 흐름(약속 만들기 폼 제출 → 실제 DB 저장 → 생성 완료 모달)이 수동으로 확인된다.

## 우선순위

- 우선순위: 높음 (Day2 핵심 기능이자, Day3 참여 기능이 딛고 설 스키마의 기반)

## 작업 순서

아래 순서대로 진행한다. 각 묶음이 끝날 때마다 수동으로 동작을 확인한 뒤 다음 묶음으로 넘어간다.

### 1. DB 스키마 설계
1. `appointments` 테이블 마이그레이션 SQL 작성 — id(uuid pk), title, date_start, date_end, time_start, time_end, deadline(nullable), headcount(int), created_at
2. `participants` 테이블 마이그레이션 SQL 작성 — id(uuid pk), appointment_id(fk), name, password_hash, role('admin'|'participant'), created_at, unique(appointment_id, name)
3. Supabase에 실제 테이블 적용 및 확인 — SQL 실행 후 대시보드에서 두 테이블·FK·unique 제약 확인

이 묶음이 끝나면: Supabase 테이블 편집기에서 두 테이블과 제약조건이 의도대로 생성됐는지 확인한다.

### 2. API 계약 정의
4. `POST /api/appointments` 요청/응답 타입 정의 — FE onSubmit이 보낼 payload와 BE가 돌려줄 response(appointmentId 등) 형태를 코드 작성 전에 문서/타입으로 먼저 고정

이 묶음이 끝나면: 타입만 보고도 FE가 보낼 값과 BE가 돌려줄 값이 무엇인지 서로 설명 가능한지 확인한다.

### 3. BE 구현
5. `POST /api/appointments` 라우트/컨트롤러 추가 — zod로 바디 검증
6. 약속+관리자 participant 저장 로직 — supabase insert 2건(appointments → participants) 순차 처리, bcrypt로 비밀번호 해시 적용
7. 검증 실패/DB 오류 응답 분리 — 400(필드 에러) / 500(서버 오류) 구분
8. supertest 기반 라우트 테스트 — 성공 케이스 + 필수값 누락 케이스

이 묶음이 끝나면: curl/Postman으로 `POST /api/appointments`를 직접 호출해 Supabase에 실제 row가 생기는지, 잘못된 바디에 400이 오는지 확인한다.

### 4. FE 연결
9. `NewAppointmentPage` 폼 필드 정비 — dateRange/timeRange를 date/time 입력으로, headcount를 number로 교체(계약에 맞춰 zod 스키마 갱신)
10. onSubmit을 실제 API 호출로 교체 — axios POST 요청, 성공 시 응답의 appointmentId로 setRole 후 `/a/:id`로 이동(justCreated state 유지)
11. 제출 실패 처리 — 네트워크 오류/서버 검증 실패를 구분해 폼에 에러 메시지 표시

이 묶음이 끝나면: 브라우저에서 약속 만들기 폼을 실제로 제출해 새 약속이 생성되고 `/a/:id`로 이동하는지 확인한다.

### 5. 완료 모달 연동 + 전체 확인
12. `AppointmentPage`의 생성 완료 모달 링크/문구가 실제 appointmentId 기준으로 정확히 표시되는지 점검 — 모달 구조 자체는 Day1에서 이미 있으므로 실값 연결 확인 위주
13. 잘못된/존재하지 않는 `:id`로 접속했을 때 최소한의 방어 처리 — 본격적인 예외 처리는 보충일/Day3 범위이므로 깨지지 않는 수준만

이 묶음이 끝나면: 홈 → 약속 만들기 → 실제 저장 → 생성 완료 모달 → 링크 확인까지 전체 시나리오를 처음부터 끝까지 수동으로 워크스루한다.

## 이슈/커밋 전략

- **이슈 1개**: "Day2: 핵심 DB 구조 설계 및 약속 생성 기능 개발" — 본문에 위 13개 작업을 체크리스트로 포함
- **브랜치**: `feat/day2-appointment-creation` (이미 생성됨)
- **커밋**: 작업을 논리적으로 묶어 여러 개로 분리. 예)
  - DB 스키마 설계 (1~3)
  - API 계약 정의 (4)
  - BE 구현 (5~8)
  - FE 연결 (9~11)
  - 완료 모달 연동 + 전체 확인 (12~13)
- **PR**: 범위에서 제외 — 사용자가 직접 진행

## 참고 사항

- `docs/rules/design/design.md` — 화면2(약속 만들기)/화면4(생성 완료) 관련 설명, 모달 공통 규칙
- `docs/rules/plan/plan.md` — 9번 "사용자 ID 기준 관리, 관리자/참여자 role 저장" 원칙 (참여 로직 자체는 Day3)
- `docs/rules/tasks.md` — Day2는 mock 없이 바로 실제 데이터 연결, 계약 우선 원칙
- `client/src/lib/session.ts` — Day3에서 진짜 세션 로직으로 교체될 스텁, 이번엔 최소 연동만
- `server/src/lib/supabase.ts`, `client/src/lib/supabase.ts` — 이미 초기화된 클라이언트 재사용
- `shared/src/appointments.ts` — `POST /api/appointments` 계약(zod 스키마 + 응답 타입), `shared/src/index.ts`에서 재수출, client/server가 공통으로 import
