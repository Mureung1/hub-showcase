import type { HospitalInformation } from "@baro-jinryo/shared";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import type {
  HospitalChangeRequest,
  HospitalChangeRequestRepository,
} from "../repositories/hospitalChangeRequestRepository.js";
import type { Hospital, HospitalRepository } from "../repositories/hospitalRepository.js";
import { HospitalManagementService } from "./hospitalManagementService.js";

const executor = { query: vi.fn() } as unknown as DatabaseExecutor;
const transactionManager: TransactionManager = { run: async (work) => work(executor) };
const hospitalId = "10000000-0000-4000-8000-000000000001";
const accountId = "20000000-0000-4000-8000-000000000001";
const reviewerId = "20000000-0000-4000-8000-000000000002";
const now = new Date("2026-07-20T10:00:00.000Z");
const currentValues: HospitalInformation = {
  name: "서울이비인후과",
  primaryDepartment: "이비인후과",
  phoneNumber: "+82212345678",
  regionSido: "서울",
  regionSigungu: "마포구",
  address: "서울 마포구 월드컵로 12",
  operatingHoursText: "평일 09:00-18:00",
};
const proposedValues = { ...currentValues, operatingHoursText: "평일 09:00-19:00" };
const hospital: Hospital = {
  id: hospitalId,
  ...currentValues,
  latitude: null,
  longitude: null,
  approvalStatus: "approved",
  approvedAt: now,
  createdAt: now,
  updatedAt: now,
};
const pendingRequest: HospitalChangeRequest = {
  id: "30000000-0000-4000-8000-000000000001",
  hospitalId,
  hospitalName: hospital.name,
  requestedBy: accountId,
  status: "pending",
  currentValues,
  proposedValues,
  reviewedBy: null,
  submittedAt: now,
  reviewedAt: null,
};

function createDependencies() {
  const hospitalRepository = {
    findById: vi.fn(async () => hospital),
    create: vi.fn(),
    createOwnerMembership: vi.fn(),
    setApprovalStatus: vi.fn(),
    updateInformation: vi.fn(async () => ({ ...hospital, ...proposedValues })),
  } satisfies HospitalRepository;
  const changeRequestRepository = {
    findPendingByHospitalId: vi.fn(async () => null),
    list: vi.fn(async () => [pendingRequest]),
    findByIdForUpdate: vi.fn(async () => pendingRequest),
    create: vi.fn(async () => pendingRequest),
    review: vi.fn(async (_executor, _id, status: "approved" | "rejected") => ({
      ...pendingRequest,
      status,
      reviewedBy: reviewerId,
      reviewedAt: now,
    })),
  } satisfies HospitalChangeRequestRepository;
  return { hospitalRepository, changeRequestRepository };
}

describe("HospitalManagementService", () => {
  it("현재값 스냅샷과 제안값으로 변경 요청을 생성한다", async () => {
    const dependencies = createDependencies();
    const service = new HospitalManagementService(
      transactionManager,
      dependencies.hospitalRepository,
      dependencies.changeRequestRepository,
    );

    await service.requestChange(hospitalId, accountId, proposedValues);

    expect(dependencies.changeRequestRepository.create).toHaveBeenCalledWith(executor, {
      hospitalId,
      requestedBy: accountId,
      currentValues,
      proposedValues,
    });
  });

  it("승인하면 병원 정보를 먼저 반영하고 요청을 승인한다", async () => {
    const dependencies = createDependencies();
    const service = new HospitalManagementService(
      transactionManager,
      dependencies.hospitalRepository,
      dependencies.changeRequestRepository,
    );

    const result = await service.reviewChangeRequest(pendingRequest.id, "approved", reviewerId);

    expect(dependencies.hospitalRepository.updateInformation).toHaveBeenCalledWith(
      executor,
      hospitalId,
      proposedValues,
    );
    expect(dependencies.changeRequestRepository.review).toHaveBeenCalledWith(
      executor,
      pendingRequest.id,
      "approved",
      reviewerId,
    );
    expect(result.status).toBe("approved");
  });

  it("거절하면 실제 병원 정보는 변경하지 않는다", async () => {
    const dependencies = createDependencies();
    const service = new HospitalManagementService(
      transactionManager,
      dependencies.hospitalRepository,
      dependencies.changeRequestRepository,
    );

    await service.reviewChangeRequest(pendingRequest.id, "rejected", reviewerId);

    expect(dependencies.hospitalRepository.updateInformation).not.toHaveBeenCalled();
  });
});
