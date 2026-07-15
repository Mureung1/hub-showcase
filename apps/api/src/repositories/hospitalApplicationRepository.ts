import type {
  HospitalApplicationStatus,
  HospitalDocumentScanStatus,
  HospitalDocumentType,
  HospitalVerificationProvider,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface HospitalApplication {
  id: string;
  hospitalId: string;
  applicantAccountId: string;
  businessRegistrationNumber: string;
  careInstitutionCode: string;
  representativeName: string;
  businessOpenDate: string;
  status: HospitalApplicationStatus;
  verificationProvider: HospitalVerificationProvider;
  verificationResult: Record<string, unknown>;
  reviewedBy: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface CreateHospitalApplicationInput {
  hospitalId: string;
  applicantAccountId: string;
  businessRegistrationNumber: string;
  careInstitutionCode: string;
  representativeName: string;
  businessOpenDate: string;
  verificationResult: Record<string, unknown>;
}

export interface HospitalDocument {
  id: string;
  applicationId: string;
  documentType: HospitalDocumentType;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  scanStatus: HospitalDocumentScanStatus;
  createdAt: Date;
}

export interface CreateHospitalDocumentInput {
  applicationId: string;
  documentType: HospitalDocumentType;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface HospitalApplicationRepository {
  findById(executor: DatabaseExecutor, id: string): Promise<HospitalApplication | null>;
  findPendingByHospital(
    executor: DatabaseExecutor,
    hospitalId: string,
  ): Promise<HospitalApplication | null>;
  listPending(executor: DatabaseExecutor): Promise<HospitalApplication[]>;
  create(
    executor: DatabaseExecutor,
    input: CreateHospitalApplicationInput,
  ): Promise<HospitalApplication>;
  createDocument(
    executor: DatabaseExecutor,
    input: CreateHospitalDocumentInput,
  ): Promise<HospitalDocument>;
  review(
    executor: DatabaseExecutor,
    applicationId: string,
    status: Extract<HospitalApplicationStatus, "approved" | "rejected">,
    reviewerAccountId: string,
  ): Promise<HospitalApplication | null>;
}
