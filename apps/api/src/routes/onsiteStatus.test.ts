import type { OnsiteWaitingStatus } from "@baro-jinryo/shared";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/errorHandler.js";
import type { OnsiteStatusOperations } from "../services/onsiteStatusService.js";
import { createOnsiteStatusRouter } from "./onsiteStatus.js";

const status = {
  hospital: {
    name: "테스트이비인후과",
    specialty: "이비인후과",
    address: "서울특별시 테스트구",
    phoneNumber: "+82200000000",
  },
  waiting: {
    entry: {
      id: "30000000-0000-4000-8000-000000000001",
      ticketNumber: "1",
      source: "onsite",
      inputMode: "total_only",
      patientCounts: {},
      patientCount: 2,
      categorySnapshot: [],
      status: "onsite_waiting",
      registeredAt: "2026-07-16T00:00:00.000Z",
      deferred: false,
    },
    teamNumber: 1,
    position: 1,
    positionEnd: 2,
    estimatedMinutes: 0,
  },
} satisfies OnsiteWaitingStatus;

function createTestApp(service: OnsiteStatusOperations) {
  const app = express();
  app.use("/api/waitings/status", createOnsiteStatusRouter(service));
  app.use(errorHandler);
  return app;
}

describe("onsite status route", () => {
  it("유효한 토큰의 현장 대기 상태를 반환한다", async () => {
    const service = { getByLookupToken: vi.fn(async () => status) };
    const response = await request(createTestApp(service))
      .get(`/api/waitings/status/${"a".repeat(43)}`)
      .expect(200);
    expect(response.body).toEqual(status);
  });

  it("종료되었거나 존재하지 않는 토큰의 내용을 노출하지 않는다", async () => {
    const service = { getByLookupToken: vi.fn(async () => null) };
    const response = await request(createTestApp(service))
      .get(`/api/waitings/status/${"b".repeat(43)}`)
      .expect(404);
    expect(response.body.error.code).toBe("STATUS_LINK_INVALID");
  });
});
