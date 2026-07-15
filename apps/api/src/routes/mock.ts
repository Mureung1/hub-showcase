import {
  patientInputConfigurationSchema,
  patientRegistrationInputSchema,
  queueStatusSchema,
  waitingStatusSchema,
} from "@baro-jinryo/shared";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import {
  addOnsiteWaiting,
  cancelPatientWaiting,
  changeQueueStatus,
  changeWaitingStatus,
  deferPatientWaiting,
  getPatientConfig,
  getPatientWaiting,
  getMockNotificationLookupToken,
  getOnsiteWaitingStatus,
  getStaffQueueState,
  holdWaiting,
  registerRemoteWaiting,
  restoreWaiting,
  saveNextDayCategories,
} from "../mock/queueStore.js";
import {
  getMockHospitalOnboardingState,
  listMockHospitalInquiries,
  reviewMockHospitalInquiry,
  submitMockHospitalApplication,
  submitMockHospitalInquiry,
} from "../mock/onboardingStore.js";

const statusBodySchema = z.object({ status: waitingStatusSchema });
const queueStatusBodySchema = z.object({ status: queueStatusSchema });
const domesticPhoneNumberSchema = z
  .string()
  .trim()
  .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "국내 휴대전화 번호를 입력해 주세요.");
const onsiteWaitingBodySchema = z.object({
  phoneNumber: domesticPhoneNumberSchema,
  registration: patientRegistrationInputSchema,
});
const hospitalInquiryBodySchema = z.object({
  hospitalName: z.string().trim().min(2).max(100),
  primaryDepartment: z.string().trim().min(2).max(50),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/),
  regionSido: z.string().trim().min(2).max(30),
  regionSigungu: z.string().trim().min(1).max(30),
  address: z.string().trim().min(5).max(200),
});
const inquiryReviewBodySchema = z.object({ status: z.enum(["accepted", "rejected"]) });
const mockDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
});
const hospitalApplicationBodySchema = z.object({
  operatingHoursText: z.string().trim().min(3).max(200),
  businessRegistrationNumber: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{2}-?\d{5}$/),
  representativeName: z.string().trim().min(2).max(100),
  businessOpenDate: z.iso.date(),
  careInstitutionCode: z.string().trim().min(4).max(30),
  businessCertificate: mockDocumentSchema,
  medicalOpeningCertificate: mockDocumentSchema,
});

function toKoreanE164(phoneNumber: string): string {
  return `+82${phoneNumber.replace(/\D/g, "").slice(1)}`;
}

export const mockRouter = Router();

mockRouter.get("/patient/config", (_request, response) => {
  response.json(getPatientConfig());
});

mockRouter.get("/hospital-onboarding", (_request, response) => {
  response.json(getMockHospitalOnboardingState());
});

mockRouter.post("/hospital-inquiries", (request, response) => {
  const input = hospitalInquiryBodySchema.parse(request.body);
  response.status(201).json(submitMockHospitalInquiry(input));
});

mockRouter.get("/platform/hospital-inquiries", (_request, response) => {
  response.json(listMockHospitalInquiries());
});

mockRouter.patch("/platform/hospital-inquiries/:id", (request, response) => {
  const { status } = inquiryReviewBodySchema.parse(request.body);
  const inquiry = reviewMockHospitalInquiry(request.params.id ?? "", status);
  if (!inquiry) {
    response.status(409).json({
      error: { code: "INVALID_TRANSITION", message: "검토할 수 없는 문의 상태입니다." },
    });
    return;
  }
  response.json(inquiry);
});

mockRouter.post("/hospital-applications", (request, response) => {
  const input = hospitalApplicationBodySchema.parse(request.body);
  const state = submitMockHospitalApplication(input);
  if (!state) {
    response.status(403).json({
      error: { code: "FORBIDDEN", message: "수락된 입점 문의가 필요합니다." },
    });
    return;
  }
  response.status(201).json(state);
});

mockRouter.get("/patient/waiting", (_request, response) => {
  response.json({ waiting: getPatientWaiting() });
});

mockRouter.post("/patient/waiting", (request, response) => {
  const input = patientRegistrationInputSchema.parse(request.body);
  response.status(201).json({ waiting: registerRemoteWaiting(input) });
});

mockRouter.post("/patient/waiting/defer", (_request, response) => {
  response.json({ waiting: deferPatientWaiting() });
});

mockRouter.delete("/patient/waiting", (_request, response) => {
  response.json({ waiting: cancelPatientWaiting() });
});

mockRouter.get("/staff/queue", (_request, response) => {
  response.json(getStaffQueueState());
});

mockRouter.post("/staff/waitings", (request, response) => {
  const input = onsiteWaitingBodySchema.parse(request.body);
  response
    .status(201)
    .json(addOnsiteWaiting({ ...input, phoneNumber: toKoreanE164(input.phoneNumber) }));
});

mockRouter.get("/notifications/:notificationId/open", (request, response) => {
  const lookupToken = getMockNotificationLookupToken(request.params.notificationId ?? "");
  if (!lookupToken) {
    response.status(410).json({
      error: { code: "STATUS_LINK_INVALID", message: "종료되었거나 유효하지 않은 링크입니다." },
    });
    return;
  }
  response.redirect(
    302,
    `${env.PATIENT_WEB_ORIGIN}/onsite-status/${encodeURIComponent(lookupToken)}`,
  );
});

mockRouter.get("/onsite-status/:lookupToken", (request, response) => {
  const status = getOnsiteWaitingStatus(request.params.lookupToken ?? "");
  if (!status) {
    response.status(410).json({
      error: { code: "STATUS_LINK_INVALID", message: "종료되었거나 유효하지 않은 링크입니다." },
    });
    return;
  }
  response.json(status);
});

mockRouter.patch("/staff/waitings/:id/status", (request, response) => {
  const { status } = statusBodySchema.parse(request.body);
  response.json(changeWaitingStatus(request.params.id ?? "", status));
});

mockRouter.post("/staff/waitings/:id/hold", (request, response) => {
  response.json(holdWaiting(request.params.id ?? ""));
});

mockRouter.post("/staff/waitings/:id/restore", (request, response) => {
  response.json(restoreWaiting(request.params.id ?? ""));
});

mockRouter.patch("/staff/queue/status", (request, response) => {
  const { status } = queueStatusBodySchema.parse(request.body);
  response.json(changeQueueStatus(status));
});

mockRouter.put("/staff/categories/next-day", (request, response) => {
  const { inputMode, categories } = patientInputConfigurationSchema.parse(request.body);
  response.json(saveNextDayCategories(inputMode, categories));
});
