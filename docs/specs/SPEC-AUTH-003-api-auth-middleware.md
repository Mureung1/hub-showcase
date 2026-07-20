# SPEC-AUTH-003. Express Auth Middleware (JWT 검증·인증 경계)

- 상태: **완료 (2026-07-20, T-014 — AC1~AC7 실측 PASS)**
- 기준 문서: `CLAUDE.md` 2·5·6·8장, `docs/architecture.md` 2·4·6장, `docs/decisions/ADR-001-supabase-auth.md`, `docs/decisions/ADR-002-data-access-clients.md`, `docs/dev-setup.md`
- 작성 방식:
  - 0장 "고정 사항"은 확정된 정책에서 온 것이며, 이 Spec에서 임의로 바꾸지 않는다.
  - 1장 "결정 사항"은 사용자가 직접 결정했다. Agent는 질문과 선택지를 제시하고 결정을 받아 적었다.

---

## 0. 고정 사항 (정책 확정)

### 0.1 한 줄 목표

Express가 `Authorization: Bearer <access-token>`의 Supabase JWT를 검증해 `req.auth.userId`를 설정하는 인증 경계(Auth Middleware)를 세우고, 보호 엔드포인트 하나(`/api/auth/me`)와 프론트 ApiClient로 프론트→서버 인증 사슬을 증명한다. 실제 서비스 API(AI 호출·DB 저장)는 이 Spec에서 다루지 않는다.

### 0.2 기존 문서에서 오는 고정 규칙

- Express Auth Middleware가 `Authorization: Bearer` 토큰의 Supabase JWT를 검증해 `req.auth.userId`를 설정한다. **클라이언트가 전달한 userId는 신뢰하지 않으며, 인증 사용자 ID는 검증된 JWT에서만 추출한다** (CLAUDE.md 6장, ADR-001, architecture 4장).
- 인증이 필요한 Route는 Auth Middleware에서 JWT를 검증한 뒤 Controller로 전달한다 (CLAUDE.md 8장).
- 요청 데이터·JWT 등 외부 데이터는 경계에서 Zod로 검증하고, 검증 전까지 `unknown`으로 취급한다. `any` 금지, 검증 우회 금지 (CLAUDE.md 5장).
- 서버 오류에 비밀값이나 불필요한 내부 정보를 포함하지 않는다 (CLAUDE.md 8장).
- 환경변수는 서버 시작 시 검증하고 필수 값이 없으면 명확하게 실패시킨다 (CLAUDE.md 8장).
- 프론트에는 URL·Publishable Key만, Secret Key·Service Role Key는 백엔드 환경변수에만 (CLAUDE.md 6장). React는 서비스 데이터를 직접 Supabase로 조회·저장하지 않고 Express API를 거친다.
- Web에서 API의 소스 파일을 직접 import하지 않는다. Web·API 공유 계약만 `packages/shared`에 둔다 (CLAUDE.md 4장).

### 0.3 제외 범위

- 실제 서비스 API(Question 실행·Agenda·FinalAnswer·DecisionNote 등)와 그 Controller·Service·Repository (→ SPEC-AI-001~003, SPEC-DB-001)
- Secret Key Client와 AI 파이프라인 시스템 쓰기, RLS Policy·Migration (→ SPEC-DB-001, ADR-002)
- 서비스 데이터의 사용자별 저장·조회 (→ SPEC-DB-001). 웹의 Chat·Question은 이 Spec에서도 Mock 유지
- 성공 응답 봉투(data envelope)의 상세 형태 — 이 Spec은 에러 봉투와 표준 골격만 확정하고, 성공 형태 확장은 각 데이터 Spec에서
- userId를 도메인 엔티티 계약(`@decision-log/shared`의 Chat 등)에 넣는 것 — 소유권 필드는 DB Spec에서 (SPEC-SCHEMA-001 3장 연기 항목)

---

## 1. 결정 사항 요약 (사용자 확정, 2026-07-20)

| # | 질문 | 결정 |
|---|---|---|
| 1-1 | JWT 검증 방식 | **(a) Supabase에 확인** — `supabase.auth.getUser(token)`로 매 요청 검증. 키 관리 불필요, 취소 토큰 즉시 반영. 로컬 검증 전환 시에도 `req.auth` 계약 유지 |
| 1-2 | 테스트 엔드포인트 | **(a) `GET /api/auth/me` 생성** — 인증 사용자의 userId·email 반환. AC 실측 가능화 + 이후에도 유용 |
| 1-3 | 프론트 연결 범위 | **(a) 얕은 ApiClient 포함** — access token 자동 첨부 + `/api/auth/me` 호출로 프론트→서버 사슬 증명 |
| 2-1 | 인증 실패 응답 | **(a) 코드+원문 봉투** — `{ error: { code, message } }`. message에 Supabase 원문 포함(디버깅 가시성). 비밀값·토큰 미포함 |
| 2-2 | 에러 봉투 표준화 | **(a) 지금 프로젝트 표준으로 확정** — `packages/shared`에 스키마를 두고 이후 API·DB Spec이 재사용 |
| 2-3 | 서버가 쥘 Supabase 키 | **(a) 공개 키(Publishable)만** — 토큰 검증은 공개 키로 충분. Secret Key는 DB Spec으로 미룸 |

---

## 2. 백엔드 — 인증 경계

### 2.1 환경변수 검증 (서버 시작 시)

- `apps/api/src/shared/config/env.ts`에서 서버 시작 시 Zod로 검증한다 (`docs/dev-setup.md`에서 예고된 위치). 이번 Spec이 검증하는 필수 값:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - (`PORT`, `CLIENT_ORIGIN`은 기존값 유지·검증 포함 가능 — 구현 재량)
- `SUPABASE_SECRET_KEY`·AI 키는 이번 Spec에서 검증하지 않는다(아직 사용하지 않음). 각 Spec에서 필요 시 필수화한다.
- 필수 값이 없으면 서버가 명확한 메시지로 시작에 실패한다. 오류 메시지에 키 값 자체를 노출하지 않는다.

### 2.2 Supabase 서버 클라이언트

- `apps/api`에 `@supabase/supabase-js`를 설치한다 (이 Spec이 승인 근거). 루트 단일 lock 유지.
- 서버용 Supabase Client는 `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`로 1회 생성한다(별도 모듈). 이 클라이언트는 토큰 검증(`auth.getUser`)에만 사용한다. 시스템 쓰기용 Secret Key Client는 이 Spec 범위 밖(DB Spec).

### 2.3 Auth Middleware

- `Authorization: Bearer <access-token>` 헤더를 읽는다. 헤더가 없거나 형식이 어긋나면 401 `UNAUTHENTICATED`.
- 토큰을 `supabase.auth.getUser(token)`로 검증한다. 실패(무효·만료)면 401 `TOKEN_INVALID`(message에 Supabase 원문).
- 성공하면 검증된 사용자에서 `req.auth = { userId, email }`을 설정하고 다음으로 넘긴다. `userId`는 반드시 검증된 결과에서만 온다.
- `AuthenticatedRequest` 타입(또는 Express 타입 확장)으로 `req.auth`를 타입 안전하게 노출한다. 검증된 사용자 객체는 `unknown`에서 필요한 필드만 Zod로 좁혀 사용한다.
- 미들웨어는 인프라 계층이므로 `req`를 받는다. Service 계층은 이후 Spec에서 `req`를 받지 않고 `userId`를 인자로 받는다(CLAUDE.md 8장) — 이 Spec은 Service를 만들지 않는다.

### 2.4 보호 엔드포인트

- `GET /api/auth/me` — Auth Middleware 뒤에 둔다. 200으로 `{ userId, email }`을 반환한다(성공 봉투 골격은 3장 참조).
- `app.ts`에 라우트를 연결한다. 기존 `/api/health`는 인증 없이 유지한다.

---

## 3. 응답 봉투 (프로젝트 표준 착수)

- 에러 봉투: `{ error: { code: string, message: string } }`. `packages/shared`에 Zod 스키마와 `z.infer` 타입을 둔다(api가 생성, web이 파싱).
- 에러 코드(이번 Spec 도입분): `UNAUTHENTICATED`(토큰 없음·형식 오류), `TOKEN_INVALID`(검증 실패·만료). 코드 레지스트리 확장은 Spec 개정(SCHEMA-001의 errorCode 레지스트리 운용 방식과 동일 원칙).
- `message`는 사람이 읽을 수 있는 설명이며, 인증 실패 시 Supabase 원문을 담아 디버깅 가시성을 준다. **비밀값·토큰·내부 스택은 담지 않는다.**
- 성공 봉투: 이 Spec은 `/api/auth/me`가 `{ userId, email }`을 반환하는 최소 형태만 쓴다. 프로젝트 표준 성공 봉투(예: `{ data: ... }` 래핑) 확정은 실제 데이터 API가 생기는 Spec(AI·DB)에서 하며, 그 전까지 과설계하지 않는다.
- 봉투 스키마를 `packages/shared`에 추가하는 것은 이 Spec의 승인 범위다(Web·API 공유 계약).

## 4. 프론트엔드 — 최소 ApiClient

- `apps/web`에 최소 ApiClient를 둔다: 현재 Supabase 세션의 access token을 얻어 `Authorization: Bearer`로 첨부하고, `VITE_API_BASE_URL` 기준으로 요청한다. 컴포넌트에서 `fetch`를 직접 호출하지 않는다(CLAUDE.md 7장) — ApiClient/Service 경유.
- access token은 auth feature의 Service/Hook을 통해 얻는다(SDK 직접 호출 분산 금지).
- `/api/auth/me`를 호출하는 경로를 하나 만든다. 응답은 shared 에러 봉투로 파싱한다. 로그인 상태에서 서버가 인식한 신원을 확인하는 용도이며, 결과 표시 방식(최소 표기 또는 로깅·검증)은 구현 재량이되 **버려지는 임시 코드를 남기지 않는다.** 이후 데이터 로딩 경로가 이 ApiClient를 재사용한다.
- 서비스 데이터(Chat·Question 등)의 사용자별 저장·조회는 이 Spec 범위가 아니다(Mock 유지).

## 5. 패키지·환경변수·문서

- 추가 패키지(이 Spec이 승인 근거): `@supabase/supabase-js` — `apps/api`에 설치. 루트 lock 단일 유지.
- `apps/api/.env.example`은 이미 `SUPABASE_URL`·`SUPABASE_PUBLISHABLE_KEY`·`SUPABASE_SECRET_KEY`를 포함한다. 이번에 필수로 검증하는 값(URL·Publishable)을 주석으로 구분한다. Secret Key는 "DB Spec에서 사용" 주석 유지.
- 서버 로컬 값은 `apps/api/.env`(또는 `.env.local`)에 두고 커밋하지 않는다. `.gitignore`의 `.env` 차단은 T-012에서 이미 반영됨.
- `docs/dev-setup.md`에 API 서버 env(URL·Publishable Key)와 JWT 검증(SPEC-AUTH-003 착수) 항목을 반영한다.

## 6. 상태·오류 처리 규칙

- 미들웨어·엔드포인트는 인증 실패를 401 + 에러 봉투로 일관되게 반환한다. 예기치 못한 서버 오류는 500 + 일반 메시지(내부 정보·비밀값 미포함).
- ApiClient는 401 응답을 에러 봉투로 인식해 호출부가 분기할 수 있게 한다(재로그인 유도 등 실제 사용은 후속 Spec). 세션 만료 UX는 SPEC-AUTH-002가 담당.

---

## 7. Acceptance Criteria

- [x] AC1. 서버 시작 시 `SUPABASE_URL`·`SUPABASE_PUBLISHABLE_KEY`를 Zod로 검증한다. 값이 없으면 명확한 에러로 기동에 실패하고(키 값 노출 없음), 있으면 정상 기동한다.
- [x] AC2. Auth Middleware가 유효한 Bearer 토큰을 `supabase.auth.getUser`로 검증해 `req.auth.userId`(+email)를 설정한다. `GET /api/auth/me`가 인증 사용자의 `{ userId, email }`을 200으로 반환한다.
- [x] AC3. 토큰이 없거나 형식이 어긋나면 401 `UNAUTHENTICATED`, 무효·만료 토큰이면 401 `TOKEN_INVALID`(message에 Supabase 원문)를 에러 봉투로 반환한다. 응답에 비밀값·토큰이 없다.
- [x] AC4. 클라이언트가 body·query·header로 보낸 임의 userId는 소유권·신원 판단에 쓰이지 않는다. `/api/auth/me`가 반환하는 userId는 검증된 JWT에서만 나온다(위조 userId로 타인 신원을 얻을 수 없음).
- [x] AC5. 에러 봉투 Zod 스키마가 `packages/shared`에 있고 api(생성)·web(파싱)이 같은 계약을 쓴다. 성공 봉투는 `/api/auth/me`의 최소 형태만 쓰며 표준 확장 여지를 문서에 남긴다.
- [x] AC6. 프론트 ApiClient가 세션 access token을 `Authorization: Bearer`로 첨부한다. 로그인 상태에서 `/api/auth/me` 호출이 200 + 세션과 일치하는 userId를 반환하고(네트워크 확인), 토큰이 없으면 401 경로가 확인된다.
- [x] AC7. `npm run typecheck` / `build` 통과. **`npm run lint`는 web만 검사(apps/api에 lint script 없음) — api는 미검사임을 명시.** 기존 `/api/health`와 web happy-path(로그인→질문→충돌 해소→FinalAnswer→노트)가 회귀 없이 동작하고, `.env.example`·`docs/dev-setup.md`가 갱신된다.

---

## 8. 후속 연결

| 항목 | 다루는 곳 |
|---|---|
| Secret Key Client·AI 파이프라인 시스템 쓰기 | SPEC-DB-001 (ADR-002) |
| 실제 보호 API(Question 실행 등)·Controller·Service | SPEC-AI-001~003 |
| RLS Policy·Migration·userId 소유권 필드 | SPEC-DB-001 |
| 표준 성공 응답 봉투 확정 | 실제 데이터 API Spec (AI·DB) |
| 에러 메시지 한국어 매핑 | 후속 개선 (배포 전) |

---

## 9. 개정 기록

| 일자 | 내용 |
|---|---|
| 2026-07-20 | 최초 작성. Step 1~3 사용자 결정 반영 (1장 표). JWT 검증=getUser, 테스트 엔드포인트 `/api/auth/me`, 얕은 ApiClient, 코드+원문 에러 봉투를 `packages/shared` 표준으로 착수, 서버는 공개 키만 |
| 2026-07-20 | 완료 처리 (Cowork). T-014 구현·AC1~AC7 실측 PASS(상세는 docs/status.md). 알려진 제한: shared 소스 전용이라 `node dist` 프로덕션 실행은 배포 Spec에서 해소 |
