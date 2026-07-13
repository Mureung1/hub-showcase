# Day 1: 기반 다지기 (DB 마이그레이션 + 공통 미들웨어 + FE 셸) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이번 주 로그인 슬라이스(Day2)와 모임 등록/조회 슬라이스(Day4)가 올라설 기반을 완성한다 — `users`/`meetings`/`meeting_participants` 테이블, 공통 응답/에러 포맷, 세션 인증 미들웨어, FE를 서빙할 정적 셸.

**Architecture:** Express 앱(`src/app.js`)에 `express.static`으로 `public/` 폴더를 서빙해 FE/BE를 동일 오리진(`http://localhost:3000`)으로 유지한다. DB는 `node-pg-migrate`로 3개 테이블을 순서대로 생성한다. 공통 에러는 `ApiError` 클래스 + 에러 핸들링 미들웨어로 일원화하고, 인증은 `express-session` 쿠키 + `requireAuth` 미들웨어로 처리한다.

**Tech Stack:** Node.js, Express, PostgreSQL(`pg`), `node-pg-migrate`, `express-session`, Jest + Supertest.

## Global Constraints

- 응답 포맷: 성공 `{ "data": ... }` / 실패 `{ "error": { "code": "...", "message": "..." } }` (전 엔드포인트 공통).
- 공통 에러 코드: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `SUSPENDED`. 이 코드만 재사용하고 새 코드를 임의로 만들지 않는다.
- 인증 방식: 세션 쿠키(`express-session`). JWT 아님.
- DB 타입 규칙(CHECK): `type='flash'` → `capacity IS NOT NULL AND end_at IS NULL`. `type='small'` → `capacity IS NULL`.
- 유니크 제약: `users(provider, provider_id)`, `meeting_participants(meeting_id, user_id)`.
- 자동화 테스트 범위: 핵심 비즈니스 로직에만 최소한으로 작성한다. DB 마이그레이션(DDL) 자체는 Jest 테스트를 새로 만들지 않고, 기존 Jest `globalSetup`이 매 실행 시 `bungae_test`에 마이그레이션을 적용하는 것(성공/실패 여부)과 수동 `psql` 확인으로 검증한다.
- YAGNI: 이번 태스크에 명시된 컬럼/제약만 만든다. `reports` 테이블, 인덱스(B5), 2차 개발 컬럼은 만들지 않는다.

---

### Task 0: 구글/카카오 OAuth 앱 등록 (외부 준비물, 코드 아님)

이 태스크는 코드 작성이 아니라 외부 콘솔 작업이다. Day2(D1/D2 구현)에서 바로 쓸 수 있도록 오늘 먼저 처리해둔다.

- [ ] **Step 1: 구글 Cloud Console에서 OAuth 클라이언트 발급**
  - https://console.cloud.google.com/apis/credentials 에서 새 프로젝트(또는 기존 프로젝트) 선택 → "OAuth 클라이언트 ID 만들기" → 애플리케이션 유형 "웹 애플리케이션".
  - **승인된 리디렉션 URI**에 정확히 `http://localhost:3000` 을 추가한다 (Task 6에서 FE를 이 오리진에서 서빙하기로 정했기 때문).
  - 발급된 클라이언트 ID/Secret을 기록해둔다 (다음 Step에서 `.env`에 넣는다).

- [ ] **Step 2: 카카오 디벨로퍼스에서 앱 등록**
  - https://developers.kakao.com 에서 애플리케이션 추가 → "카카오 로그인" 활성화.
  - **Redirect URI**에 `http://localhost:3000` 을 등록한다.
  - REST API 키를 기록해둔다. (카카오는 검수가 필요할 수 있으니, 검수 대기 중에는 Day2에서 구글 로그인만으로 슬라이스를 먼저 검증한다 — 스펙 문서의 "전제/리스크" 참고.)

- [ ] **Step 3: 로컬 `.env` 갱신**

`.env` 파일(커밋 안 됨)에 발급받은 값을 채운다:

```
GOOGLE_CLIENT_ID=<발급받은 값>
GOOGLE_CLIENT_SECRET=<발급받은 값>
KAKAO_CLIENT_ID=<발급받은 REST API 키>
KAKAO_CLIENT_SECRET=<카카오는 클라이언트 시크릿 사용 여부를 앱 설정에서 확인 후 채움>
```

`.env.example`은 이미 이 키들의 placeholder를 갖고 있으므로 수정하지 않는다.

---

### Task 1: `users` 테이블 마이그레이션 (B1)

**Files:**
- Create: `migrations/<timestamp>_create-users-table.js` (파일명은 Step 1 실행 시 자동 생성됨)

**Interfaces:**
- Produces: `users` 테이블 — 컬럼 `id, provider, provider_id, email, nickname, birth_date, trust_score, created_at, suspended_until, suspension_count`. 이후 모든 태스크(C2 인증, D1/D2 로그인, E1 host_id FK)가 이 테이블을 참조한다.

- [ ] **Step 1: 마이그레이션 파일 생성**

Run: `npm run migrate:create -- create-users-table`
Expected: `migrations/<timestamp>_create-users-table.js` 파일이 생성됨 (내용은 빈 `up`/`down` 템플릿).

- [ ] **Step 2: 마이그레이션 내용 작성**

생성된 파일을 아래 내용으로 채운다 (`migrations/1783684950423_smoke-test-table.js`와 동일한 export 스타일 사용):

```js
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'bigserial', primaryKey: true },
    provider: { type: 'varchar(20)', notNull: true },
    provider_id: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    nickname: { type: 'varchar(50)', notNull: true },
    birth_date: { type: 'date' },
    trust_score: { type: 'numeric(4,1)', notNull: true, default: 50.0 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    suspended_until: { type: 'timestamp' },
    suspension_count: { type: 'int', notNull: true, default: 0 },
  });

  pgm.addConstraint('users', 'users_provider_provider_id_unique', {
    unique: ['provider', 'provider_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('users');
};
```

- [ ] **Step 3: 개발 DB(`bungae`)에 적용하고 확인**

Run: `npm run migrate`
Run: `psql -U postgres -d bungae -c "\d users"`
Expected: `provider, provider_id, email, nickname, birth_date, trust_score, created_at, suspended_until, suspension_count` 컬럼과 `users_provider_provider_id_unique` UNIQUE 제약이 출력에 보임.

- [ ] **Step 4: 유니크 제약 수동 확인**

Run:
```
psql -U postgres -d bungae -c "INSERT INTO users (provider, provider_id, email, nickname) VALUES ('google', 'abc123', 'a@test.com', 'A');"
psql -U postgres -d bungae -c "INSERT INTO users (provider, provider_id, email, nickname) VALUES ('google', 'abc123', 'b@test.com', 'B');"
```
Expected: 두 번째 INSERT가 `duplicate key value violates unique constraint "users_provider_provider_id_unique"` 에러로 실패.

Run: `psql -U postgres -d bungae -c "DELETE FROM users;"` (확인용으로 넣은 데이터 정리)

- [ ] **Step 5: 테스트 DB에도 자동 적용되는지 확인**

Run: `npm test`
Expected: 기존 `tests/dummy.test.js`가 PASS (Jest `globalSetup`이 `bungae_test`에 이 마이그레이션까지 자동 적용하고, 스키마 에러 없이 통과함을 의미).

- [ ] **Step 6: Commit**

```bash
git add migrations/
git commit -m "Add users table migration (Task B1)"
```

---

### Task 2: `meetings` 테이블 마이그레이션 (B2)

**Files:**
- Create: `migrations/<timestamp>_create-meetings-table.js`

**Interfaces:**
- Consumes: Task 1의 `users.id` (FK 대상)
- Produces: `meetings` 테이블 — 컬럼 `id, host_id, type, title, category, description, region_sido, region_sigungu, region_eupmyeondong, start_at, end_at, capacity, adult_only, open_chat_url, status, created_at`. 이후 E1/E2(모임 등록/조회) 태스크가 이 테이블을 사용한다.

- [ ] **Step 1: 마이그레이션 파일 생성**

Run: `npm run migrate:create -- create-meetings-table`

- [ ] **Step 2: 마이그레이션 내용 작성**

```js
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('meetings', {
    id: { type: 'bigserial', primaryKey: true },
    host_id: { type: 'bigint', notNull: true, references: 'users' },
    type: { type: 'varchar(10)', notNull: true },
    title: { type: 'varchar(100)', notNull: true },
    category: { type: 'varchar(30)', notNull: true },
    description: { type: 'text' },
    region_sido: { type: 'varchar(20)', notNull: true },
    region_sigungu: { type: 'varchar(20)', notNull: true },
    region_eupmyeondong: { type: 'varchar(20)' },
    start_at: { type: 'timestamp', notNull: true },
    end_at: { type: 'timestamp' },
    capacity: { type: 'int' },
    adult_only: { type: 'boolean', notNull: true, default: false },
    open_chat_url: { type: 'text', notNull: true },
    status: { type: 'varchar(15)', notNull: true, default: 'recruiting' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('meetings', 'meetings_type_capacity_endat_check', {
    check: "(type = 'flash' AND capacity IS NOT NULL AND end_at IS NULL) OR (type = 'small' AND capacity IS NULL)",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('meetings');
};
```

- [ ] **Step 3: 적용하고 컬럼/제약 확인**

Run: `npm run migrate`
Run: `psql -U postgres -d bungae -c "\d meetings"`
Expected: 위 컬럼 전부와 `meetings_type_capacity_endat_check` CHECK 제약이 출력에 보임.

- [ ] **Step 4: CHECK 제약 수동 확인 (flash + capacity NULL → 실패해야 함)**

Run:
```
psql -U postgres -d bungae -c "INSERT INTO users (provider, provider_id, email, nickname) VALUES ('google', 'host1', 'host@test.com', 'Host') RETURNING id;"
```
(위에서 반환된 id를 아래 `<HOST_ID>`에 대입)
```
psql -U postgres -d bungae -c "INSERT INTO meetings (host_id, type, title, category, region_sido, region_sigungu, start_at, capacity, open_chat_url) VALUES (<HOST_ID>, 'flash', 'test', '운동', '서울', '강남구', now(), NULL, 'https://open.kakao.com/o/x');"
```
Expected: `new row for relation "meetings" violates check constraint "meetings_type_capacity_endat_check"` 에러.

Run: `psql -U postgres -d bungae -c "DELETE FROM users;"` (확인용 데이터 정리 — `meetings`는 FK라 users 삭제 전에 비어있어야 함, 위 INSERT가 실패했으므로 meetings는 비어있음)

- [ ] **Step 5: 테스트 DB 자동 적용 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations/
git commit -m "Add meetings table migration (Task B2)"
```

---

### Task 3: `meeting_participants` 테이블 마이그레이션 (B3)

**Files:**
- Create: `migrations/<timestamp>_create-meeting-participants-table.js`

**Interfaces:**
- Consumes: Task 1의 `users.id`, Task 2의 `meetings.id`
- Produces: `meeting_participants` 테이블 — 이후 Epic F(참여 신청, 이번 주 범위 밖)에서 사용. 이번 주엔 테이블만 만들고 API는 구현하지 않는다.

- [ ] **Step 1: 마이그레이션 파일 생성**

Run: `npm run migrate:create -- create-meeting-participants-table`

- [ ] **Step 2: 마이그레이션 내용 작성**

```js
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('meeting_participants', {
    id: { type: 'bigserial', primaryKey: true },
    meeting_id: { type: 'bigint', notNull: true, references: 'meetings' },
    user_id: { type: 'bigint', notNull: true, references: 'users' },
    status: { type: 'varchar(15)', notNull: true },
    applied_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    responded_at: { type: 'timestamp' },
  });

  pgm.addConstraint('meeting_participants', 'meeting_participants_meeting_user_unique', {
    unique: ['meeting_id', 'user_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('meeting_participants');
};
```

- [ ] **Step 3: 적용하고 확인**

Run: `npm run migrate`
Run: `psql -U postgres -d bungae -c "\d meeting_participants"`
Expected: 컬럼 전부와 `meeting_participants_meeting_user_unique` UNIQUE 제약이 출력에 보임.

- [ ] **Step 4: 테스트 DB 자동 적용 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add migrations/
git commit -m "Add meeting_participants table migration (Task B3)"
```

---

### Task 4: 공통 응답 포맷 & 에러 핸들링 미들웨어 (C1)

**Files:**
- Create: `src/utils/apiError.js`
- Create: `src/middleware/errorHandler.js`
- Test: `tests/errorHandler.test.js`

**Interfaces:**
- Produces: `ApiError` 클래스(`new ApiError(code, message)` — `code`는 `UNAUTHENTICATED|FORBIDDEN|NOT_FOUND|VALIDATION_ERROR|SUSPENDED` 중 하나, HTTP status는 내부적으로 매핑), `errorHandler` Express 4-인자 미들웨어(`(err, req, res, next) => void`).이후 Task 5(C2)와 Day2~5의 모든 라우트가 `throw new ApiError(...)` 형태로 에러를 던지고 이 미들웨어가 JSON으로 변환한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/errorHandler.test.js`:

```js
const express = require('express');
const request = require('supertest');
const ApiError = require('../src/utils/apiError');
const errorHandler = require('../src/middleware/errorHandler');

function buildTestApp() {
  const app = express();
  app.get('/throw-api-error', (req, res, next) => {
    next(new ApiError('VALIDATION_ERROR', '잘못된 입력입니다'));
  });
  app.get('/throw-generic-error', (req, res, next) => {
    next(new Error('unexpected'));
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('ApiError를 공통 포맷 + 올바른 status로 변환한다', async () => {
    const res = await request(buildTestApp()).get('/throw-api-error');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '잘못된 입력입니다' },
    });
  });

  it('일반 Error는 500 + INTERNAL_ERROR로 변환한다', async () => {
    const res = await request(buildTestApp()).get('/throw-generic-error');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npx jest tests/errorHandler.test.js`
Expected: FAIL with `Cannot find module '../src/utils/apiError'`

- [ ] **Step 3: `ApiError` 구현**

`src/utils/apiError.js`:

```js
const STATUS_BY_CODE = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SUSPENDED: 403,
};

class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code] || 500;
  }
}

module.exports = ApiError;
```

- [ ] **Step 4: `errorHandler` 구현**

`src/middleware/errorHandler.js`:

```js
const ApiError = require('../utils/apiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
}

module.exports = errorHandler;
```

- [ ] **Step 5: 테스트 실행해서 통과 확인**

Run: `npx jest tests/errorHandler.test.js`
Expected: PASS (2 tests)

- [ ] **Step 6: `src/app.js`에 에러 핸들러 연결**

`src/app.js`의 기존 라우트들 뒤, `module.exports = app;` 앞에 추가:

```js
const errorHandler = require('./middleware/errorHandler');
// ... (기존 app.get('/health', ...) 라우트 아래)
app.use(errorHandler);
```

- [ ] **Step 7: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/apiError.js src/middleware/errorHandler.js src/app.js tests/errorHandler.test.js
git commit -m "Add common response format and error handling middleware (Task C1)"
```

---

### Task 5: 세션 설정 + 인증 미들웨어 (C2)

**Files:**
- Modify: `package.json` (dependencies에 `express-session` 추가)
- Create: `src/config/session.js`
- Create: `src/middleware/auth.js`
- Test: `tests/auth.test.js`

**Interfaces:**
- Consumes: Task 1의 `users` 테이블(`suspended_until` 컬럼), Task 4의 `ApiError`
- Produces: `sessionMiddleware`(Express 미들웨어, `req.session.userId`를 세션에 저장하는 용도로 Day2의 D1/D2가 로그인 성공 시 사용), `requireAuth(req, res, next)` 미들웨어 — `req.session.userId`가 없으면 `ApiError('UNAUTHENTICATED', ...)`, 있으면 DB에서 `suspended_until`을 조회해 현재 시각보다 미래면 `ApiError('SUSPENDED', ...)`, 통과하면 `req.session.userId`를 그대로 두고 `next()`.

- [ ] **Step 1: `express-session` 설치**

Run: `npm install express-session`
Expected: `package.json`의 `dependencies`에 `express-session`이 추가됨.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/auth.test.js`:

```js
const express = require('express');
const request = require('supertest');
const pool = require('../src/config/db');
const sessionMiddleware = require('../src/config/session');
const requireAuth = require('../src/middleware/auth');
const errorHandler = require('../src/middleware/errorHandler');

function buildTestApp() {
  const app = express();
  app.use(sessionMiddleware);
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ data: { userId: req.session.userId } });
  });
  // 테스트 전용: 세션에 강제로 userId를 심는 라우트
  app.post('/test-login/:userId', (req, res) => {
    req.session.userId = Number(req.params.userId);
    res.json({ data: 'ok' });
  });
  app.use(errorHandler);
  return app;
}

async function createUser({ suspendedUntil = null } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname, suspended_until)
     VALUES ('google', $1, 'a@test.com', 'A', $2) RETURNING id`,
    [`provider-id-${Date.now()}-${Math.random()}`, suspendedUntil]
  );
  return rows[0].id;
}

describe('requireAuth', () => {
  it('세션 없이 접근하면 401 UNAUTHENTICATED', async () => {
    const res = await request(buildTestApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('로그인 상태면 통과한다', async () => {
    const userId = await createUser();
    const agent = request.agent(buildTestApp());
    await agent.post(`/test-login/${userId}`);
    const res = await agent.get('/protected');
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(userId);
  });

  it('정지된 계정이면 403 SUSPENDED', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const userId = await createUser({ suspendedUntil: future });
    const agent = request.agent(buildTestApp());
    await agent.post(`/test-login/${userId}`);
    const res = await agent.get('/protected');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUSPENDED');
  });
});
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

Run: `npx jest tests/auth.test.js`
Expected: FAIL with `Cannot find module '../src/config/session'`

- [ ] **Step 4: 세션 설정 구현**

`src/config/session.js`:

```js
const session = require('express-session');

module.exports = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
});
```

- [ ] **Step 5: `requireAuth` 구현**

`src/middleware/auth.js`:

```js
const pool = require('../config/db');
const ApiError = require('../utils/apiError');

async function requireAuth(req, res, next) {
  try {
    if (!req.session.userId) {
      throw new ApiError('UNAUTHENTICATED', '로그인이 필요합니다');
    }

    const { rows } = await pool.query(
      'SELECT suspended_until FROM users WHERE id = $1',
      [req.session.userId]
    );

    const suspendedUntil = rows[0] && rows[0].suspended_until;
    if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
      throw new ApiError('SUSPENDED', '정지된 계정입니다');
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
```

- [ ] **Step 6: 테스트 실행해서 통과 확인**

Run: `npx jest tests/auth.test.js`
Expected: PASS (3 tests)

- [ ] **Step 7: `src/app.js`에 세션 미들웨어 연결**

`src/app.js`에서 `const app = express();` 바로 아래에 추가:

```js
const sessionMiddleware = require('./config/session');
app.use(sessionMiddleware);
```

- [ ] **Step 8: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/config/session.js src/middleware/auth.js src/app.js tests/auth.test.js
git commit -m "Add session config and requireAuth middleware (Task C2)"
```

---

### Task 6: FE 기본 셸 + 정적 서빙

**Files:**
- Create: `public/index.html`
- Modify: `src/app.js`

**Interfaces:**
- Produces: `http://localhost:3000/` 에서 열리는 정적 페이지 셸(상단 네비게이션 + 5개 빈 view 컨테이너: home/list/create/mypage/auth, clab-design-system 토큰 CSS 적용). Day2가 `#auth` view 안에, Day4가 `#create`/`#list` view 안에 실제 화면을 채워 넣는다.
- Consumes: 없음 (이번 주 처음 만드는 정적 파일)

- [ ] **Step 1: `public/index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>번개모임 & 소모임</title>
<style>
  :root {
    --bg-top: #f4ead9;
    --bg-bottom: #e2d1b3;
    --surface-glass: rgba(255, 255, 255, 0.5);
    --surface-glass-border: rgba(255, 255, 255, 0.75);
    --surface-solid: #fdfbf7;
    --surface-dark: #17140f;
    --accent: #ea7a2b;
    --accent-soft: #f3a768;
    --accent-glow: #ffc493;
    --ink: #1c1810;
    --ink-mute: #83786a;
    --cream: #f6efe4;
    --cream-mute: #a49a89;
    --line: rgba(28, 24, 16, 0.08);
    --radius-app: 30px;
    --radius-card: 22px;
    --radius-pill: 999px;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg-top: #221d18;
      --bg-bottom: #14110d;
      --surface-glass: rgba(255, 255, 255, 0.07);
      --surface-glass-border: rgba(255, 255, 255, 0.14);
      --surface-solid: #221e18;
      --surface-dark: #0e0c09;
      --ink: #f2ead9;
      --ink-mute: #a89d89;
      --cream-mute: #7d7466;
      --line: rgba(255, 255, 255, 0.09);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--ink);
    background: linear-gradient(160deg, var(--bg-top), var(--bg-bottom));
    background-attachment: fixed;
    min-height: 100vh;
  }
  .page { max-width: 440px; margin: 0 auto; padding: 20px 20px 100px; }
  .view { display: none; }
  .view.active { display: block; }
  .bottom-nav {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    width: calc(100% - 40px); max-width: 400px;
    background: var(--surface-glass); border: 1px solid var(--surface-glass-border);
    backdrop-filter: blur(22px); border-radius: var(--radius-pill);
    display: flex; justify-content: space-around; padding: 10px 6px;
  }
  .bottom-nav-link {
    background: none; border: none; cursor: pointer;
    color: var(--ink-mute); font-size: 10.5px; font-weight: 700;
    padding: 6px 14px; border-radius: var(--radius-pill);
  }
  .bottom-nav-link.active { color: var(--ink); background: rgba(255,255,255,0.5); }
</style>
</head>
<body>
  <div class="page">
    <section id="home" class="view active"><h2>번개모임 &amp; 소모임</h2></section>
    <section id="list" class="view"><h2>모임 찾기</h2></section>
    <section id="create" class="view"><h2>모임 만들기</h2></section>
    <section id="mypage" class="view"><h2>마이페이지</h2></section>
    <section id="auth" class="view"><h2>로그인</h2></section>
  </div>

  <nav class="bottom-nav">
    <button class="bottom-nav-link active" data-tab="home">홈</button>
    <button class="bottom-nav-link" data-tab="list">모임 찾기</button>
    <button class="bottom-nav-link" data-tab="create">모임 만들기</button>
    <button class="bottom-nav-link" data-tab="mypage">마이페이지</button>
    <button class="bottom-nav-link" data-tab="auth">로그인</button>
  </nav>

  <script>
    document.querySelectorAll('.bottom-nav-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
        document.querySelectorAll('.bottom-nav-link').forEach((b) => b.classList.remove('active'));
        document.getElementById(btn.dataset.tab).classList.add('active');
        btn.classList.add('active');
      });
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: `src/app.js`에 정적 서빙 추가**

`src/app.js`에서 `const app = express();` 아래, 세션 미들웨어 다음 줄에 추가:

```js
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'public')));
```

- [ ] **Step 3: 수동 확인**

Run: `npm start`
Then: 브라우저에서 `http://localhost:3000` 접속
Expected: "번개모임 & 소모임" 홈 화면이 보이고, 하단 네비게이션 5개 탭(홈/모임 찾기/모임 만들기/마이페이지/로그인) 클릭 시 해당 view로 전환됨.

- [ ] **Step 4: 전체 테스트 실행 (회귀 확인)**

Run: `npm test`
Expected: 모든 테스트 PASS (정적 파일 서빙 추가가 기존 API 테스트에 영향 없어야 함).

- [ ] **Step 5: Commit**

```bash
git add public/index.html src/app.js
git commit -m "Add FE shell served as static files (clab-design-system tokens)"
```
