import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetMockOnboardingStore } from "../mock/onboardingStore.js";

const applicationInput = {
  operatingHoursText: "평일 09:00-18:00",
  businessRegistrationNumber: "123-45-67890",
  representativeName: "김대표",
  businessOpenDate: "2020-01-02",
  careInstitutionCode: "HIRA-12345",
  businessCertificate: {
    name: "business.png",
    mimeType: "image/png",
    size: 1024,
  },
  medicalOpeningCertificate: {
    name: "medical.jpg",
    mimeType: "image/jpeg",
    size: 2048,
  },
};

describe("mock hospital onboarding API", () => {
  beforeEach(() => {
    resetMockOnboardingStore();
  });

  it("간단 입점 문의 수락 후 상세 신청을 mock 승인한다", async () => {
    const app = createApp();
    const inquiryState = await request(app)
      .post("/api/mock/hospital-inquiries")
      .send({
        hospitalName: "서울이비인후과",
        primaryDepartment: "이비인후과",
        phoneNumber: "02-1234-5678",
        regionSido: "서울특별시",
        regionSigungu: "마포구",
        address: "서울 마포구 월드컵로 12, 2층",
      })
      .expect(201);
    expect(inquiryState.body.inquiry.status).toBe("submitted");

    const inquiryId = inquiryState.body.inquiry.id as string;
    await request(app)
      .patch(`/api/mock/platform/hospital-inquiries/${inquiryId}`)
      .send({ status: "accepted" })
      .expect(200);

    const applicationState = await request(app)
      .post("/api/mock/hospital-applications")
      .send(applicationInput)
      .expect(201);

    expect(applicationState.body).toEqual(
      expect.objectContaining({
        canOperateQueue: true,
        application: expect.objectContaining({
          status: "approved",
          verificationProvider: "mock",
        }),
      }),
    );
  });

  it("수락 전 상세 입점 신청은 거절한다", async () => {
    await request(createApp())
      .post("/api/mock/hospital-applications")
      .send(applicationInput)
      .expect(403);
  });
});
