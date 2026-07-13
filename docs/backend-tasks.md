# 사이사이 백엔드 작업 문서

## 1. 목표와 현재 상태

- `server/`는 디렉터리 골격만 있고 실행 가능한 Express 코드가 없다.
- 백엔드는 Supabase Auth 사용자 JWT를 검증하고 커뮤니티·작성자·대화 멤버·공동구매 참여자 경계를 지키는 `/api/v1` JSON API를 제공한다.
- 남은 3주에는 회원가입 자체를 별도 API로 만들지 않는다. 프론트가 Supabase Auth에 가입하고 Express는 발급된 access token을 검증한다.

## 2. 확정 기술

| 항목 | 결정 |
|---|---|
| 언어/모듈 | JavaScript ESM |
| 서버 | Express |
| 입력 검증 | Zod |
| 보안/로그 | Helmet, CORS, Morgan, express-rate-limit |
| DB/Auth | `@supabase/supabase-js` |
| 공간 키 | `h3-js` 해상도 9 |
| 주소 검색 | Kakao Local REST API |
| 테스트 | Node test runner + Supertest |
| 채팅 | REST 3초 polling |
| 배포 | Render |

의존성:

- dependencies: `express`, `cors`, `dotenv`, `@supabase/supabase-js`, `zod`, `helmet`, `morgan`, `express-rate-limit`, `h3-js`
- devDependencies: `supertest`
- scripts: `dev:api`, `server`, `test:api`

## 3. 환경 변수와 보안

```bash
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
KAKAO_REST_API_KEY=
LOG_LEVEL=info
```

- URL, publishable key와 Kakao REST key가 없으면 서버 부팅을 실패시킨다.
- `SUPABASE_SERVICE_ROLE_KEY`는 seed/test 환경에만 사용하고 Render API 환경에는 설정하지 않는다.
- access token, 비밀번호, Kakao key, service role, 주소 검색어, 주소 결과와 좌표를 로그에 남기지 않는다.
- 프론트 access token을 `Authorization: Bearer <token>`으로 받는다.
- `requireAuth`는 `supabase.auth.getUser(token)`으로 사용자와 토큰을 검증한다.
- 일반 앱 쿼리는 동일 token이 적용된 요청별 Supabase client로 실행해 RLS를 유지한다.

## 4. 공통 서버 기반

- `server/src/app.js`: Express 조립과 middleware 등록
- `server/src/server.js`: 부팅과 graceful shutdown
- `server/src/config/`: 환경 변수 파싱
- `server/src/middleware/`: 인증, active community, rate limit, 404
- `server/src/errors/`: 공통 HTTP/도메인 오류
- `server/src/lib/`: Supabase client, Kakao client, cursor, case 변환
- `server/src/modules/<feature>/`: routes → controller → service → Supabase/RPC

공통 middleware:

- JSON body 제한 100KB
- CORS exact-origin allowlist
- Helmet
- body를 기록하지 않는 Morgan 로그
- 일반 쓰기 요청 사용자/IP당 분당 30회
- 주소 검색 사용자당 분당 30회
- 채팅 조회 사용자당 분당 60회
- 중앙 404와 오류 처리

응답:

```json
{ "data": {} }
```

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "입력값을 확인해주세요." } }
```

## 5. API 계약

### 인증 사용자와 온보딩

- `GET /api/v1/me`: profile, onboarding 완료 여부, active community 반환
- `GET /api/v1/addresses/search?q=<query>`: 2~100자 주소를 Kakao에서 검색
- `POST /api/v1/onboarding/complete`: nickname, housingType, 선택 주소, apartmentDong을 받아 자동 배정

주소 검색 반환 필드:

```js
{
  addressName,
  roadAddressName,
  buildingName,
  region1DepthName,
  region2DepthName,
  region3DepthName,
  longitude,
  latitude
}
```

온보딩 규칙:

- nickname은 2~20자다.
- `apartment_officetel`은 apartmentDong 1~10자가 필수다.
- `house_villa`는 apartmentDong을 받지 않는다.
- 서버는 제출 주소를 Kakao API로 다시 조회해 좌표와 주소를 확인한다.
- 아파트 키는 정규화된 `roadAddressName|buildingName|apartmentDong`의 SHA-256이다.
- 빌라 키는 `latLngToCell(latitude, longitude, 9)` 결과다.
- 계산된 주소 원문과 좌표는 응답·로그·DB에 저장하지 않는다.
- DB `complete_onboarding` RPC가 profile과 active membership을 원자적으로 변경한다.

### 자유게시판

- `GET /api/v1/posts`
- `POST /api/v1/posts`
- `GET /api/v1/posts/:id`
- `GET /api/v1/posts/:id/comments`
- `POST /api/v1/posts/:id/comments`

규칙:

- 제목 2~80자, 본문 1~2,000자, 댓글 1~500자
- 글은 `createdAt desc, id desc`, 댓글은 `createdAt asc, id asc`
- active community 멤버만 같은 커뮤니티 리소스를 조회·작성

### 도와주세요

- `GET /api/v1/help-requests`
- `POST /api/v1/help-requests`
- `GET /api/v1/help-requests/:id`
- `GET /api/v1/help-requests/:id/comments`
- `POST /api/v1/help-requests/:id/comments`
- `POST /api/v1/help-requests/:id/resolve`
- `POST /api/v1/help-requests/:id/conversations`

규칙:

- 상태는 `open | resolved`
- resolve는 작성자만 호출하며 재요청은 동일 결과를 반환
- resolved 요청에는 댓글, 새 conversation, 메시지를 작성할 수 없으며 `HELP_RESOLVED` 409 반환
- conversation 생성 body는 `{ participantUserId }`
- participant는 해당 요청에 댓글을 작성했고 현재 같은 커뮤니티의 active member여야 함
- 같은 요청·같은 participant 조합은 기존 conversation을 반환

### 공통 채팅

- `GET /api/v1/conversations/:id/messages?cursor=<cursor>&limit=50`
- `POST /api/v1/conversations/:id/messages`

규칙:

- conversation member만 조회·작성
- 메시지는 trim 후 1~1,000자
- cursor는 마지막 `(createdAt, id)`를 URL-safe로 인코딩
- 반환은 `{ data: { items, nextCursor } }`, items는 오래된 순
- 도움 요청이 resolved면 history 조회만 허용

### 공동구매

- `GET /api/v1/group-buys`
- `POST /api/v1/group-buys`
- `GET /api/v1/group-buys/:id`
- `POST /api/v1/group-buys/:id/join`
- `POST /api/v1/group-buys/:id/confirm`

입력:

- title 2~80자
- description 1~2,000자
- totalAmount 1~100,000,000 정수
- targetCount 2~50 정수
- deadlineAt 현재+10분 이상, 현재+30일 이하
- pickupLocation 2~100자

파생 응답:

```js
{
  participantCount,
  shareAmount,
  isParticipant,
  isHost,
  isJoinable,
  isExpired,
  canConfirm,
  joinBlockedReason,
  conversationId
}
```

규칙:

- 저장 상태는 `recruiting | confirmed`
- 생성은 `create_group_buy` RPC를 호출해 모집과 host 참여자를 함께 생성
- 참여는 `join_group_buy` RPC가 row lock 후 중복, 정원, 기한, 상태를 검사
- `shareAmount = ceil(totalAmount / max(participantCount, 1))`
- 확정은 host, 정원 도달, 미만료 조건이 모두 참일 때만 가능
- `confirm_group_buy` RPC가 상태, confirmed_at, conversation, 참여자 membership을 한 transaction에서 생성
- 재확정은 기존 conversationId를 포함한 현재 결과를 반환

## 6. 오류 계약

| HTTP | code | 사용처 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 입력 형식 오류 |
| 401 | `UNAUTHORIZED` | token 없음·만료·위조 |
| 403 | `FORBIDDEN` | 커뮤니티·작성자·멤버·host 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `ALREADY_JOINED` | 중복 공동구매 참여 |
| 409 | `GROUP_FULL` | 목표 인원 도달 |
| 409 | `DEADLINE_PASSED` | 마감 시각 경과 |
| 409 | `GROUP_CONFIRMED` | 확정 후 참여 |
| 409 | `HELP_RESOLVED` | 완료 도움 요청 쓰기 |
| 409 | `COMMENTER_REQUIRED` | 댓글 없는 상대와 채팅 생성 |
| 429 | `RATE_LIMITED` | 호출 한도 초과 |
| 500 | `INTERNAL_ERROR` | 예상하지 못한 오류 |

- 프로덕션 오류에 stack과 Supabase 내부 메시지를 노출하지 않는다.
- DB snake_case는 API에서 camelCase로 변환한다.

## 7. 구현 순서

1. Express, env, 공통 middleware, health
2. Supabase client, requireAuth, `/me`
3. Kakao 주소 검색과 onboarding 완료
4. 자유게시판과 댓글
5. 도와주세요, 댓글, resolve
6. 공통 conversation과 messages
7. 도움 1:1 conversation 생성
8. 공동구매 생성·참여
9. 공동구매 확정·그룹 conversation
10. 테스트, Render 배포와 공개 smoke test

## 8. 자동 테스트 완료 조건

- token 없음·유효·만료의 401 처리
- 다른 커뮤니티의 모든 리소스 접근 차단
- 동일 아파트 동/다른 동과 동일 H3/다른 H3 배정
- 사용자당 active membership 한 개
- 작성자만 도움 완료, 완료 후 모든 쓰기 차단
- 댓글 작성자만 도움 conversation 상대가 됨
- conversation 비멤버 조회·작성 403
- cursor 메시지 누락·중복 없음
- 공동구매 host 자동 참여
- 중복·정원·기한·확정 후 참여 409
- 동시 마지막 자리 참여 시 목표 인원 미초과
- 비host와 목표 미달의 확정 실패
- 확정과 conversation 생성의 원자성·멱등성
- `npm run test:api`, `npm run lint`, `npm run build` 통과

## 9. 제외 범위

- 별도 회원가입·logout API, 이메일 확인, 비밀번호 복구, 소셜 로그인
- 나의 활동 API, 커뮤니티 변경 API
- 지도 UI, 주소·좌표 저장, 거주 인증
- 이미지·Storage, 수정·삭제, 대댓글
- 참여 취소, 모집 취소, 결제·송금·정산
- Realtime/WebSocket, 알림, 리뷰·신고, 차단, 관리자 API
