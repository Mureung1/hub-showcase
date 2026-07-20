import { z } from "zod";
import { e164PhoneNumberSchema } from "./domain.js";

export const hospitalInformationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  primaryDepartment: z.string().trim().min(2).max(50),
  phoneNumber: e164PhoneNumberSchema,
  regionSido: z.string().trim().min(2).max(30),
  regionSigungu: z.string().trim().min(1).max(30),
  address: z.string().trim().min(5).max(300),
  operatingHoursText: z.string().trim().max(500),
});

export type HospitalInformation = z.infer<typeof hospitalInformationSchema>;

export const hospitalChangeRequestStatuses = ["pending", "approved", "rejected"] as const;
export const hospitalChangeRequestStatusSchema = z.enum(hospitalChangeRequestStatuses);
export type HospitalChangeRequestStatus = z.infer<typeof hospitalChangeRequestStatusSchema>;

export interface HospitalChangeRequestView {
  id: string;
  hospitalId: string;
  hospitalName: string;
  requestedBy: string;
  status: HospitalChangeRequestStatus;
  currentValues: HospitalInformation;
  proposedValues: HospitalInformation;
  reviewedBy: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface HospitalManagementState {
  hospital: HospitalInformation & { id: string };
  pendingChangeRequest: HospitalChangeRequestView | null;
}
