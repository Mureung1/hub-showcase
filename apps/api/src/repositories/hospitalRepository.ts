import type {
  HospitalApprovalStatus,
  HospitalMemberRole,
  HospitalMemberStatus,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface Hospital {
  id: string;
  name: string;
  primaryDepartment: string;
  phoneNumber: string;
  regionSido: string;
  regionSigungu: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  operatingHoursText: string;
  approvalStatus: HospitalApprovalStatus;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHospitalInput {
  name: string;
  primaryDepartment: string;
  phoneNumber: string;
  regionSido: string;
  regionSigungu: string;
  address: string;
}

export interface UpdateHospitalInformationInput extends CreateHospitalInput {
  operatingHoursText: string;
}

export interface HospitalMember {
  id: string;
  hospitalId: string;
  accountId: string;
  role: HospitalMemberRole;
  status: HospitalMemberStatus;
  createdAt: Date;
}

export interface HospitalRepository {
  findById(executor: DatabaseExecutor, id: string): Promise<Hospital | null>;
  create(executor: DatabaseExecutor, input: CreateHospitalInput): Promise<Hospital>;
  createOwnerMembership(
    executor: DatabaseExecutor,
    hospitalId: string,
    accountId: string,
  ): Promise<HospitalMember>;
  setApprovalStatus(
    executor: DatabaseExecutor,
    hospitalId: string,
    status: Extract<HospitalApprovalStatus, "approved" | "rejected">,
  ): Promise<Hospital | null>;
  updateInformation(
    executor: DatabaseExecutor,
    hospitalId: string,
    input: UpdateHospitalInformationInput,
  ): Promise<Hospital | null>;
}
