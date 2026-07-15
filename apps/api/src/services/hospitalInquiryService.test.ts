import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import type {
  CreateHospitalInput,
  Hospital,
  HospitalMember,
  HospitalRepository,
} from "../repositories/hospitalRepository.js";
import type {
  CreateHospitalInquiryInput,
  HospitalInquiry,
  HospitalInquiryRepository,
} from "../repositories/hospitalInquiryRepository.js";
import { HospitalInquiryService } from "./hospitalInquiryService.js";

class UnusedExecutor implements DatabaseExecutor {
  async query<Row extends QueryResultRow>(): Promise<QueryResult<Row>> {
    throw new Error("이 테스트에서는 SQL을 직접 실행하지 않습니다.");
  }
}

class InlineTransactionManager implements TransactionManager {
  readonly executor = new UnusedExecutor();

  async run<Result>(work: (executor: DatabaseExecutor) => Promise<Result>): Promise<Result> {
    return work(this.executor);
  }
}

const now = new Date("2026-07-15T09:00:00.000Z");
const inquiry: HospitalInquiry = {
  id: "45394cf8-30b6-45de-8fc8-c98387dab81c",
  applicantAccountId: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
  hospitalId: null,
  hospitalName: "바로이비인후과",
  primaryDepartment: "이비인후과",
  phoneNumber: "+82212345678",
  regionSido: "서울특별시",
  regionSigungu: "마포구",
  address: "서울특별시 마포구 테스트로 1",
  status: "submitted",
  reviewedBy: null,
  submittedAt: now,
  reviewedAt: null,
};
const hospital: Hospital = {
  id: "be0aa4da-8adc-4765-9622-e11ab406fc6d",
  name: inquiry.hospitalName,
  primaryDepartment: inquiry.primaryDepartment,
  phoneNumber: inquiry.phoneNumber,
  regionSido: inquiry.regionSido,
  regionSigungu: inquiry.regionSigungu,
  address: inquiry.address,
  latitude: null,
  longitude: null,
  operatingHoursText: "",
  approvalStatus: "pending",
  approvedAt: null,
  createdAt: now,
  updatedAt: now,
};
const membership: HospitalMember = {
  id: "b570ed49-cd62-4ab2-90cf-99a56cf6649e",
  hospitalId: hospital.id,
  accountId: inquiry.applicantAccountId,
  role: "owner",
  status: "active",
  createdAt: now,
};

class FakeHospitalRepository implements HospitalRepository {
  readonly create = vi.fn(
    async (_executor: DatabaseExecutor, _input: CreateHospitalInput) => hospital,
  );
  readonly createOwnerMembership = vi.fn(
    async (_executor: DatabaseExecutor, _hospitalId: string, _accountId: string) => membership,
  );

  async findById(): Promise<Hospital | null> {
    return hospital;
  }

  async setApprovalStatus(): Promise<Hospital | null> {
    return hospital;
  }
}

class FakeInquiryRepository implements HospitalInquiryRepository {
  readonly accept = vi.fn(
    async (
      _executor: DatabaseExecutor,
      _inquiryId: string,
      hospitalId: string,
      reviewerAccountId: string,
    ) => ({
      ...inquiry,
      hospitalId,
      reviewedBy: reviewerAccountId,
      reviewedAt: now,
      status: "accepted" as const,
    }),
  );

  async findById(): Promise<HospitalInquiry | null> {
    return inquiry;
  }

  async findCurrentByApplicant(): Promise<HospitalInquiry | null> {
    return inquiry;
  }

  async listSubmitted(): Promise<HospitalInquiry[]> {
    return [inquiry];
  }

  async create(
    _executor: DatabaseExecutor,
    _input: CreateHospitalInquiryInput,
  ): Promise<HospitalInquiry> {
    return inquiry;
  }

  async reject(): Promise<HospitalInquiry | null> {
    return { ...inquiry, status: "rejected", reviewedAt: now };
  }
}

describe("HospitalInquiryService", () => {
  it("문의 수락을 병원 생성, owner 소속, 문의 갱신 순으로 처리한다", async () => {
    const transactionManager = new InlineTransactionManager();
    const hospitalRepository = new FakeHospitalRepository();
    const inquiryRepository = new FakeInquiryRepository();
    const service = new HospitalInquiryService(
      transactionManager,
      hospitalRepository,
      inquiryRepository,
    );
    const reviewerId = "6a30b1d2-d0d0-4fc9-aea0-253af7fd085c";

    const result = await service.accept(inquiry.id, reviewerId);

    expect(result.hospital.id).toBe(hospital.id);
    expect(result.membership.role).toBe("owner");
    expect(result.inquiry.status).toBe("accepted");
    expect(hospitalRepository.create).toHaveBeenCalledWith(transactionManager.executor, {
      name: inquiry.hospitalName,
      primaryDepartment: inquiry.primaryDepartment,
      phoneNumber: inquiry.phoneNumber,
      regionSido: inquiry.regionSido,
      regionSigungu: inquiry.regionSigungu,
      address: inquiry.address,
    });
    expect(hospitalRepository.createOwnerMembership).toHaveBeenCalledWith(
      transactionManager.executor,
      hospital.id,
      inquiry.applicantAccountId,
    );
    expect(inquiryRepository.accept).toHaveBeenCalledWith(
      transactionManager.executor,
      inquiry.id,
      hospital.id,
      reviewerId,
    );
  });
});
