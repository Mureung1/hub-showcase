import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import type {
  HospitalApplication,
  HospitalApplicationRepository,
  HospitalDocument,
} from "../repositories/hospitalApplicationRepository.js";
import type { Hospital, HospitalMember, HospitalRepository } from "../repositories/hospitalRepository.js";
import { HospitalApplicationReviewService } from "./hospitalApplicationReviewService.js";

const now = new Date("2026-07-15T09:00:00.000Z");
const application: HospitalApplication = {
  id: "a996466d-01a8-4ae4-b7ed-51354fac21dd",
  hospitalId: "be0aa4da-8adc-4765-9622-e11ab406fc6d",
  applicantAccountId: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
  businessRegistrationNumber: "1234567890",
  careInstitutionCode: "CARE-001",
  representativeName: "홍길동",
  businessOpenDate: "2020-01-01",
  status: "pending",
  verificationProvider: "mock",
  verificationResult: { businessStatus: "mock_valid" },
  reviewedBy: null,
  submittedAt: now,
  reviewedAt: null,
};
const approvedHospital: Hospital = {
  id: application.hospitalId,
  name: "바로이비인후과",
  primaryDepartment: "이비인후과",
  phoneNumber: "+82212345678",
  regionSido: "서울특별시",
  regionSigungu: "마포구",
  address: "서울특별시 마포구 테스트로 1",
  latitude: null,
  longitude: null,
  operatingHoursText: "",
  approvalStatus: "approved",
  approvedAt: now,
  createdAt: now,
  updatedAt: now,
};

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

describe("HospitalApplicationReviewService", () => {
  it("신청 승인과 병원 승인을 같은 트랜잭션 실행자로 처리한다", async () => {
    const transactionManager = new InlineTransactionManager();
    const reviewedApplication = {
      ...application,
      status: "approved" as const,
      reviewedBy: "6a30b1d2-d0d0-4fc9-aea0-253af7fd085c",
      reviewedAt: now,
    };
    const applicationRepository = {
      findById: vi.fn(async () => application),
      findPendingByHospital: vi.fn(async () => application),
      listPending: vi.fn(async () => [application]),
      create: vi.fn(async () => application),
      createDocument: vi.fn(async () => ({}) as HospitalDocument),
      review: vi.fn(async () => reviewedApplication),
    } satisfies HospitalApplicationRepository;
    const hospitalRepository = {
      findById: vi.fn(async () => approvedHospital),
      create: vi.fn(async () => approvedHospital),
      createOwnerMembership: vi.fn(async () => ({}) as HospitalMember),
      setApprovalStatus: vi.fn(async () => approvedHospital),
      updateInformation: vi.fn(async () => approvedHospital),
    } satisfies HospitalRepository;
    const service = new HospitalApplicationReviewService(
      transactionManager,
      applicationRepository,
      hospitalRepository,
    );

    const result = await service.review(
      application.id,
      "approved",
      reviewedApplication.reviewedBy,
    );

    expect(result.application.status).toBe("approved");
    expect(result.hospital.approvalStatus).toBe("approved");
    expect(applicationRepository.review).toHaveBeenCalledWith(
      transactionManager.executor,
      application.id,
      "approved",
      reviewedApplication.reviewedBy,
    );
    expect(hospitalRepository.setApprovalStatus).toHaveBeenCalledWith(
      transactionManager.executor,
      application.hospitalId,
      "approved",
    );
  });
});
