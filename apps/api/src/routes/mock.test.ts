import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { resetMockQueueStore } from "../mock/queueStore.js";
import { resetMockOnboardingStore } from "../mock/onboardingStore.js";

describe("mock queue API", () => {
  beforeEach(() => {
    resetMockQueueStore();
    resetMockOnboardingStore();
  });

  it("환자 원격 접수가 병원 통합 대기열에 반영된다", async () => {
    const app = createApp();
    const registration = await request(app)
      .post("/api/mock/patient/waiting")
      .send({
        inputMode: "categorized",
        patientCounts: { child: 1, youth: 0, adult: 1 },
      })
      .expect(201);

    expect(registration.body.waiting.entry.ticketNumber).toBe("17");

    const staffQueue = await request(app).get("/api/mock/staff/queue").expect(200);
    expect(staffQueue.body.entries).toContainEqual(
      expect.objectContaining({ id: "waiting-patient", source: "remote" }),
    );
  });

  it("병원에서 앞 순서를 종료하면 환자 순서와 입장 요청 상태가 갱신된다", async () => {
    const app = createApp();
    await request(app)
      .post("/api/mock/patient/waiting")
      .send({
        inputMode: "categorized",
        patientCounts: { child: 0, youth: 0, adult: 1 },
      })
      .expect(201);

    await request(app)
      .patch("/api/mock/staff/waitings/waiting-a013/status")
      .send({ status: "called" })
      .expect(200);

    const waiting = await request(app).get("/api/mock/patient/waiting").expect(200);
    expect(waiting.body.waiting.position).toBe(4);
    expect(waiting.body.waiting.entry.status).toBe("entry_requested");
  });

  it("총인원 방식은 검증된 totalCount를 patientCount로 변환한다", async () => {
    const app = createApp();
    const registration = await request(app)
      .post("/api/mock/patient/waiting")
      .send({ inputMode: "total_only", totalCount: 3 })
      .expect(201);

    expect(registration.body.waiting.entry).toEqual(
      expect.objectContaining({
        inputMode: "total_only",
        patientCount: 3,
        patientCounts: {},
      }),
    );
  });

  it("DB 저장값인 patientCount만 직접 전달하는 요청은 거절한다", async () => {
    const app = createApp();
    await request(app)
      .post("/api/mock/patient/waiting")
      .send({ inputMode: "total_only", patientCount: 3 })
      .expect(400);
  });

  it("현장 접수는 전화번호와 환자 구성을 함께 검증한다", async () => {
    const app = createApp();
    const registration = await request(app)
      .post("/api/mock/staff/waitings")
      .send({
        phoneNumber: "010-1234-5678",
        registration: { inputMode: "total_only", totalCount: 2 },
      })
      .expect(201);

    expect(registration.body.queue.entries).toContainEqual(
      expect.objectContaining({
        source: "onsite",
        inputMode: "total_only",
        patientCount: 2,
      }),
    );
    expect(registration.body.notification).toEqual(
      expect.objectContaining({
        recipientPhoneMasked: "010-****-5678",
        templateCode: "onsite_registered",
      }),
    );
  });

  it("현장 접수의 전화번호 형식이 잘못되면 거절한다", async () => {
    const app = createApp();
    await request(app)
      .post("/api/mock/staff/waitings")
      .send({
        phoneNumber: "02-1234-5678",
        registration: { inputMode: "total_only", totalCount: 1 },
      })
      .expect(400);
  });

  it("현장 접수 알림 링크로 상태를 조회하고 종료 즉시 무효화한다", async () => {
    const app = createApp();
    const registration = await request(app)
      .post("/api/mock/staff/waitings")
      .send({
        phoneNumber: "010-1234-5678",
        registration: { inputMode: "total_only", totalCount: 1 },
      })
      .expect(201);

    const openPath = registration.body.notification.openPath as string;
    const redirect = await request(app).get(openPath).expect(302);
    const statusPath = new URL(redirect.headers.location as string).pathname.replace(
      "/onsite-status/",
      "/api/mock/onsite-status/",
    );
    const status = await request(app).get(statusPath).expect(200);
    expect(status.body).toEqual(
      expect.objectContaining({
        hospital: expect.objectContaining({ name: "서울이비인후과" }),
        waiting: expect.objectContaining({
          entry: expect.objectContaining({ source: "onsite", ticketNumber: "18" }),
        }),
      }),
    );

    await request(app)
      .patch("/api/mock/staff/waitings/onsite-new-18/status")
      .send({ status: "called" })
      .expect(200);

    await request(app).get(openPath).expect(410);
    await request(app).get(statusPath).expect(410);
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
      .send({
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
      })
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
    const app = createApp();
    await request(app)
      .post("/api/mock/hospital-applications")
      .send({
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
      })
      .expect(403);
  });
});
