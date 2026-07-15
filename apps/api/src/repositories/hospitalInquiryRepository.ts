import type { HospitalInquiryStatus } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface HospitalInquiry {
  id: string;
  applicantAccountId: string;
  hospitalId: string | null;
  hospitalName: string;
  primaryDepartment: string;
  phoneNumber: string;
  regionSido: string;
  regionSigungu: string;
  address: string;
  status: HospitalInquiryStatus;
  reviewedBy: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface CreateHospitalInquiryInput {
  applicantAccountId: string;
  hospitalName: string;
  primaryDepartment: string;
  phoneNumber: string;
  regionSido: string;
  regionSigungu: string;
  address: string;
}

export interface HospitalInquiryRepository {
  findById(executor: DatabaseExecutor, id: string): Promise<HospitalInquiry | null>;
  findCurrentByApplicant(
    executor: DatabaseExecutor,
    applicantAccountId: string,
  ): Promise<HospitalInquiry | null>;
  listSubmitted(executor: DatabaseExecutor): Promise<HospitalInquiry[]>;
  create(
    executor: DatabaseExecutor,
    input: CreateHospitalInquiryInput,
  ): Promise<HospitalInquiry>;
  accept(
    executor: DatabaseExecutor,
    inquiryId: string,
    hospitalId: string,
    reviewerAccountId: string,
  ): Promise<HospitalInquiry | null>;
  reject(
    executor: DatabaseExecutor,
    inquiryId: string,
    reviewerAccountId: string,
  ): Promise<HospitalInquiry | null>;
}
