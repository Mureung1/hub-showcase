# 사이사이 백엔드 작업 문서

## 1. 목표와 현재 상태

- `server/src/{modules,middleware,lib,config,errors}`와 `server/test` 골격은 있으나 실행 가능한 Express 코드는 없다.
- 루트 `package.json`에는 서버 의존성과 API 실행·테스트 스크립트가 없다.
- 백엔드는 Supabase Auth의 사용자 JWT를 검증하고, 커뮤니티·작성자·참여자 경계를 지키는 `/api/v1` JSON API를 제공한다.
- 공개 데모는 Vercel 프론트, Render API, Supabase Auth/Postgres 조합을 사용한다.

## 2. 확정 기술과 운영 원칙

| 항목 | 결정 |
| --- | --- |
| 언어/모듈 | JavaScript ESM |
| 서버 | Express |
| 입력 검증 | Zod |
| 보안/로그 | Helmet, CORS, Morgan, express-rate-limit |
| DB/Auth | `@supabase/supabase-js` |
| 테스트 | Node test runner + Supertest |
| API prefix | `/api/v1` |
| 채팅 | REST polling |
| 배포 | Render |

- 프론트는 Supabase Auth로 로그인한 뒤 access token을 `Authorization: Bearer <token>`으로 보낸다.
- `requireAuth`는 Supabase `auth.getUser(token)`으로 토큰과 사용자를 검증한다. 별도 `JWT_SECRET`을 사용하지 않는다.
- 일반 앱 요청은 사용자 JWT가 반영된 Supabase client로 실행해 RLS를 유지한다.
- service role은 데모 seed와 제한된 운영 작업에만 사용하고 일반 요청 처리에 사용하지 않는다.
- 회원가입, 비밀번호 재설정, 별도 logout API는 만들지 않는다. 로그아웃은 프론트의 Supabase `signOut`으로 처리한다.

## 3. MVP 범위

### 포함

- 데모 계정 인증과 내 프로필
- 커뮤니티 추천·가입과 활성 커뮤니티 스코프
- 자유게시판·도와주세요 목록/상세/작성과 댓글 목록/작성
- 도움 요청 작성자 완료 처리
- 공동구매 목록/상세/생성/참여/수동 마감
- 공동구매 참여자 REST 채팅
- 나의 활동 집계

### 제외

- 댓글 수정·삭제와 대댓글
- 게시글·도움 요청 수정·삭제
- 결제·송금·정산 상태, 에스크로
- 이미지 업로드와 Storage API
- 지도/지오코딩 기반 매칭, Realtime/WebSocket
- 푸시 알림, 리뷰·신고, 차단, 관리자 API

## 4. 서버 기반 작업

### 구조와 의존성

- [ ] 디렉터리 책임은 `docs/directory-structure.md`를 따른다.
- [ ] `server/src/app.js`에 Express 앱 설정을, `server/src/server.js`에 부팅과 종료 처리를 둔다.
- [ ] 기능별 `server/src/modules/<feature>/` 안에 `<feature>.routes.js`, `<feature>.controller.js`, `<feature>.service.js`, `<feature>.schema.js`를 함께 둔다.
- [ ] 모듈 내부에서 routes → controller → service → Supabase client/RPC의 단방향 의존을 유지한다.
- [ ] 공통 인증·오류 처리는 `middleware/`와 `errors/`, Supabase client와 범용 유틸은 `lib/`, 환경 설정은 `config/`에 둔다.
- [ ] 단위 테스트는 구현 파일 옆 `*.test.js`, API 통합 테스트는 `server/test/`에 둔다.
- [ ] `express`, `cors`, `dotenv`, `@supabase/supabase-js`, `zod`, `helmet`, `morgan`, `express-rate-limit`을 추가한다.
- [ ] API 테스트용 `supertest`를 devDependency로 추가한다.
- [ ] `dev:api`, `server`, `test:api` 스크립트를 루트 `package.json`에 추가한다.
- [ ] `GET /health`는 인증 없이 200과 최소 상태만 반환하고 DB 비밀값은 노출하지 않는다.

### 환경 변수

```bash
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
SUPABASE_URL=
SUPABASE_ANON_KEY=
LOG_LEVEL=info
```

- [ ] 일반 서버 부팅에는 URL과 anon key가 필수다.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`는 seed 전용 환경에만 설정하고 일반 Render 서버 환경에는 넣지 않는다.
- [ ] 프로덕션 `CORS_ORIGINS`에는 정확한 Vercel URL을 쉼표 구분 allowlist로 추가한다.
- [ ] 토큰, 비밀번호, service role, 사용자의 주소 원문을 로그에 기록하지 않는다.

### 공통 미들웨어

- [ ] JSON body 크기 제한, Helmet, CORS allowlist, Morgan 로그, 404와 중앙 에러 핸들러를 구성한다.
- [ ] 쓰기 endpoint에 IP 기반 rate limit을 적용하고 조회 polling에는 별도 완화 한도를 둔다.
- [ ] `requireAuth`와 활성 커뮤니티 확인 미들웨어를 분리한다.
- [ ] Zod validation 오류와 Supabase 오류를 공통 에러로 변환한다.

성공 응답:

```json
{ "data": {} }
```

실패 응답:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해주세요."
  }
}
```

## 5. API 계약

### 사용자와 커뮤니티

- `GET /api/v1/me`: 공개 프로필, 온보딩 상태, 활성 커뮤니티 조회
- `PATCH /api/v1/me`: 닉네임, 주거 유형, 주소/건물명 갱신
- `POST /api/v1/communities/match`: `housingType`, `addressText`로 시드 후보 추천
- `POST /api/v1/communities/:id/join`: 활성 커뮤니티 가입 또는 전환

규칙:

- 데모 계정은 Supabase Dashboard 또는 seed 스크립트로 미리 만든다.
- 주거 유형은 `apartment_officetel` 또는 `house_villa`만 허용한다.
- 매칭은 건물/지역 키워드 기반이며 거주 사실 검증 기능으로 표현하지 않는다.
- 정확한 주소는 `/me`의 본인 응답 외 다른 리소스에 포함하지 않는다.

### 자유게시판과 댓글

- `GET /api/v1/posts`: 활성 커뮤니티 게시글 최신순 목록
- `POST /api/v1/posts`: 게시글 작성
- `GET /api/v1/posts/:id`: 상세와 작성자 공개 정보
- `GET /api/v1/posts/:id/comments`: 댓글 오래된 순 목록
- `POST /api/v1/posts/:id/comments`: 댓글 작성

### 도와주세요와 댓글

- `GET /api/v1/help-requests`: 활성 커뮤니티 요청 최신순 목록
- `POST /api/v1/help-requests`: `open` 상태로 작성
- `GET /api/v1/help-requests/:id`: 상세 조회
- `POST /api/v1/help-requests/:id/resolve`: 작성자만 `open` → `resolved`; 재요청은 멱등 성공
- `GET /api/v1/help-requests/:id/comments`: 댓글 오래된 순 목록
- `POST /api/v1/help-requests/:id/comments`: 댓글 작성

댓글은 생성과 조회만 지원한다. 부모 리소스와 같은 커뮤니티의 활성 멤버만 접근할 수 있다.

### 공동구매

- `GET /api/v1/group-buys`: 활성 커뮤니티 목록 최신순
- `POST /api/v1/group-buys`: DB `create_group_buy` RPC로 모집과 host 참여 행을 원자적으로 생성
- `GET /api/v1/group-buys/:id`: 상세, 참여 정보, 분배 안내 조회
- `POST /api/v1/group-buys/:id/join`: DB `join_group_buy` RPC로 원자적 참여
- `POST /api/v1/group-buys/:id/close`: 모집자만 수동 마감
- `GET /api/v1/group-buys/:id/messages`: 참여자만 cursor 이후 메시지 조회
- `POST /api/v1/group-buys/:id/messages`: 참여자만 메시지 작성

공동구매 응답에는 다음 파생 필드를 포함한다.

```js
{
  participantCount,
  shareAmount,
  isParticipant,
  isHost,
  isJoinable,
  joinBlockedReason
}
```

- `shareAmount = ceil(totalAmount / max(participantCount, 1))`이며 예상 부담금이다.
- 생성자는 자동 참여하고 `host` 역할을 가진다.
- 상태가 `open`이어도 목표 인원 도달 또는 기한 만료 시 `isJoinable`은 거짓이다.
- 중복 참여, 목표 인원 도달, 기한 만료, 이미 마감된 참여 요청은 모두 HTTP 409로 반환하고 구체적인 error code를 구분한다.
- 목표 인원 도달은 자동 마감하지 않는다. host가 `/close`를 호출해야 `closed`가 된다.
- 상품 이미지는 선택적 `imageUrl` 문자열만 받고 파일 업로드는 지원하지 않는다.

### 채팅 cursor

- cursor는 마지막 메시지의 `(createdAt, id)`를 URL-safe 문자열로 인코딩한다.
- `GET .../messages?cursor=<cursor>&limit=50`은 cursor 이후 메시지를 오래된 순으로 반환한다.
- 응답은 `{ data: { items, nextCursor } }` 형태를 사용한다.
- 빈 문자열은 거부하며 비참여자는 403을 반환한다.

### 나의 활동

- `GET /api/v1/me/activity`: 내가 쓴 게시글, 도움 요청, 참여 공동구매를 그룹별로 반환한다.
- 공동구매 항목에는 `role: 'host' | 'member'`, 상태, 예상 부담금을 포함한다.

## 6. 에러와 정렬 규칙

| HTTP | code 예시 | 사용처 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 입력 형식 오류 |
| 401 | `UNAUTHORIZED` | 토큰 없음·만료·위조 |
| 403 | `FORBIDDEN` | 커뮤니티·작성자·참여자 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `ALREADY_JOINED`, `GROUP_FULL`, `DEADLINE_PASSED`, `GROUP_CLOSED` | 참여 충돌 |
| 429 | `RATE_LIMITED` | 공개 데모 요청 제한 |
| 500 | `INTERNAL_ERROR` | 예상하지 못한 오류 |

- 게시글, 도움 요청, 공동구매는 `createdAt desc, id desc`로 정렬한다.
- 댓글은 `createdAt asc, id asc`로 정렬한다.
- 채팅은 cursor 이후 `createdAt asc, id asc`로 정렬한다.
- API는 DB snake_case를 camelCase로 변환한다.
- 프로덕션 오류에 stack trace와 내부 Supabase 메시지를 노출하지 않는다.

## 7. 구현 순서

1. Express 부팅, health, env, 보안·에러 미들웨어
2. Supabase client와 `requireAuth`, `/me`
3. 커뮤니티 match/join
4. 자유게시판·댓글
5. 도와주세요·댓글·resolve
6. 공동구매 생성·목록·상세·참여·마감 RPC 연동
7. 참여자 채팅 polling
8. 나의 활동
9. 테스트, OpenAPI 수준의 endpoint 예시, Render 배포 설정

## 8. 테스트와 완료 기준

### 자동 테스트

- [ ] 토큰 없음·유효·만료 요청의 401 처리
- [ ] 다른 커뮤니티 게시글·댓글·도움 요청 접근의 403/404 처리
- [ ] 작성자만 도움 요청을 완료할 수 있음
- [ ] 공동구매 생성 시 host 참여가 함께 생성됨
- [ ] 중복·정원 초과·기한 만료·마감 후 참여가 409임
- [ ] host가 아닌 사용자의 마감이 403임
- [ ] 비참여자의 채팅 조회·작성이 403임
- [ ] cursor polling이 메시지를 누락·중복하지 않음
- [ ] 나의 활동이 사용자별로 올바르게 집계됨

### 배포 완료 기준

- `npm run dev:api`, `npm run test:api`, 프론트 `npm run build`가 통과한다.
- Render `/health`가 HTTPS로 200을 반환한다.
- localhost와 지정 Vercel origin만 CORS를 통과한다.
- 공개 데모 계정으로 로그인부터 채팅까지 핵심 시나리오를 실행할 수 있다.
- 로그와 응답에 주소, 토큰, 비밀번호, service role이 노출되지 않는다.
