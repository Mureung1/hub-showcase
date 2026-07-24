import { Router } from "express";
import { z } from "zod";
import {
  getMockHospitalOnboardingState,
  listMockHospitalInquiries,
  reviewMockHospitalInquiry,
  submitMockHospitalApplication,
  submitMockHospitalInquiry,
} from "../mock/onboardingStore.js";

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

export const onboardingMockRouter = Router();

onboardingMockRouter.get("/hospital-onboarding", (_request, response) => {
  response.json(getMockHospitalOnboardingState());
});

onboardingMockRouter.post("/hospital-inquiries", (request, response) => {
  const input = hospitalInquiryBodySchema.parse(request.body);
  response.status(201).json(submitMockHospitalInquiry(input));
});

onboardingMockRouter.get("/platform/hospital-inquiries", (_request, response) => {
  response.json(listMockHospitalInquiries());
});

onboardingMockRouter.patch("/platform/hospital-inquiries/:id", (request, response) => {
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

onboardingMockRouter.post("/hospital-applications", (request, response) => {
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
