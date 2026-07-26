import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../db/client.js";

// test-writer Skill의 통합 테스트 안전장치: DB 가드 + prefix + teardown.
// 자세한 근거는 .claude/skills/test-writer/SKILL.md 5절 참고.
// PushSubscription엔 title 같은 필드가 없어 endpoint 자체에 prefix를 심어 식별한다.
const TEST_PREFIX = "https://test_push.example.com/";
const uniqueEndpoint = () =>
  `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const databaseUrl = process.env.DATABASE_URL ?? "";
const isTestDb = /test/i.test(databaseUrl);

if (databaseUrl && !isTestDb) {
  throw new Error(
    "DATABASE_URL이 테스트용 Supabase 프로젝트를 가리키지 않습니다. " +
      "개발/운영 DB에 테스트 데이터가 쓰이는 걸 막기 위해 실행을 중단합니다. " +
      "server/.env.test.example을 참고해 server/.env.test의 DATABASE_URL을 설정하세요.",
  );
}

if (!isTestDb) {
  console.warn(
    "[pushSubscriptions.test.ts] server/.env.test에 테스트용 DATABASE_URL이 없어 통합 테스트를 건너뜁니다.",
  );
}

describe.skipIf(!isTestDb)("POST /api/push-subscriptions", () => {
  afterEach(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { startsWith: TEST_PREFIX } },
    });
  });

  it("새 endpoint면 구독을 새로 생성한다 (happy path)", async () => {
    const endpoint = uniqueEndpoint();

    const res = await request(app).post("/api/push-subscriptions").send({
      endpoint,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.endpoint).toBe(endpoint);
    expect(res.body.data.p256dh).toBe("p256dh-value");
    expect(res.body.data.auth).toBe("auth-value");

    const rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
    expect(rows).toHaveLength(1);
  });

  it("같은 endpoint로 다시 요청하면 새 행을 만들지 않고 기존 값을 갱신한다 (happy path)", async () => {
    const endpoint = uniqueEndpoint();

    await request(app).post("/api/push-subscriptions").send({
      endpoint,
      keys: { p256dh: "old-p256dh", auth: "old-auth" },
    });

    const res = await request(app).post("/api/push-subscriptions").send({
      endpoint,
      keys: { p256dh: "new-p256dh", auth: "new-auth" },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.p256dh).toBe("new-p256dh");
    expect(res.body.data.auth).toBe("new-auth");

    const rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
    expect(rows).toHaveLength(1);
  });

  it("endpoint가 없으면 400 invalid_body를 반환한다 (경계)", async () => {
    const res = await request(app)
      .post("/api/push-subscriptions")
      .send({ keys: { p256dh: "p256dh-value", auth: "auth-value" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_body");
  });

  it("keys.p256dh가 없으면 400 invalid_body를 반환한다 (경계)", async () => {
    const res = await request(app)
      .post("/api/push-subscriptions")
      .send({ endpoint: uniqueEndpoint(), keys: { auth: "auth-value" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_body");
  });

  it("keys.auth가 없으면 400 invalid_body를 반환한다 (경계)", async () => {
    const res = await request(app)
      .post("/api/push-subscriptions")
      .send({ endpoint: uniqueEndpoint(), keys: { p256dh: "p256dh-value" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_body");
  });
});
