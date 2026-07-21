import type {
  OnsiteRegistrationResult,
  OnsiteWaitingRegistrationInput,
  StaffQueueState,
} from "@baro-jinryo/shared";
import express from "express";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/errorHandler.js";
import type { StaffQueueOperations } from "../services/staffQueueService.js";
import { createStaffRouter } from "./staff.js";

const queue: StaffQueueState = {
  entries: [],
  positions: [],
  queueDate: "2026-07-16",
  queueStatus: "open",
  todayInputMode: "total_only",
  nextDayInputMode: "total_only",
  todayCategories: [],
  nextDayCategories: [],
};

function createService(
  overrides: Partial<StaffQueueOperations> = {},
): StaffQueueOperations {
  return {
    getTodayQueue: vi.fn(async () => queue),
    saveNextDayConfiguration: vi.fn(async () => queue),
    registerOnsite: vi.fn(),
    setQueueStatus: vi.fn(async () => queue),
    changeWaitingStatus: vi.fn(async () => queue),
    holdWaiting: vi.fn(async () => queue),
    restoreWaiting: vi.fn(async () => queue),
    reorderWaitings: vi.fn(async () => queue),
    ...overrides,
  };
}

function createTestApp(service: StaffQueueOperations) {
  const app = express();
  app.use(express.json());
  const injectStaffContext: RequestHandler = (_request, response, next) => {
    response.locals.staffContext = {
      accountId: "20000000-0000-4000-8000-000000000001",
      hospitalId: "10000000-0000-4000-8000-000000000001",
      developmentBypass: false,
    };
    next();
  };
  app.use("/api/staff", createStaffRouter(service, injectStaffContext));
  app.use(errorHandler);
  return app;
}

describe("staff queue routes", () => {
  it("saves the next-day patient input configuration", async () => {
    const saveNextDayConfiguration = vi.fn(async () => queue);
    await request(createTestApp(createService({ saveNextDayConfiguration })))
      .put("/api/staff/categories/next-day")
      .send({ inputMode: "total_only", categories: [] })
      .expect(200);

    expect(saveNextDayConfiguration).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      { inputMode: "total_only", categories: [] },
    );
  });

  it("오늘 대기열을 조회한다", async () => {
    const service = createService();

    const response = await request(createTestApp(service))
      .get("/api/staff/queue")
      .expect(200);

    expect(response.body).toEqual(queue);
  });

  it("국내 전화번호를 E.164로 변환해 현장 접수 서비스에 전달한다", async () => {
    const result: OnsiteRegistrationResult = {
      queue,
      notification: {
        id: "17185fca-7a06-460a-a76a-c9d35ee98d95",
        recipientPhoneMasked: "8210-****-5678",
        templateCode: "onsite_registered",
        openPath: "http://127.0.0.1:5173/onsite-status/token",
      },
    };
    const registerOnsite = vi.fn(
      async (_hospitalId: string, _input: OnsiteWaitingRegistrationInput) => result,
    );
    const service = createService({ registerOnsite });

    await request(createTestApp(service))
      .post("/api/staff/waitings")
      .send({
        phoneNumber: "010-1234-5678",
        registration: { inputMode: "total_only", totalCount: 2 },
      })
      .expect(201);

    expect(registerOnsite).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      {
        phoneNumber: "+821012345678",
        registration: { inputMode: "total_only", totalCount: 2 },
      },
    );
  });

  it("잘못된 전화번호와 DB patientCount 직접 입력을 거절한다", async () => {
    const registerOnsite = vi.fn();
    const service = createService({ registerOnsite });

    const response = await request(createTestApp(service))
      .post("/api/staff/waitings")
      .send({
        phoneNumber: "02-1234-5678",
        registration: { inputMode: "total_only", patientCount: 2 },
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(registerOnsite).not.toHaveBeenCalled();
  });

  it("대기열 운영 상태를 변경한다", async () => {
    const setQueueStatus = vi.fn(async () => queue);
    await request(createTestApp(createService({ setQueueStatus })))
      .patch("/api/staff/queue/status")
      .send({ status: "paused" })
      .expect(200);
    expect(setQueueStatus).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      "paused",
    );
  });

  it("직원 호출 상태 변경에 병원과 직원 컨텍스트를 전달한다", async () => {
    const changeWaitingStatus = vi.fn(async () => queue);
    await request(createTestApp(createService({ changeWaitingStatus })))
      .patch("/api/staff/waitings/30000000-0000-4000-8000-000000000001/status")
      .send({ status: "called" })
      .expect(200);
    expect(changeWaitingStatus).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000001",
      "called",
      "20000000-0000-4000-8000-000000000001",
      undefined,
    );
  });

  it("직원 취소 사유가 없으면 요청을 거절한다", async () => {
    const changeWaitingStatus = vi.fn(async () => queue);
    await request(createTestApp(createService({ changeWaitingStatus })))
      .patch("/api/staff/waitings/30000000-0000-4000-8000-000000000001/status")
      .send({ status: "cancelled" })
      .expect(400);
    expect(changeWaitingStatus).not.toHaveBeenCalled();
  });

  it("보류 환자의 지정 복귀 위치를 서비스에 전달한다", async () => {
    const restoreWaiting = vi.fn(async () => queue);
    await request(createTestApp(createService({ restoreWaiting })))
      .post("/api/staff/waitings/30000000-0000-4000-8000-000000000001/restore")
      .send({ position: 2 })
      .expect(200);
    expect(restoreWaiting).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000001",
      2,
    );
  });

  it("활성 대기열 전체 순서 변경을 서비스에 전달한다", async () => {
    const reorderWaitings = vi.fn(async () => queue);
    const ids = [
      "30000000-0000-4000-8000-000000000002",
      "30000000-0000-4000-8000-000000000001",
    ];
    await request(createTestApp(createService({ reorderWaitings })))
      .put("/api/staff/waitings/order")
      .send({ orderedWaitingIds: ids })
      .expect(200);
    expect(reorderWaitings).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001",
      ids,
      "20000000-0000-4000-8000-000000000001",
    );
  });
});
