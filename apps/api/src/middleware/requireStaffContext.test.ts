import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AuthVerifier } from "../auth/authVerifier.js";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import type { HospitalAccessRepository } from "../repositories/hospitalAccessRepository.js";
import { errorHandler } from "./errorHandler.js";
import { createRequireStaffContext, getStaffContext } from "./requireStaffContext.js";

const hospitalId = "10000000-0000-4000-8000-000000000001";
const accountId = "20000000-0000-4000-8000-000000000001";
const executor = { query: vi.fn() } as unknown as DatabaseExecutor;
const transactionManager: TransactionManager = {
  run: async (work) => work(executor),
};

function createTestApp(
  verifier: AuthVerifier,
  repository: HospitalAccessRepository,
  allowDevelopmentBypass = false,
) {
  const app = express();
  app.use(
    createRequireStaffContext(verifier, transactionManager, repository, {
      allowDevelopmentBypass,
      developmentHospitalId: hospitalId,
    }),
  );
  app.get("/staff", (_request, response) => response.json(getStaffContext(response.locals)));
  app.use(errorHandler);
  return app;
}

describe("requireStaffContext", () => {
  const noAccess: HospitalAccessRepository = {
    findActiveByAccountId: vi.fn(async () => null),
  };

  it("인증 정보가 없으면 401을 반환한다", async () => {
    const verifier = { verify: vi.fn(async () => null) };
    await request(createTestApp(verifier, noAccess)).get("/staff").expect(401);
  });

  it("유효하지 않은 Bearer 토큰을 거절한다", async () => {
    const verifier = { verify: vi.fn(async () => null) };
    await request(createTestApp(verifier, noAccess))
      .get("/staff")
      .set("Authorization", "Bearer invalid")
      .expect(401);
  });

  it("활성 병원 소속이 없는 계정을 403으로 거절한다", async () => {
    const verifier = { verify: vi.fn(async () => ({ id: accountId })) };
    await request(createTestApp(verifier, noAccess))
      .get("/staff")
      .set("Authorization", "Bearer valid")
      .expect(403);
  });

  it("이메일 미확인 계정의 직원 API 접근을 차단한다", async () => {
    const verifier = {
      verify: vi.fn(async () => ({ id: accountId, emailConfirmed: false })),
    };
    const response = await request(createTestApp(verifier, noAccess))
      .get("/staff")
      .set("Authorization", "Bearer unconfirmed")
      .expect(403);
    expect(response.body.error.code).toBe("EMAIL_NOT_CONFIRMED");
  });

  it("인증된 직원에게 소속 병원 컨텍스트를 제공한다", async () => {
    const verifier = { verify: vi.fn(async () => ({ id: accountId })) };
    const repository: HospitalAccessRepository = {
      findActiveByAccountId: vi.fn(async () => ({ accountId, hospitalId })),
    };
    const response = await request(createTestApp(verifier, repository))
      .get("/staff")
      .set("Authorization", "Bearer valid")
      .expect(200);
    expect(response.body).toMatchObject({ accountId, hospitalId, developmentBypass: false });
  });

  it("명시적으로 허용한 개발 환경에서만 고정 병원 컨텍스트를 사용한다", async () => {
    const verifier = { verify: vi.fn(async () => null) };
    const response = await request(createTestApp(verifier, noAccess, true))
      .get("/staff")
      .expect(200);
    expect(response.body).toMatchObject({
      accountId: null,
      hospitalId,
      developmentBypass: true,
    });
  });
});
