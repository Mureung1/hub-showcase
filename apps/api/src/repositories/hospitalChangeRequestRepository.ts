import type { HospitalChangeRequestStatus, HospitalInformation } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface HospitalChangeRequest {
  id: string;
  hospitalId: string;
  hospitalName: string;
  requestedBy: string;
  status: HospitalChangeRequestStatus;
  currentValues: HospitalInformation;
  proposedValues: HospitalInformation;
  reviewedBy: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface HospitalChangeRequestRepository {
  findPendingByHospitalId(
    executor: DatabaseExecutor,
    hospitalId: string,
  ): Promise<HospitalChangeRequest | null>;
  list(executor: DatabaseExecutor): Promise<HospitalChangeRequest[]>;
  findByIdForUpdate(
    executor: DatabaseExecutor,
    id: string,
  ): Promise<HospitalChangeRequest | null>;
  create(
    executor: DatabaseExecutor,
    input: {
      hospitalId: string;
      requestedBy: string;
      currentValues: HospitalInformation;
      proposedValues: HospitalInformation;
    },
  ): Promise<HospitalChangeRequest>;
  review(
    executor: DatabaseExecutor,
    id: string,
    status: Extract<HospitalChangeRequestStatus, "approved" | "rejected">,
    reviewerId: string,
  ): Promise<HospitalChangeRequest | null>;
}
