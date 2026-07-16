import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AuthVerifier } from "../auth/authVerifier.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { errorHandler } from "./errorHandler.js";
import { createRequirePatientContext, getPatientContext } from "./requirePatientContext.js";

const accountId = "20000000-0000-4000-8000-000000000001";
const transactionManager: TransactionManager = {
  run: async (work) => work({ query: vi.fn() }),
};

function createApp(authVerifier: AuthVerifier, profile: Record<string, unknown> | null) {
  const app = express();
  app.use(createRequirePatientContext(authVerifier, transactionManager, {
    findById: vi.fn(async () => profile),
    findByPhoneNumber: vi.fn(),
    create: vi.fn(),
  } as never));
  app.get("/", (_request, response) => response.json(getPatientContext(response.locals)));
  app.use(errorHandler);
  return app;
}

describe("requirePatientContext", () => {
  it("Bearer 토큰이 없으면 차단한다", async () => {
    const response = await request(createApp({ verify: vi.fn() }, null)).get("/").expect(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("활성 환자 프로필만 통과시킨다", async () => {
    const authVerifier = { verify: vi.fn(async () => ({ id: accountId })) };
    const response = await request(createApp(authVerifier, {
      id: accountId,
      phoneNumber: "+821012345678",
      accountType: "patient",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })).get("/").set("Authorization", "Bearer valid").expect(200);
    expect(response.body).toEqual({ accountId });
  });

  it("병원 관리자 프로필을 환자 API에서 차단한다", async () => {
    const response = await request(createApp(
      { verify: vi.fn(async () => ({ id: accountId })) },
      { accountType: "hospital_admin", status: "active" },
    )).get("/").set("Authorization", "Bearer valid").expect(403);
    expect(response.body.error.code).toBe("PATIENT_ACCESS_DENIED");
  });

  it("이메일 미확인 계정의 환자 API 접근을 차단한다", async () => {
    const response = await request(createApp(
      { verify: vi.fn(async () => ({ id: accountId, emailConfirmed: false })) },
      null,
    )).get("/").set("Authorization", "Bearer unconfirmed").expect(403);
    expect(response.body.error.code).toBe("EMAIL_NOT_CONFIRMED");
  });
});
