# 사이사이 백엔드 작업 문서

## 1. 현재 상태

- 현재 저장소에는 Express 백엔드 코드가 없다.
- `package.json`에는 Express, Supabase client, 서버 검증/로깅 의존성이 없다.
- 백엔드 실행 스크립트도 아직 없다.
- 현재 앱은 React + Vite 소개형 MVP 화면 중심이다.
- `prototype/`은 localStorage 기반으로 글 작성, 도움 요청, 공동구매 생성/참여/마감, 나의 활동 흐름을 보여준다.
- 백엔드 작업은 아직 구현되지 않은 기능을 있는 것처럼 작성하지 않고, 새 `server/`를 도입하는 것으로 시작한다.

## 2. 결정된 기본값

| 항목 | 기본값 |
| --- | --- |
| 백엔드 위치 | 루트 `server/` |
| 언어 | JavaScript ESM 우선 |
| 언어 방침 | JavaScript ESM 유지 |
| API prefix | `/api/v1` 권장 |
| 인증 | Supabase Auth + Express JWT 검증 권장 |
| 도와주세요 상태 | `open` / `resolved` |
| 공동구매 목표 인원 도달 | 추가 참여 차단 |
| 커뮤니티 매칭 1차 | 시드/단순 규칙 기반 |
| 채팅 1차 | REST polling |
| 댓글 | MVP 1차 제외, P2 후속 |

## 3. 제외 범위

- 결제 연동
- 송금
- 정산 상태 머신
- 에스크로
- 관리자 페이지/API
- 리뷰/신고
- 차단
- 푸시 알림
- 댓글 API
- 지도/주소 검색 외부 API 기반 정밀 매칭
- Supabase Realtime/WebSocket 채팅
- 백엔드 언어/스택 전환

공동구매는 모집, 참여, 1인 부담 금액 확인, 분배 안내, 참여자 채팅까지만 다룬다.

## 4. 작업 체크리스트

### Phase 0. 서버 구조 준비

- [ ] 루트에 `server/` 디렉터리를 만든다.
- [ ] 기본 구조를 만든다.
  - `server/src/app.js`
  - `server/src/server.js`
  - `server/src/routes/`
  - `server/src/controllers/`
  - `server/src/services/`
  - `server/src/middleware/`
  - `server/src/lib/supabase.js`
  - `server/src/validators/`
  - `server/src/errors/`
  - `server/.env.example`
- [ ] 프론트와 API 포트를 분리한다.
  - 프론트: `5173`
  - API: `3001`
- [ ] CORS, JSON body parser, 공통 에러 핸들러 정책을 정한다.
- [ ] 프론트 대규모 리팩터와 백엔드 도입 작업을 섞지 않는다.

### Phase 1. 최소 Express 서버

- [ ] 의존성을 추가한다.
  - `express`
  - `cors`
  - `dotenv`
  - `@supabase/supabase-js`
  - 검증 라이브러리 1개: `zod` 또는 `express-validator`
- [ ] 선택 의존성을 검토한다.
  - `helmet`
  - `morgan` 또는 간단 로거
- [ ] `GET /health`를 구현한다.
- [ ] 스크립트를 추가한다.
  - `npm run dev:api`
  - `npm run server`
- [ ] 공통 응답 포맷을 정한다.

```json
{
  "data": {}
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해주세요."
  }
}
```

### Phase 2. 환경 변수

- [ ] `server/.env.example`을 작성한다.

```bash
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
AUTH_MODE=supabase

LOG_LEVEL=info
```

- [ ] 필수 env가 없으면 서버가 명확한 메시지와 함께 부팅 실패하게 한다.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`를 프론트 번들에 노출하지 않는다.
- [ ] 로컬 개발용 `AUTH_MODE=dev`가 필요하면 프로덕션에서 사용할 수 없게 한다.

### Phase 3. 인증 / 사용자

- [ ] Supabase Auth JWT를 Express에서 검증하는 `requireAuth` 미들웨어를 만든다.
- [ ] `GET /api/v1/me`를 만든다.
  - 내 프로필
  - 현재 커뮤니티
- [ ] `PATCH /api/v1/me`를 만든다.
  - 닉네임 수정
- [ ] `POST /api/v1/auth/logout`를 검토한다.
- [ ] 프로토타입의 `currentUser` 문자열을 `user_id`와 `nickname`으로 분리한다.
- [ ] 인증과 커뮤니티 선택을 분리한다.

완료 기준:

- 비로그인 보호 API 요청은 `401`을 반환한다.
- 로그인 사용자는 자신의 프로필을 조회할 수 있다.

### Phase 4. 커뮤니티 매칭 / 가입

- [ ] 커뮤니티 타입을 고정한다.
  - `building`
  - `block`
- [ ] 시드 커뮤니티 목록을 준비한다.
- [ ] `POST /api/v1/communities/match`를 만든다.
  - 입력: `housingType`, `addressText`
  - 처리: 시드 데이터와 단순 문자열/키워드 규칙으로 후보 추천
  - 출력: 추천 커뮤니티 목록
- [ ] `POST /api/v1/communities/:id/join`을 만든다.
- [ ] `GET /api/v1/me/community`를 만든다.
- [ ] MVP에서는 사용자당 활성 커뮤니티 1개를 기본값으로 둔다.

1차 매칭 규칙:

- 아파트/오피스텔은 `building` 후보를 우선 추천한다.
- 주택/빌라는 `block` 후보를 우선 추천한다.
- 주소/건물명과 시드 커뮤니티의 이름, 키, 지역 라벨을 단순 매칭한다.
- 지도 API와 좌표 기반 nearest block은 후속으로 둔다.

완료 기준:

- 주소/주거 유형 입력 후 추천 목록을 받고, 선택한 커뮤니티에 가입할 수 있다.
- 가입 후 게시판/공동구매 API가 해당 커뮤니티 스코프로 동작한다.

### Phase 5. 자유게시판

- [ ] `GET /api/v1/posts`를 만든다.
  - 기본: 내 커뮤니티
  - 정렬: 최신순
- [ ] `POST /api/v1/posts`를 만든다.
  - `title`
  - `body`
- [ ] `GET /api/v1/posts/:id`를 만든다.
- [ ] 응답에 작성자 닉네임, 생성 시각, 커뮤니티 정보를 포함한다.
- [ ] 본인 글 수정/삭제는 후속으로 둔다.
- [ ] 댓글 API는 MVP 1차에서 만들지 않는다.

검증:

- `title`과 `body`는 필수다.
- 같은 커뮤니티 멤버만 조회/작성할 수 있다.

### Phase 6. 도와주세요

- [ ] `GET /api/v1/help-requests`를 만든다.
- [ ] `POST /api/v1/help-requests`를 만든다.
  - `title`
  - `body`
  - 생성 상태: `open`
- [ ] `GET /api/v1/help-requests/:id`를 만든다.
- [ ] `POST /api/v1/help-requests/:id/resolve`를 만든다.
  - 작성자만 가능
  - `open` -> `resolved`
- [ ] 이미 `resolved`인 요청 재처리는 멱등 성공으로 처리하는 것을 권장한다.
- [ ] 댓글/도움 수락 API는 MVP 1차에서 제외한다.

상태값:

| DB/API | UI |
| --- | --- |
| `open` | 진행중 |
| `resolved` | 완료 |

완료 기준:

- 도움 요청 생성 시 `open`으로 저장된다.
- 작성자가 완료 처리하면 `resolved`가 된다.
- 다른 사용자의 완료 처리는 `403`을 반환한다.
- 응답에는 `done` 상태가 없다.

### Phase 7. 공동구매

- [ ] `GET /api/v1/group-buys`를 만든다.
  - 카드 요약
  - 총액
  - 현재 인원
  - 목표 인원
  - 마감 시각
  - 1인 부담금
  - 상태
- [ ] `GET /api/v1/group-buys/:id`를 만든다.
  - 설명
  - 분배/픽업 안내
  - 참여자 목록
  - 1인 부담금
- [ ] `POST /api/v1/group-buys`를 만든다.
  - 생성자는 자동으로 참여자로 등록한다.
- [ ] `POST /api/v1/group-buys/:id/join`을 만든다.
- [ ] `POST /api/v1/group-buys/:id/close`를 만든다.
  - 모집자만 가능
- [ ] `POST /api/v1/group-buys/:id/cancel`은 선택 기능으로 둔다.
- [ ] 모든 공동구매 응답에 `shareAmount`를 포함한다.

1인 부담금:

```js
Math.ceil(totalAmount / Math.max(participantCount, 1))
```

참여 차단 조건:

- `status !== 'open'`
- 마감 시간이 지남
- 이미 참여함
- 현재 참여 인원 >= 목표 인원

완료 기준:

- 공동구매 생성 시 생성자가 자동 참여한다.
- 참여 시 인원과 1인 부담금이 갱신된다.
- 중복 참여는 `409`를 반환한다.
- 목표 인원 도달 후 참여는 `409`를 반환한다.
- 마감 후 참여는 `409` 또는 `403`을 반환한다.
- 결제/송금 상태는 저장하지 않는다.

### Phase 8. 참여자 관계

- [ ] `group_buy_participants`를 별도 테이블로 저장한다.
- [ ] `GET /api/v1/group-buys/:id/participants`를 만든다.
- [ ] unique(`group_buy_id`, `user_id`)로 중복 참여를 막는다.
- [ ] join 서비스에서 마감 여부, 목표 인원, 중복 참여를 함께 검사한다.
- [ ] `isParticipant(userId, groupBuyId)` 헬퍼를 만든다.

완료 기준:

- 참여 인원과 참여자 목록이 항상 일치한다.
- 동시 요청에도 중복 참여 행이 생기지 않는다.
- 목표 인원을 초과하지 않는다.

### Phase 9. 참여자 채팅

- [ ] 채팅 1차는 REST polling으로 구현한다.
- [ ] `GET /api/v1/group-buys/:id/messages`를 만든다.
- [ ] `POST /api/v1/group-buys/:id/messages`를 만든다.
- [ ] 참여자만 조회/작성할 수 있게 한다.
- [ ] 비참여자는 `403`을 반환한다.
- [ ] 메시지 길이와 빈 문자열을 검증한다.
- [ ] Supabase Realtime/WebSocket은 후속으로 둔다.

### Phase 10. 나의 활동

- [ ] `GET /api/v1/me/activity`를 만든다.
- [ ] 응답에 다음을 포함한다.
  - 내가 쓴 자유게시글
  - 내가 쓴 도움 요청
  - 내가 참여한 공동구매
- [ ] 공동구매 항목에는 `shareAmount`, 상태, 내 역할을 포함한다.
  - `owner`
  - `participant`

## 5. 에러 코드

| HTTP | code | 사용처 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 입력값 오류 |
| 401 | `UNAUTHORIZED` | 미인증 |
| 403 | `FORBIDDEN` | 커뮤니티/참여자/작성자 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복 참여, 목표 인원 도달, 이미 마감 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

작업:

- [ ] 중앙 에러 핸들러를 만든다.
- [ ] `AppError` 같은 도메인 에러를 만든다.
- [ ] 프로덕션에서 stack trace를 노출하지 않는다.
- [ ] Supabase 오류를 공통 에러 포맷으로 매핑한다.

## 6. 검증 기준

### 단위 테스트 후보

- 1인 부담금 계산
- help `open` -> `resolved`
- 목표 인원 도달 시 join 차단
- 마감 후 join 차단
- 작성자/참여자 권한 헬퍼

### 통합 테스트 후보

- 인증 -> 커뮤니티 가입 -> 자유게시글 작성
- 도움 요청 작성 -> 작성자 완료 처리
- 공동구매 생성 -> 참여 -> 금액 갱신 -> 목표 도달 차단 -> 마감
- 비참여자 채팅 접근 거부
- 나의 활동 조회

### 수동 검증

- `npm run dev:api`로 API 서버가 켜진다.
- `GET /health`가 200을 반환한다.
- 필수 env 누락 시 서버가 명확한 메시지로 실패한다.
- 다른 커뮤니티 리소스 접근이 차단된다.
- 댓글/결제/송금/관리자/신고/차단/푸시 API가 없다.

## 7. 추천 구현 순서

1. `server/` 골격, health, env, 공통 에러
2. Supabase 최소 스키마와 시드 커뮤니티
3. 인증 미들웨어와 `/me`
4. 커뮤니티 match/join
5. 공동구매 생성/목록/상세/참여/마감/목표 인원 차단
6. 자유게시판 목록/작성/상세
7. 도와주세요 목록/작성/상세/resolve
8. 참여자 채팅 REST API
9. 나의 활동 API
10. 테스트와 API 문서 정리
11. 후속: 댓글, 지도 매칭, Realtime 채팅, JavaScript ESM 코드 구조 정리
