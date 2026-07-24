import { liveHealthResponseSchema } from "@baro-jinryo/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("health endpoints", () => {
  it("GET /api/health/live는 API 프로세스 상태를 반환한다", async () => {
    const response = await request(createApp()).get("/api/health/live").expect(200);

    const body = liveHealthResponseSchema.parse(response.body);
    expect(body).toMatchObject({ ok: true, check: "live" });
  });
});
