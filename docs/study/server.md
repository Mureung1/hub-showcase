# 스터디 노트 — FE/BE 개발 환경 개념 정리

이 파일은 server(BE) 폴더 전용 노트. 공통 개념은 `root.md`, client 쪽은 `client.md` 참고.

---

## 1. 포트 & CORS (server 관점)

### 1-1. 포트 번호 4000

- client(5173)는 Vite가 정해놓은 기본값이지만, **4000은 이 프로젝트 팀이 직접 고른 번호**다 (server엔 프레임워크가 정해준 기본 포트가 없음).
- `.env`에서 override 가능: `server/.env`에 각자 로컬로 생성 (견본은 `server/.env.example`). 다른 프로그램이 이미 4000번을 쓰고 있으면 코드를 안 건드리고 개인 `.env`에서만 바꿀 수 있음.

### 1-2. CORS — 왜 브라우저가 client→server 요청을 막는가

브라우저는 보안상 "포트가 다르면 다른 곳"으로 취급한다(CORS, Cross-Origin Resource Sharing). client(5173)가 server(4000)에 직접 요청을 보내면, 브라우저가 이를 차단한다 — 서로 다른 사이트인 척 위장해서 몰래 데이터를 가져가는 공격을 막기 위한 기본 규칙.

개발 중에는 이 문제를 `client/vite.config.ts`의 `/api` 프록시로 우회한다 (client가 같은 곳(same-origin)에 요청하는 것처럼 보이게 만듦 — 자세한 원리는 `client.md` 1장 참고). 배포 시에는 server가 직접 `cors` 미들웨어로 "이 client 주소는 허용"이라고 설정해주는 방식이 일반적.

---

## 2. `dist` ↔ `src` 관계 — server도 결국 "번역 결과물 창고"

`server/dist`를 열어보면 이렇게 생겼다:

```
server/dist/
 ├─ index.js
 ├─ app.js
 ├─ app.test.js
 ├─ lib/env.js
 └─ lib/supabase.js
```

`server/src`(진짜 코드)를 보면:

```
server/src/
 ├─ index.ts
 ├─ app.ts
 ├─ app.test.ts
 ├─ lib/env.ts
 └─ lib/supabase.ts
```

**폴더 구조가 완전히 똑같고, 확장자만 `.ts` → `.js`로 바뀐 것.** `dist`는 "내가 짠 TypeScript 코드를, 폴더 구조 그대로 유지한 채 순수 JS로 번역해서 복사해둔 결과물"이다. 실제로 `dist/index.js`를 열어보면 타입 표시가 다 사라지고 순수 JS만 남아있다:

```js
import { app } from './app.js';
import { env } from './lib/env.js';
app.listen(env.PORT, () => {
    console.log(`server listening on http://localhost:${env.PORT}`);
});
```

**비유**: `src`는 "손글씨 원고", `dist`는 그걸 "타이핑해서 인쇄소로 보낼 수 있게 만든 최종본". 개발할 땐 손글씨(src)를 계속 고치지만, 실제로 세상에 내보낼 때는 인쇄본(dist)만 필요하다.

---

## 3. `.env.example` — client 것과 똑같아 보이지만

실제 내용:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

4줄 중 앞 2줄(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)만 DB 관련이고, 나머지 2줄은 **DB와 무관한 server 자체 설정**이다.
- `PORT=4000` → 이 서버가 쓸 포트 번호
- `CORS_ORIGIN=http://localhost:5173` → "이 주소(client)에서 오는 요청만 허용" (CORS 허용 설정)

즉 이 파일은 "DB 전용 개발환경"이 아니라, **"server를 켜는 데 필요한 비밀값 전부를 모아둔 것"**이고, 그 안에 마침 DB 접속 정보도 포함된 것. client의 `.env.example`도 같은 이유로 DB 값이 겹쳐 들어있을 뿐, "DB용"이라는 별도 카테고리가 있는 게 아니다.

---

## 4. src 폴더 파일 하나씩 뜯어보기

### 4-1. `lib/env.ts` — `.env`를 "검사하고 정리해주는 코드"

`.env`(그리고 `.env.example`)는 그냥 텍스트 파일(키=값)이다. `lib/env.ts`는 그 내용을 읽어서 **검증하고 타입을 입혀주는 코드**다:

```ts
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

- `.env`에 값이 없어도 `PORT`, `CORS_ORIGIN`은 **기본값**을 자동으로 채움
- `SUPABASE_URL` 등은 **없어도 괜찮다**(`optional`)고 표시
- 이상한 값(숫자여야 하는데 글자 등)이 들어오면 여기서 바로 에러를 냄

관계 그림:
```
.env (메모장, 그냥 글자)
   ↓ dotenv가 읽어서 process.env에 넣어줌
env.ts (zod로 검사 + 타입 부여 + 기본값 채움)
   ↓
나머지 코드가 여기서 만든 안전한 env를 갖다 씀
```

### 4-2. `lib/supabase.ts` — client 버전과의 차이

```ts
import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

export const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null
```

client의 `lib/supabase.ts`는 값이 없으면 `throw new Error(...)`로 앱을 바로 멈췄는데, server 버전은 값이 없으면 그냥 **`null`**을 준다 (조용히 "DB 연결 없음" 상태로 둠). Supabase 프로젝트가 아직 안 만들어진 지금 단계에서, server가 DB 없이도 일단 켜질 수 있게 배려한 설계.

**`@supabase/supabase-js`의 `@`는 뭐냐**: "찾아서 가져오라"는 명령이 아니라, npm 패키지 이름 앞에 붙이는 **소속 그룹(스코프) 표시**다. 회사 이름표 같은 것. 실제로 `node_modules/@supabase/` 안엔 이렇게 여러 패키지가 모여있다:
```
node_modules/@supabase/
 ├─ auth-js
 ├─ functions-js
 ├─ postgrest-js
 ├─ realtime-js
 ├─ storage-js
 └─ supabase-js   ← 우리가 쓰는 것
```
`src/lib/supabase.ts`는 우리가 짠 "설정 코드"고, 진짜 라이브러리 본체는 `node_modules/@supabase/supabase-js`에 따로 있다. `import ... from '@supabase/supabase-js'`라고 쓰면 Node.js가 `src`가 아니라 그 `node_modules` 경로를 찾아가서 가져온다.

### 4-3. `app.ts` — 서버(식당)를 조립하는 코드

```ts
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './lib/env.js'

export const app = express()

app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(morgan('dev'))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})
```

client의 `App.tsx`는 화면(UI)을 그리는 컴포넌트였지만, server의 `app.ts`는 **Express 서버 자체를 조립하는 코드**다. `/api/health`는 어딘가에서 가져오는 게 아니라, **바로 이 코드 자체가 API**다 — `app.get(경로, 함수)`라고 쓰는 순간 그 주소로 오는 요청을 처리하는 API가 만들어진다. 아직 `routes/`, `controllers/` 폴더가 비어있어서, 이 간단한 "서버 살아있나 확인용" API 하나만 지금은 `app.ts`에 직접 적혀있다.

### 4-4. `index.ts` — 실제로 문을 여는 시작점

```ts
import { app } from './app.js'
import { env } from './lib/env.js'

app.listen(env.PORT, () => {
  console.log(`server listening on http://localhost:${env.PORT}`)
})
```

- `import ... from './app.js'` — 파일은 `app.ts`인데 `.js`로 쓰는 이유: TypeScript가 나중에 컴파일하면 결국 `.js`가 될 거라서, "컴파일 후 기준"으로 미리 써두는 관례 (`tsconfig`의 `moduleResolution: "bundler"` 설정이 허용해줌).
- `app.listen(포트번호, 콜백함수)` — 딱 이 한 줄이 하는 일:
  1. `env.PORT`(4000) 번지에 **진짜로 소켓 문을 열음** (Vite가 5173번에 소켓 열던 것과 같은 방식)
  2. 문이 열리면 콜백 함수 실행 → `console.log`로 "듣고 있어요!" 출력

**이벤트 루프와의 연결**: `app.listen(...)`은 문을 열고 끝나는 게 아니라 **계속 기다리는 상태로 남아있다.** 서버는 "누가 요청 보낼 때까지 한가하게 기다리다가, 요청 오면 처리하고 다시 기다리는" 방식으로 동작한다 (`root.md` 6장 JS 싱글스레드+이벤트루프 참고).

**비유**: `app.ts` = 식당 인테리어·메뉴·직원 배치를 다 끝낸 상태(문은 아직 안 열림). `index.ts` = 실제로 문을 열고(`listen`) "영업 시작합니다!" 소리치는 것(`console.log`). client의 `main.tsx`가 "빈 화면에 그림을 그려 넣는 시작점"이었다면, server의 `index.ts`는 **"실제로 네트워크 문을 열어 요청을 받기 시작하는 시작점"**이다.

### 4-5. `app.test.ts` — 서버가 잘 응답하는지 확인하는 테스트

```ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
```

client의 `App.test.tsx`와 같은 개념이지만, 화면을 그려보는 대신 **가짜로 `/api/health`에 요청을 보내보고 응답이 `{status: 'ok'}`로 오는지** 확인한다.

**정리**: `app.ts`(서버 조립) → `index.ts`(서버 실행 시작점) → `app.test.ts`(서버 응답 테스트), 이 셋이 한 세트.

---

## 5. controllers / middleware / routes / services / types — 아직 비어있는 폴더들

| 폴더 | 역할 | 비유 |
|---|---|---|
| **`middleware/`** | 모든 요청이 컨트롤러에 도착하기 **전에** 공통으로 거치는 검문소 (로그인 확인, 에러 처리 등) | 식당 입구에서 예약 확인하는 문지기 |
| **`routes/`** | "이 주소(`/api/events`)로 오면 어떤 컨트롤러가 처리한다"를 연결해주는 지도 | "몇 번 테이블은 몇 번 직원 담당" 배정표 |
| **`controllers/`** | 요청에서 값 꺼내기 + service 호출 + 응답 포장 (진짜 로직은 안 함) | 주문 받고 주방에 전달하는 홀 직원 |
| **`services/`** | 진짜 비즈니스 로직 (DB 조회, 계산 등) | 실제로 요리하는 주방 |
| **`types/`** | server 여기저기서 같이 쓰는 타입 정의 (client의 `types/`와 같은 개념) | (client와 동일) |

**컨트롤러 예시** (아직 실제로 없는 가상 예시):
```ts
// controllers/eventController.ts (예시)
import { getEventById } from '../services/eventService.js'

export async function getEvent(req, res) {
  const event = await getEventById(req.params.id)  // 진짜 일은 service한테 시킴
  res.json(event)                                    // 결과만 포장해서 응답
}
```

---

## 6. 요청 처리 흐름 — middleware가 제일 먼저!

```
요청 도착
   ↓
① middleware   (모든 요청이 공통으로 거치는 검문소 — CORS 확인, 로그, JSON 파싱 등)
   ↓
② routes       (이 주소는 어떤 컨트롤러가 처리할지 배정)
   ↓
③ controller   (요청에서 값 꺼내고, service 호출)
   ↓
④ service      (진짜 로직 — DB 조회/계산)
   ↓
③ controller로 결과 돌아옴 → 응답 포장
   ↓
클라이언트에게 응답
```

middleware가 왜 먼저냐면: 문지기(middleware)는 손님이 식당 안(controller/service)까지 들어오기 전에 미리 확인하는 역할이라, 항상 제일 먼저 온다. 실제로 `app.ts`에서도 `app.use(cors...)`, `app.use(morgan...)`, `app.use(express.json())`(middleware들)이 `app.get(...)`(route+controller)보다 먼저 등록돼있다.

### 전체 파일 관계 한눈에 보기

```
                         [ 요청이 들어옴 ]
                               │
                               ▼
                    ┌─────────────────────┐
                    │      app.ts          │  ← 서버 조립 (express 앱 생성)
                    │  ┌────────────────┐  │
                    │  │  middleware/    │  │  ← ① CORS, 로그, JSON 파싱 (검문소)
                    │  └────────────────┘  │
                    │  ┌────────────────┐  │
                    │  │  routes/        │  │  ← ② 주소별 담당자 배정표
                    │  └───────┬────────┘  │
                    └──────────┼───────────┘
                               ▼
                    ┌─────────────────────┐
                    │   controllers/       │  ← ③ 요청 접수 + 응답 포장 (홀 직원)
                    └──────────┬───────────┘
                               ▼
                    ┌─────────────────────┐
                    │    services/          │  ← ④ 진짜 로직 (주방)
                    └──────────┬───────────┘
                               ▼
                    ┌─────────────────────┐
                    │  lib/supabase.ts      │  ← DB 연결 통로
                    │  (node_modules의       │
                    │   @supabase/supabase-js │  ← 진짜 라이브러리 본체
                    │   를 갖다 씀)          │
                    └──────────┬───────────┘
                               ▼
                          [ Supabase DB ]

  ─────────── 이 모든 걸 조립/실행하는 파일들 ───────────
  lib/env.ts     → .env 값을 검증·타입 부여해서 다른 모든 곳에 공급
  index.ts       → app.listen()으로 실제 서버를 켜는 시작점
  app.test.ts    → app.ts가 잘 작동하는지 가짜 요청 보내서 확인
  types/         → 여기저기서 같이 쓰는 타입 정의 모음
```

---

## 7. `npm run dev` vs `npm run start` (간단 요약)

```json
"dev": "tsx watch src/index.ts",
"build": "tsc -p tsconfig.json",
"start": "node dist/index.js"
```

| | `dev` | `start` |
|---|---|---|
| 실행하는 파일 | `src/index.ts` (원본) | `dist/index.js` (번역 완료본) |
| 자동 재시작 | 됨 (`watch`) | 안 됨 |
| 사전 준비 | 필요 없음 | `npm run build` 먼저 해야 함 |
| 언제 쓰나 | 코드 짜고 고치는 중 | 완성해서 실제로 배포/운영할 때 |
