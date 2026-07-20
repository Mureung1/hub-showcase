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
      hospital: {
        id: hospitalId,
        name: "서울이비인후과",
        department: "이비인후과",
        district: "서울특별시 마포구",
        address: "서울특별시 마포구 월드컵로 12, 2층",
        operatingHoursText: "평일 09:00-18:00",
      },
      inputMode: "total_only" as const,
      categories: [],
      queueStatus: "open" as const,
      waitingPatients: 0,
      estimatedMinutes: 0,
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
  it("병원 상세와 오늘 대기 현황을 로그인 없이 조회한다", async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .get(`/api/hospitals/${hospitalId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      hospital: { id: hospitalId, name: "서울이비인후과" },
      queueStatus: "open",
      waitingPatients: 0,
      estimatedMinutes: 0,
    });
  });

  it("환자 라우트가 아닌 요청에는 환자 인증을 적용하지 않는다", async () => {
    const service = createService();
    const auth = vi.fn<RequestHandler>((_request, _response, next) => next());
    const app = express();
    app.use("/api", createPatientWaitingRouter(service, auth));
    app.get("/api/staff/queue", (_request, response) => response.json({ ok: true }));

    await request(app).get("/api/staff/queue").expect(200, { ok: true });
    expect(auth).not.toHaveBeenCalled();
  });

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
