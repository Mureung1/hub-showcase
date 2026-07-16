import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { AuthVerifier } from "../auth/authVerifier.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { errorHandler } from "../middleware/errorHandler.js";
import type { Profile, ProfileRepository } from "../repositories/profileRepository.js";
import { PatientProfileService } from "../services/patientProfileService.js";
import { createPatientProfileRouter } from "./patientProfile.js";

const accountId = "20000000-0000-4000-8000-000000000001";
const profile: Profile = {
  id: accountId,
  phoneNumber: "+821012345678",
  accountType: "patient",
  status: "active",
  createdAt: new Date("2026-07-16T00:00:00.000Z"),
  updatedAt: new Date("2026-07-16T00:00:00.000Z"),
};

function createApp(
  storedProfile: Profile | null,
  options: { phoneOwner?: Profile | null; emailConfirmed?: boolean } = {},
) {
  const verifier: AuthVerifier = {
    verify: vi.fn(async () =>
      options.emailConfirmed === undefined
        ? { id: accountId }
        : { id: accountId, emailConfirmed: options.emailConfirmed },
    ),
  };
  const transactionManager: TransactionManager = {
    run: async (work) => work({ query: vi.fn() }),
  };
  const repository: ProfileRepository = {
    findById: vi.fn(async () => storedProfile),
    findByPhoneNumber: vi.fn(async () => options.phoneOwner ?? null),
    create: vi.fn(async (_executor, input) => ({ ...profile, accountType: input.accountType })),
  };
  const app = express();
  app.use(express.json());
  app.use("/api", createPatientProfileRouter(
    verifier,
    new PatientProfileService(transactionManager, repository),
  ));
  app.use(errorHandler);
  return { app, repository };
}

describe("patient profile routes", () => {
  it("GET /api/auth/me로 현재 프로필을 조회한다", async () => {
    const { app } = createApp(profile);
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid")
      .expect(200);
    expect(response.body.profile).toMatchObject({ id: accountId, accountType: "patient" });
  });

  it("다른 브라우저 로그인 후 POST /api/profiles로 프로필을 완성한다", async () => {
    const { app, repository } = createApp(null);
    await request(app)
      .post("/api/profiles")
      .set("Authorization", "Bearer valid")
      .send({ phoneNumber: "+821012345678", accountType: "patient" })
      .expect(201);
    expect(repository.create).toHaveBeenCalledWith(expect.anything(), {
      id: accountId,
      phoneNumber: "+821012345678",
      accountType: "patient",
    });
  });

  it("병원 관리자 회원가입 후 hospital_admin 프로필을 생성한다", async () => {
    const { app, repository } = createApp(null);
    await request(app)
      .post("/api/profiles")
      .set("Authorization", "Bearer valid")
      .send({ phoneNumber: "+821033334444", accountType: "hospital_admin" })
      .expect(201);
    expect(repository.create).toHaveBeenCalledWith(expect.anything(), {
      id: accountId,
      phoneNumber: "+821033334444",
      accountType: "hospital_admin",
    });
  });

  it("이미 다른 계정이 사용 중인 전화번호를 차단한다", async () => {
    const response = await request(createApp(null, { phoneOwner: profile }).app)
      .post("/api/profiles")
      .set("Authorization", "Bearer valid")
      .send({ phoneNumber: "+821012345678", accountType: "patient" })
      .expect(409);
    expect(response.body.error.code).toBe("PHONE_NUMBER_ALREADY_USED");
  });

  it("이메일 미확인 계정의 프로필 생성을 차단한다", async () => {
    const response = await request(createApp(null, { emailConfirmed: false }).app)
      .post("/api/profiles")
      .set("Authorization", "Bearer unconfirmed")
      .send({ phoneNumber: "+821012345678", accountType: "patient" })
      .expect(403);
    expect(response.body.error.code).toBe("EMAIL_NOT_CONFIRMED");
  });

  it("인증 토큰 없는 프로필 조회를 차단한다", async () => {
    const { app } = createApp(null);
    const response = await request(app).get("/api/auth/me").expect(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });
});
