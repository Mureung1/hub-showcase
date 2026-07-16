import type { QueuePosition } from "@baro-jinryo/shared";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/errorHandler.js";
import type { PatientWaitingOperations } from "../services/patientWaitingService.js";
import { createPatientWaitingRouter } from "./patientWaiting.js";

const accountId = "20000000-0000-4000-8000-000000000001";
const hospitalId = "10000000-0000-4000-8000-000000000001";
const waiting: QueuePosition = {
  entry: {
    id: "30000000-0000-4000-8000-000000000001",
    ticketNumber: "1",
    source: "remote",
    inputMode: "total_only",
    patientCounts: {},
    patientCount: 2,
    categorySnapshot: [],
    status: "remote_waiting",
    registeredAt: "2026-07-16T00:00:00.000Z",
    deferred: false,
  },
  teamNumber: 1,
  position: 1,
  positionEnd: 2,
  estimatedMinutes: 0,
};

function createService(): PatientWaitingOperations {
  return {
    getHospitalConfig: vi.fn(async () => ({
      inputMode: "total_only" as const,
      categories: [],
      queueStatus: "open" as const,
    })),
    register: vi.fn(async () => waiting),
    getActive: vi.fn(async () => waiting),
    defer: vi.fn(async () => waiting),
    cancel: vi.fn(async () => waiting),
  };
}

function createTestApp(service: PatientWaitingOperations) {
  const app = express();
  app.use(express.json());
  const auth: RequestHandler = (_request, response, next) => {
    response.locals.patientContext = { accountId };
    next();
  };
  app.use("/api", createPatientWaitingRouter(service, auth));
  app.use(errorHandler);
  return app;
}

describe("patient waiting routes", () => {
  it("가족 인원 입력을 검증하고 환자 계정으로 원격 접수한다", async () => {
    const service = createService();
    await request(createTestApp(service))
      .post(`/api/hospitals/${hospitalId}/waitings`)
      .send({ inputMode: "total_only", totalCount: 2, patientCount: 9 })
      .expect(201);
    expect(service.register).toHaveBeenCalledWith(accountId, hospitalId, {
      inputMode: "total_only",
      totalCount: 2,
    });
  });

  it("0명과 10명 접수를 거절한다", async () => {
    const service = createService();
    await request(createTestApp(service))
      .post(`/api/hospitals/${hospitalId}/waitings`)
      .send({ inputMode: "total_only", totalCount: 0 })
      .expect(400);
    await request(createTestApp(service))
      .post(`/api/hospitals/${hospitalId}/waitings`)
      .send({ inputMode: "total_only", totalCount: 10 })
      .expect(400);
    expect(service.register).not.toHaveBeenCalled();
  });

  it("조회·미루기·취소를 현재 환자 계정에만 위임한다", async () => {
    const service = createService();
    await request(createTestApp(service)).get("/api/me/waiting").expect(200);
    await request(createTestApp(service)).post("/api/me/waiting/defer").expect(200);
    await request(createTestApp(service)).post("/api/me/waiting/cancel").expect(200);
    expect(service.getActive).toHaveBeenCalledWith(accountId);
    expect(service.defer).toHaveBeenCalledWith(accountId);
    expect(service.cancel).toHaveBeenCalledWith(accountId);
  });
});
