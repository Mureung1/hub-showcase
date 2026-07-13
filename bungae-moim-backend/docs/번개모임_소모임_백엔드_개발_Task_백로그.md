# 번개모임 & 소모임 — 백엔드/DB 개발 Task 백로그

> **범위**: 백엔드(API) + DB만 다룹니다. 프론트엔드 6개 화면과 배포는 별도 계획으로 진행합니다.
> **문서 기준**: `번개모임_소모임_프로젝트_기획서.md`, `번개모임_소모임_DB_스키마_설계서.md`, `번개모임_소모임_API_명세서.md`

**Goal**: 기획서 6.1 MVP 범위(회원가입/로그인, 모임 등록, 모임 목록/검색, 참여 신청)를 API 명세서에 정의된 엔드포인트 그대로 구현한다.

**Architecture**: Node.js + Express REST API, PostgreSQL, 세션 쿠키 기반 인증. 응답 포맷은 전 엔드포인트 공통 `{ data }` / `{ error: { code, message } }`.

**Tech Stack**: Node.js, Express, PostgreSQL, `pg`(또는 선호 쿼리빌더/ORM), `express-session`, Jest + Supertest(핵심 로직 테스트용)

## Global Constraints

- 알림 기능, 관리자(어드민) API, 차단 API, 배너 광고, 지도 검색은 이번 백로그에 포함하지 않는다 (기획서 6.2, 6.3 / API 명세서 6번 — 2차 개발 또는 의도적 제외).
- `status = 'finished'` 전환은 별도 배치/스케줄러 없이 조회 시점에 애플리케이션에서 필터링한다 (DB 설계서 3번).
- 신고(`reports`) 접수 후 실제 조치(모임 삭제, 계정 정지)는 API로 제공하지 않는다. 개발자가 DB에 직접 접근해 수동 처리한다 (기획서 12.1).
- 오픈채팅 링크는 `open.kakao.com` 패턴 형식 검증만 수행하고, 그 이상의 유효성(만료 여부 등)은 검증하지 않는다 (기획서 11번).
- 자동화 테스트는 핵심 비즈니스 로직(아래 각 task에 "테스트 포인트"로 표시)에만 최소한으로 작성한다. 나머지는 기획서 12.5 방침대로 수동 클릭 테스트로 확인한다.

## 이번 논의로 확정한 사항 (원본 문서에는 없던 결정)

- **신뢰도 점수**: "완료 보너스"는 넣지 않는다. 확정(`confirmed`) 또는 승인(`approved`) 상태에서 참여를 취소하면 `trust_score -3`. `pending` 상태에서의 취소는 감점 없음. 번개모임/소모임 구분 없이 동일하게 적용.
- **성인 인증**: 생년월일은 자가 입력(self-report)만 사용한다. 전화번호 인증 등 실명/본인인증은 도입하지 않는다.
- **`adultOnly` 모임 + `birth_date` 미입력**: 성인 여부를 판별할 수 없으므로 참여 신청을 차단한다. 에러 코드는 기존 `FORBIDDEN` / `ADULT_ONLY`를 그대로 재사용한다 (별도 코드 신설하지 않음).

---

## Epic A. 프로젝트 셋업

### A1. 백엔드 프로젝트 스캐폴딩
**Files**: `package.json`, `src/app.js`, `src/config/db.js`, `.env.example`
- Express 앱 초기화, PostgreSQL 커넥션 풀 설정, 환경변수(`DATABASE_URL`, `SESSION_SECRET`, OAuth 클라이언트 ID/Secret) 로드 구조 작성.
- 완료 기준: `GET /health` 같은 임시 라우트로 서버 기동 + DB 연결 확인.

### A2. 테스트 환경 셋업
**Files**: `package.json`(devDependencies), `jest.config.js`, `src/config/db.test.js` 또는 테스트용 DB 커넥션
- Jest + Supertest 설치, 테스트 전용 DB(예: `bungae_test`)에 대해 마이그레이션을 실행하고 각 테스트 후 데이터를 정리하는 셋업/티어다운 작성.
- 완료 기준: 더미 테스트 1개(`expect(true).toBe(true)`)가 `npm test`로 통과.

---

## Epic B. DB 스키마 구축

DB 설계서의 4개 테이블 + 계정 정지용 컬럼 2개를 그대로 마이그레이션으로 옮긴다. 마이그레이션 도구는 선호하는 것 사용(예: `node-pg-migrate`, `knex`, 직접 SQL 스크립트).

### B1. `users` 테이블
**Files**: `migrations/001_create_users.sql` (또는 도구별 파일)
- 컬럼: `id, provider, provider_id, email, nickname, birth_date(NULL 허용), trust_score(DEFAULT 50.0), created_at, suspended_until(NULL 허용), suspension_count(DEFAULT 0)`
- 제약: `UNIQUE (provider, provider_id)`
- 완료 기준: 마이그레이션 실행 후 `\d users`로 컬럼/제약 확인.

### B2. `meetings` 테이블
**Files**: `migrations/002_create_meetings.sql`
- 컬럼: DB 설계서 3번 표 그대로 (`type, title, category, description, region_sido, region_sigungu, region_eupmyeondong, start_at, end_at, capacity, adult_only, open_chat_url, status DEFAULT 'recruiting'`)
- CHECK 제약: `type = 'flash'` → `capacity IS NOT NULL AND end_at IS NULL` / `type = 'small'` → `capacity IS NULL`
- 완료 기준: `type='flash', capacity=NULL`로 INSERT 시도 → CHECK 위반으로 실패하는지 수동 확인.

### B3. `meeting_participants` 테이블
**Files**: `migrations/003_create_meeting_participants.sql`
- 컬럼: `meeting_id(FK), user_id(FK), status, applied_at, responded_at(NULL 허용)`
- 제약: `UNIQUE (meeting_id, user_id)`
- 완료 기준: 동일 `(meeting_id, user_id)` 중복 INSERT 시 제약 위반 확인.

### B4. `reports` 테이블
**Files**: `migrations/004_create_reports.sql`
- 컬럼: DB 설계서 5번 표 그대로 (`reporter_id, meeting_id, reason, description, status DEFAULT 'received', created_at`)

### B5. 인덱스 추가
**Files**: `migrations/005_add_indexes.sql`
- `meetings(region_sido, region_sigungu, status, start_at)`, `meetings(category)`, `meeting_participants(meeting_id)`, `meeting_participants(user_id)`, `reports(status)`

---

## Epic C. 공통 인프라

### C1. 공통 응답 포맷 & 에러 핸들링
**Files**: `src/middleware/errorHandler.js`, `src/utils/apiError.js`
- 성공 응답 `{ data }`, 실패 응답 `{ error: { code, message } }` 헬퍼 작성.
- 공통 에러 코드 상수화: `UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, SUSPENDED` (API 명세서 공통 에러 코드).
- 완료 기준: 라우트에서 `throw new ApiError('NOT_FOUND', ...)` 형태로 던지면 에러 핸들러가 올바른 JSON으로 변환.

### C2. 인증 미들웨어
**Files**: `src/middleware/auth.js`, `src/config/session.js`
- `express-session` 설정(세션 쿠키), `requireAuth` 미들웨어(비로그인 시 `UNAUTHENTICATED`), 정지 계정 접근 시 `SUSPENDED` 반환(`suspended_until`이 현재 시각보다 미래인지 체크).
- 완료 기준: 비로그인 상태로 보호된 라우트 호출 시 401 + `UNAUTHENTICATED` 확인.

### C3. 성인 여부 판별 유틸
**Files**: `src/utils/age.js`, `src/utils/age.test.js`
- `isAdult(birthDate)` 함수: `birth_date`가 `NULL`이면 `null`(판별 불가) 반환, 값이 있으면 만 19세 기준(또는 팀 기준) 계산.
- **테스트 포인트**: 생일이 지난 경우/안 지난 경우 경계값, `birth_date = NULL`일 때 `null` 반환.

---

## Epic D. 인증 / 회원 API

### D1. `POST /api/auth/google`
**Files**: `src/routes/auth.js`, `src/services/authService.js`
- 구글 OAuth 인가 코드 검증 → 기존 계정 있으면 로그인, 없으면 `users` insert(`provider='google'`) 후 세션 생성.
- 응답에 `birthDateRequired`(= `birth_date IS NULL`), `isNewUser` 포함.
- **사전 준비 필요**: 구글 Cloud Console에서 OAuth 클라이언트 ID/Secret 발급.

### D2. `POST /api/auth/kakao`
**Files**: `src/routes/auth.js`, `src/services/authService.js`
- D1과 동일한 흐름, `provider='kakao'`.
- **사전 준비 필요**: 카카오 디벨로퍼스에서 앱 등록 및 REST API 키 발급.

### D3. `POST /api/auth/logout`
**Files**: `src/routes/auth.js`
- 세션 파기.

### D4. `GET /api/users/me`
**Files**: `src/routes/users.js`
- 로그인 사용자 정보(`id, nickname, email, birthDate, trustScore` 등) 반환.

### D5. `PATCH /api/users/me`
**Files**: `src/routes/users.js`, `src/services/userService.js`
- `birthDate` 최초 입력/수정. 날짜 형식(`YYYY-MM-DD`) 검증 실패 시 `VALIDATION_ERROR`.
- **테스트 포인트**: 잘못된 날짜 포맷 입력 시 `VALIDATION_ERROR` 반환 확인.

---

## Epic E. 모임 API

### E1. `POST /api/meetings`
**Files**: `src/routes/meetings.js`, `src/services/meetingService.js`, `src/utils/validators.js`
- `type='flash'`: `capacity` 필수(양의 정수), `endAt`은 무시하고 `NULL`로 저장.
- `type='small'`: `capacity` 무시(NULL 강제), `endAt` 필수.
- `openChatUrl`: `open.kakao.com` 패턴 정규식 검증, 실패 시 `VALIDATION_ERROR`.
- `regionSido`, `regionSigungu` 필수, `regionEupmyeondong` 선택.
- **테스트 포인트**: flash에 `capacity` 누락 시 에러, small에 `endAt` 누락 시 에러, `openChatUrl`이 카카오 오픈채팅 형식이 아닐 때 에러.

### E2. `GET /api/meetings`
**Files**: `src/routes/meetings.js`, `src/services/meetingService.js`
- 쿼리 파라미터: `type, category, keyword(제목/설명 LIKE 검색), regionSido, regionSigungu, page`.
- `status IN ('recruiting', 'closed')`만 조회하고, `start_at`/`end_at`이 지난 건은 `finished`로 간주해 제외 (DB 설계서 3번 — 조회 시점 필터링).
- 페이지네이션(`page`, `totalPages`) 포함.
- **테스트 포인트**: 지난 일시의 모임이 목록에서 빠지는지, `cancelled` 모임이 빠지는지, 지역/카테고리 필터 조합이 정확한지.

### E3. `GET /api/meetings/:id`
**Files**: `src/routes/meetings.js`, `src/services/meetingService.js`
- `host` 정보(`id, nickname, trustScore`), `confirmedCount`, `myParticipation`(로그인 사용자 기준, 없으면 `null`) 포함.
- `openChatUrl`은 **참여 확정 전에는 응답에서 제외**한다 — 번개모임은 신청 전, 소모임은 승인 전.
- **테스트 포인트**: 미신청/미승인 상태 조회 시 `openChatUrl`이 응답에 없는지, 확정/승인 후에는 포함되는지.

### E4. `PATCH /api/meetings/:id`
**Files**: `src/routes/meetings.js`, `src/services/meetingService.js`
- 모임장 본인만 수정 가능, 아니면 `FORBIDDEN`.

### E5. `DELETE /api/meetings/:id`
**Files**: `src/routes/meetings.js`, `src/services/meetingService.js`
- `meetings.status = 'cancelled'`로 갱신 + 해당 모임의 `meeting_participants` 전원을 `cancelled`로 일괄 갱신 (트랜잭션으로 처리).
- 모임장 본인만 가능, 아니면 `FORBIDDEN`.
- **테스트 포인트**: 취소 후 참여자 레코드가 모두 `cancelled`로 바뀌는지 (일부만 바뀌는 회귀 방지).

---

## Epic F. 참여 신청 API

### F1. `POST /api/meetings/:id/apply`
**Files**: `src/routes/participants.js`, `src/services/participantService.js`
- `type='flash'`: 현재 `confirmedCount < capacity`면 `status='confirmed'`로 즉시 생성, 정원 초과면 `VALIDATION_ERROR`(`MEETING_FULL`). 정원이 다 차면 `meetings.status`를 `closed`로 갱신.
- `type='small'`: `status='pending'`으로 생성.
- `adultOnly=true` 모임에 미성년 계정 또는 `birth_date IS NULL`인 계정이 신청 시 `FORBIDDEN`(`ADULT_ONLY`) — Epic C3 유틸 사용.
- `UNIQUE(meeting_id, user_id)` 위반(중복 신청) 시 적절한 에러 변환.
- **테스트 포인트**: 정원 마감 직전/직후 동시 신청(정원 초과 방지), `adultOnly` + 미성년/미입력 계정 차단, 동일 모임 중복 신청 차단.

### F2. `DELETE /api/meetings/:id/apply`
**Files**: `src/routes/participants.js`, `src/services/participantService.js`
- 신청자 본인만 취소 가능.
- 취소 전 상태가 `confirmed` 또는 `approved`였다면: (1) `users.trust_score -= 3`, (2) `type='flash'`이고 `meetings.status='closed'`였다면 `recruiting`으로 되돌림.
- 취소 전 상태가 `pending`이었다면 감점 없이 상태만 `cancelled`로 변경.
- **테스트 포인트**: `confirmed` 상태에서 취소 시 `trust_score -3` 및 flash 모임 재오픈 확인, `pending` 상태에서 취소 시 감점 없는지 확인.

### F3. `GET /api/meetings/:id/participants`
**Files**: `src/routes/participants.js`
- 모임장만 조회 가능, 아니면 `FORBIDDEN`.

### F4. `PATCH /api/meetings/:id/participants/:userId`
**Files**: `src/routes/participants.js`, `src/services/participantService.js`
- `status`는 `approved` 또는 `rejected`만 허용, 그 외 값은 `VALIDATION_ERROR`.
- 모임장 본인이 아니면 `FORBIDDEN`.
- `small` 타입 모임에서만 허용 (flash는 승인 절차 자체가 없음).
- 승인/거절 시 `responded_at` 갱신.
- **테스트 포인트**: 모임장이 아닌 사용자의 승인 시도 차단, flash 모임에 대한 승인 시도 처리, 허용되지 않은 `status` 값 거부.

---

## Epic G. 마이페이지 API

### G1. `GET /api/users/me/hosted-meetings`
**Files**: `src/routes/users.js`, `src/services/meetingService.js`
- 내가 등록한 모임 목록 + 신청자 수 + 대기 중인 승인 건수 포함.

### G2. `GET /api/users/me/joined-meetings`
**Files**: `src/routes/users.js`, `src/services/participantService.js`
- 내가 신청/참여한 모임과 상태(`pending/approved/rejected/confirmed/cancelled`) 목록.

---

## Epic H. 신고 API

### H1. `POST /api/reports`
**Files**: `src/routes/reports.js`
- `meetingId, reason(inappropriate_content|minor_violation|broken_chat_link|other), description` 저장. `status='received'` 기본값.
- 신고 접수 이후 조치는 API 범위 밖 (개발자가 DB 직접 처리).

---

## 백로그에 포함하지 않은 것 (의도적 제외 — API 명세서 6번과 동일)

- 알림 API, 관리자(어드민) API, 차단 API
- 프론트엔드 6개 화면 (별도 계획)
- 배포 설정 (백엔드 API가 안정화된 후 별도 계획으로 진행 권장)
- 지도 기반 검색, 후기/리뷰, 배너 광고 (기획서 6.2 — 2차 개발)

---

## 진행 전 확인이 필요한 외부 준비물

- 구글 OAuth 클라이언트 ID/Secret (Google Cloud Console)
- 카카오 REST API 키 (카카오 디벨로퍼스)
- 로컬/개발용 PostgreSQL 인스턴스 (또는 Docker)
