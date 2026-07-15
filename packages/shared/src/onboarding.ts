import { z } from "zod";

export const hospitalInquiryStatuses = [
  "submitted",
  "accepted",
  "rejected",
  "cancelled",
] as const;
export const hospitalInquiryStatusSchema = z.enum(hospitalInquiryStatuses);
export type HospitalInquiryStatus = z.infer<typeof hospitalInquiryStatusSchema>;

export const hospitalApplicationStatuses = ["pending", "approved", "rejected"] as const;
export const hospitalApplicationStatusSchema = z.enum(hospitalApplicationStatuses);
export type HospitalApplicationStatus = z.infer<typeof hospitalApplicationStatusSchema>;

export const hospitalMemberRoles = ["owner", "staff", "viewer"] as const;
export const hospitalMemberRoleSchema = z.enum(hospitalMemberRoles);
export type HospitalMemberRole = z.infer<typeof hospitalMemberRoleSchema>;

export const hospitalMemberStatuses = ["active", "inactive"] as const;
export const hospitalMemberStatusSchema = z.enum(hospitalMemberStatuses);
export type HospitalMemberStatus = z.infer<typeof hospitalMemberStatusSchema>;

export const hospitalVerificationProviders = ["mock", "nts", "hira", "manual"] as const;
export const hospitalVerificationProviderSchema = z.enum(hospitalVerificationProviders);
export type HospitalVerificationProvider = z.infer<typeof hospitalVerificationProviderSchema>;

export const hospitalDocumentTypes = [
  "business_certificate",
  "medical_opening_certificate",
] as const;
export const hospitalDocumentTypeSchema = z.enum(hospitalDocumentTypes);
export type HospitalDocumentType = z.infer<typeof hospitalDocumentTypeSchema>;

export const hospitalDocumentScanStatuses = ["pending", "safe", "rejected", "mock_safe"] as const;
export const hospitalDocumentScanStatusSchema = z.enum(hospitalDocumentScanStatuses);
export type HospitalDocumentScanStatus = z.infer<typeof hospitalDocumentScanStatusSchema>;

export interface MockHospitalInquiryInput {
  hospitalName: string;
  primaryDepartment: string;
  phoneNumber: string;
  regionSido: string;
  regionSigungu: string;
  address: string;
}

export interface MockHospitalInquiry extends MockHospitalInquiryInput {
  id: string;
  status: HospitalInquiryStatus;
  submittedAt: string;
  reviewedAt?: string;
}

export interface MockDocumentMetadata {
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
}

export interface MockHospitalApplicationInput {
  operatingHoursText: string;
  businessRegistrationNumber: string;
  representativeName: string;
  businessOpenDate: string;
  careInstitutionCode: string;
  businessCertificate: MockDocumentMetadata;
  medicalOpeningCertificate: MockDocumentMetadata;
}

export interface MockHospitalApplication extends MockHospitalApplicationInput {
  id: string;
  status: HospitalApplicationStatus;
  verificationProvider: "mock";
  submittedAt: string;
}

export interface MockHospitalOnboardingState {
  inquiry: MockHospitalInquiry | null;
  application: MockHospitalApplication | null;
  canOperateQueue: boolean;
}
