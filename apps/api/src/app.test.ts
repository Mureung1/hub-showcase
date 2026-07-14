import { liveHealthResponseSchema, readyHealthResponseSchema } from "@baro-jinryo/shared";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { closeDatabasePool } from "./db/pool.js";

afterAll(async () => {
  await closeDatabasePool();
});

describe("health endpoints", () => {
  it("GET /api/health/live는 API 프로세스 상태를 반환한다", async () => {
    const response = await request(createApp()).get("/api/health/live").expect(200);

    const body = liveHealthResponseSchema.parse(response.body);
    expect(body).toMatchObject({ ok: true, check: "live" });
  });

  it("GET /api/health/ready는 실제 Supabase DB 연결을 확인한다", async () => {
    const response = await request(createApp()).get("/api/health/ready").expect(200);

    const body = readyHealthResponseSchema.parse(response.body);
    expect(body).toMatchObject({ ok: true, check: "ready", database: "up" });
    expect(body.databaseLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
