---
name: test-writer
description: 잔소리봇 레포(C:\Users\LG\hub) 전용 테스트 작성 규칙. lib/**(순수 함수)는 Vitest 단위 테스트, routes/**(Express 라우트)는 supertest 기반 통합 테스트로 구분해 작성한다. "테스트 작성해줘", "test-writer", 새 함수/라우트에 테스트가 없을 때, scoring.ts/microtask.ts/nudge.ts 같은 lib 함수나 tasks.ts 같은 라우트를 만들거나 고칠 때 이 Skill을 적용한다. 통합 테스트가 실제 Supabase DB에 쓰기 전에 반드시 거쳐야 하는 안전장치(prefix, teardown, DATABASE_URL 가드)도 이 Skill이 강제한다.
---

> **재사용 방법**: "테스트 작성해줘" / "test-writer 써서 만들어줘"라고 말하면 이 문서의 규칙을 따라 테스트 파일을 만든다.

## 1. 단위 테스트 vs 통합 테스트, 어떻게 나누나

파일이 있는 위치가 곧 테스트 종류를 결정한다.

| 대상 | 예시 | 테스트 종류 | 이유 |
| --- | --- | --- | --- |
| `server/src/lib/**`, `src/lib/**` | `server/src/lib/scoring.ts` | **단위 테스트** | 입력→출력만 있는 순수 함수. DB/네트워크 없이 함수만 import해서 검증 가능 |
| `server/src/routes/**` | `server/src/routes/tasks.ts` | **통합 테스트** | Express 라우트는 요청 파싱, Prisma 쿼리, 응답 포맷(`{ data }` / `{ error }`)이 한 몸으로 얽혀 있어 실제 HTTP 요청을 보내야 의미가 있다 |

라우트 안에서 호출하는 `lib` 함수(예: `tasks.ts`가 쓰는 `calculateLevel`)는 라우트 테스트에서 다시 검증하지 말 것 — 그 함수의 모든 경계 케이스는 이미 자기 자신의 단위 테스트에서 다뤘어야 한다. 라우트 테스트는 "이 엔드포인트가 올바른 상태변화/응답을 만드는가"만 확인한다.

## 2. 파일 배치 & 실행 방법

- 테스트 파일은 소스 파일 바로 옆에 `*.test.ts`로 둔다. `__tests__/` 폴더를 새로 만들지 않는다.
  - `server/src/lib/scoring.ts` → `server/src/lib/scoring.test.ts`
  - `server/src/routes/tasks.ts` → `server/src/routes/tasks.test.ts`
- `any` 타입 금지 (CLAUDE.md 컨벤션 그대로 테스트 코드에도 적용된다 — `tsconfig`가 `strict`+`noImplicitAny`이므로 목(mock) 데이터도 실제 타입을 맞춰서 작성한다).
- 실행 명령:
  - 프론트(`src/lib/**`): 루트에서 `npm run test`
  - 서버(`server/src/**`): 루트에서 `npm run test:server`, 또는 `server/`에서 `npm run test`
  - 전체: 루트에서 `npm run test:all`
- Vitest 설정은 이미 되어 있다 — 새로 만들지 말 것: 루트 `vite.config.js`의 `test` 필드(`environment: "node"`), `server/vitest.config.ts`(`environment: "node"`, `include: ["src/**/*.test.ts"]`).

## 3. 테스트 케이스 3분류 — 이 순서로 채운다

테스트 하나를 짤 때마다 아래 세 가지를 다 갖췄는지 점검한다. 셋 중 하나라도 빠지면 "이 함수/라우트가 실제로 깨졌을 때 못 잡아내는" 구멍이 남는다.

1. **정상 케이스(happy path)** — 문서/타입대로 넣었을 때 기대한 결과가 나오는가.
2. **경계 케이스** — 빈 값, `0`/음수/범위 밖 값, 존재하지 않는 id, 필수 필드 누락 등. 예: `calculateLevel`이라면 `skipCount: 0`과 레벨 상한(4)을 넘는 큰 값.
3. **실전 버그 회귀 케이스** — 과거에 실제로 터졌던 버그를 그대로 재현해서 "다시는 안 돌아오게" 고정한다. 이 저장소에서 이미 한 번 터졌던 사례:
   - **#17 삭제-폴링 레이스 컨디션**: `tasks.ts`의 `POST /:id/events`는 클라이언트의 무응답 폴링(`notification_sent` tick)이 사용자의 삭제 요청과 경합할 수 있다는 이유로, 트랜잭션 진입 전에 먼저 `findUnique`로 존재를 확인하고 없으면 조용히 404를 반환한다(고아 `task_events` 방지). 이 라우트를 건드릴 일이 있으면 "이미 삭제된 taskId로 이벤트를 보내면 500이 아니라 404가 나오는지"를 회귀 테스트로 고정할 것.
   - 새로운 버그를 고칠 때마다 그 버그를 재현하는 케이스를 여기 목록에 추가하듯이 테스트로 남긴다. 커밋 메시지나 이슈 번호를 테스트 이름에 남겨두면(`it("#17: ...")`) 나중에 왜 이 케이스가 있는지 추적하기 쉽다.

## 4. 단위 테스트 예시 (`lib`)

```ts
// server/src/lib/scoring.test.ts
import { describe, it, expect } from "vitest";
import { calculateLevel } from "./scoring.js";

describe("calculateLevel", () => {
  it("무응답 횟수만큼 레벨이 오른다 (happy path)", () => {
    expect(calculateLevel(2)).toBe(2);
  });

  it("skipCount가 0이면 레벨 0 (경계)", () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it("레벨은 4를 넘지 않는다 (경계)", () => {
    expect(calculateLevel(99)).toBe(4);
  });
});
```

## 5. 통합 테스트(라우트) — 실제 Supabase 테스트 스키마를 쓸 때 지켜야 할 것

라우트 테스트는 목(mock)으로 Prisma를 대체하지 않는다 — 실제 트랜잭션(`prisma.$transaction`), 실제 404/500 분기, 실제 DB 제약(FK 등)까지 확인해야 의미가 있기 때문이다. 대신 아래 세 가지 안전장치 없이는 절대 실행하지 않는다. **개발/운영 Supabase 프로젝트에 테스트 데이터가 잘못 쓰이는 사고를 막기 위한 최소 장치이니 생략하지 말 것.**

### 5-1. DB 가드 — 테스트용 프로젝트가 아니면 즉시 실행 거부

`DATABASE_URL`이 테스트 전용 Supabase 프로젝트를 가리키는지 파일 상단(`beforeAll`)에서 확인하고, 아니면 에러를 던져 테스트 자체를 실패시킨다. 테스트용 프로젝트인지 판단하는 기준은 URL 안에 `test`라는 식별자가 있는지다(예: 테스트 전용 Supabase 프로젝트 이름에 `-test`를 붙여 `server/.env.test`의 `DATABASE_URL`에 반영). 새 프로젝트를 팔 때마다 실제 URL을 이 스킬에 하드코딩하지 말고, "환경변수 이름에 test 식별자가 있는지"만 코드로 확인한다.

```ts
// server/src/routes/tasks.test.ts (상단)
import { beforeAll } from "vitest";

beforeAll(() => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) {
    throw new Error(
      "DATABASE_URL이 테스트용 Supabase 프로젝트를 가리키지 않습니다. " +
      "개발/운영 DB에 테스트 데이터가 쓰이는 걸 막기 위해 실행을 중단합니다. " +
      "server/.env.test의 DATABASE_URL을 확인하세요."
    );
  }
});
```

### 5-2. 테스트 데이터에는 고유 prefix를 붙인다

테스트가 만드는 모든 `title`(또는 식별 가능한 필드)에 `"test_"` prefix를 붙인다. 실행마다 겹치지 않도록 타임스탬프/랜덤값을 더해 고유하게 만든다.

```ts
const TEST_PREFIX = "test_";
const uniqueTitle = () => `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
```

### 5-3. 끝나면 반드시 정리(teardown)한다

`afterEach`(또는 `afterAll`)에서 `TEST_PREFIX`로 시작하는 데이터만 지운다 — 다른 사람이 이 스키마에 넣어둔 실제 데이터를 건드리지 않도록 prefix로 좁혀서 삭제한다. 스키마(`server/prisma/schema.prisma`)의 관계 순서(`AvoidanceReason`/`TaskEvent` → `Task`)를 지켜서 지운다.

```ts
import { afterEach } from "vitest";
import { prisma } from "../db/client.js";

afterEach(async () => {
  const testTasks = await prisma.task.findMany({
    where: { title: { startsWith: TEST_PREFIX } },
  });
  const ids = testTasks.map((t) => t.id);
  if (ids.length === 0) return;

  await prisma.$transaction([
    prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
    prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
    prisma.task.deleteMany({ where: { id: { in: ids } } }),
  ]);
});
```

### 5-4. 통합 테스트 예시 (`routes/tasks.ts`, supertest)

```ts
// server/src/routes/tasks.test.ts
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../db/client.js";

const TEST_PREFIX = "test_";
const uniqueTitle = () => `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

beforeAll(() => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) {
    throw new Error("DATABASE_URL이 테스트용 Supabase 프로젝트가 아닙니다 — 실행을 중단합니다.");
  }
});

afterEach(async () => {
  const testTasks = await prisma.task.findMany({ where: { title: { startsWith: TEST_PREFIX } } });
  const ids = testTasks.map((t) => t.id);
  if (ids.length === 0) return;
  await prisma.$transaction([
    prisma.avoidanceReason.deleteMany({ where: { taskId: { in: ids } } }),
    prisma.taskEvent.deleteMany({ where: { taskId: { in: ids } } }),
    prisma.task.deleteMany({ where: { id: { in: ids } } }),
  ]);
});

describe("POST /api/tasks", () => {
  it("정상 입력이면 task와 회피이유가 함께 저장된다 (happy path)", async () => {
    const res = await request(app).post("/api/tasks").send({
      title: uniqueTitle(),
      type: "개인공부",
      startTime: new Date().toISOString(),
      deadline: new Date(Date.now() + 86400000).toISOString(),
      reason: "overwhelm",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("waiting");
  });
});

describe("POST /api/tasks/:id/events — #17 삭제-폴링 레이스 컨디션 회귀", () => {
  it("존재하지 않는 taskId로 이벤트를 보내면 500이 아니라 404를 반환한다", async () => {
    const res = await request(app)
      .post("/api/tasks/does-not-exist/events")
      .send({ eventType: "notification_sent" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
```

## 6. 응답 포맷 검증 체크리스트 (라우트 테스트 공통)

CLAUDE.md의 API 응답 규칙과 어긋나지 않는지 라우트 테스트에서 항상 같이 확인한다.

- 성공 응답: `res.body.data`에 리소스가 그대로 들어있는가 (`{ data: ... }` 래핑)
- 에러 응답: `res.body.error.code`, `res.body.error.message`가 있고 HTTP status가 적절한가(404/400/500)
- `avoidance-reasons` 재확인 라우트처럼 입력값 검증이 있는 라우트는 잘못된 `level`(1/3 외)이나 잘못된 `reason`(`VALID_REASONS` 외)을 보냈을 때 400 + 해당 `error.code`(`invalid_level`/`invalid_reason`)가 오는지도 경계 케이스로 챙긴다.
