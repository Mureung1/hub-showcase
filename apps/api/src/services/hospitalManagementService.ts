import type { HospitalChangeRequestView, HospitalInformation } from "@baro-jinryo/shared";
import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type {
  HospitalChangeRequest,
  HospitalChangeRequestRepository,
} from "../repositories/hospitalChangeRequestRepository.js";
import type { Hospital, HospitalRepository } from "../repositories/hospitalRepository.js";

function toInformation(hospital: Hospital): HospitalInformation {
  return {
    name: hospital.name,
    primaryDepartment: hospital.primaryDepartment,
    phoneNumber: hospital.phoneNumber,
    regionSido: hospital.regionSido,
    regionSigungu: hospital.regionSigungu,
    address: hospital.address,
    operatingHoursText: hospital.operatingHoursText,
  };
}

function toView(request: HospitalChangeRequest): HospitalChangeRequestView {
  return {
    ...request,
    submittedAt: request.submittedAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
  };
}

export class HospitalManagementService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly hospitalRepository: HospitalRepository,
    private readonly changeRequestRepository: HospitalChangeRequestRepository,
  ) {}

  async getManagementState(hospitalId: string) {
    return this.transactionManager.run(async (executor) => {
      const hospital = await this.hospitalRepository.findById(executor, hospitalId);
      if (!hospital) throw new ApiError(404, "HOSPITAL_NOT_FOUND", "병원 정보를 찾을 수 없습니다.");
      const pending = await this.changeRequestRepository.findPendingByHospitalId(
        executor,
        hospitalId,
      );
      return {
        hospital: { id: hospital.id, ...toInformation(hospital) },
        pendingChangeRequest: pending ? toView(pending) : null,
      };
    });
  }

  async requestChange(
    hospitalId: string,
    accountId: string | null,
    proposedValues: HospitalInformation,
  ) {
    if (!accountId) {
      throw new ApiError(401, "AUTH_REQUIRED", "병원 정보 변경에는 로그인이 필요합니다.");
    }
    return this.transactionManager.run(async (executor) => {
      const hospital = await this.hospitalRepository.findById(executor, hospitalId);
      if (!hospital) throw new ApiError(404, "HOSPITAL_NOT_FOUND", "병원 정보를 찾을 수 없습니다.");
      const currentValues = toInformation(hospital);
      if (JSON.stringify(currentValues) === JSON.stringify(proposedValues)) {
        throw new ApiError(400, "HOSPITAL_INFORMATION_UNCHANGED", "변경된 병원 정보가 없습니다.");
      }
      const pending = await this.changeRequestRepository.findPendingByHospitalId(
        executor,
        hospitalId,
      );
      if (pending) {
        throw new ApiError(
          409,
          "HOSPITAL_CHANGE_ALREADY_PENDING",
          "검토 중인 병원 정보 변경 요청이 있습니다.",
        );
      }
      try {
        return toView(
          await this.changeRequestRepository.create(executor, {
            hospitalId,
            requestedBy: accountId,
            currentValues,
            proposedValues,
          }),
        );
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
          throw new ApiError(
            409,
            "HOSPITAL_CHANGE_ALREADY_PENDING",
            "검토 중인 병원 정보 변경 요청이 있습니다.",
          );
        }
        throw error;
      }
    });
  }

  async listChangeRequests() {
    return this.transactionManager.run(async (executor) =>
      (await this.changeRequestRepository.list(executor)).map(toView),
    );
  }

  async reviewChangeRequest(
    requestId: string,
    status: "approved" | "rejected",
    reviewerId: string,
  ) {
    return this.transactionManager.run(async (executor) => {
      const request = await this.changeRequestRepository.findByIdForUpdate(executor, requestId);
      if (!request || request.status !== "pending") {
        throw new ApiError(409, "HOSPITAL_CHANGE_NOT_REVIEWABLE", "이미 처리된 변경 요청입니다.");
      }
      if (status === "approved") {
        const hospital = await this.hospitalRepository.updateInformation(
          executor,
          request.hospitalId,
          request.proposedValues,
        );
        if (!hospital) {
          throw new ApiError(409, "HOSPITAL_CHANGE_NOT_REVIEWABLE", "승인된 병원만 변경할 수 있습니다.");
        }
      }
      const reviewed = await this.changeRequestRepository.review(
        executor,
        request.id,
        status,
        reviewerId,
      );
      if (!reviewed) {
        throw new ApiError(409, "HOSPITAL_CHANGE_NOT_REVIEWABLE", "이미 처리된 변경 요청입니다.");
      }
      return toView(reviewed);
    });
  }
}
