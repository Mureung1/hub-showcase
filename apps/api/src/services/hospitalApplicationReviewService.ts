import type { TransactionManager } from "../db/transactionManager.js";
import type { HospitalApplicationRepository } from "../repositories/hospitalApplicationRepository.js";
import type { HospitalRepository } from "../repositories/hospitalRepository.js";

export class HospitalApplicationNotReviewableError extends Error {
  constructor() {
    super("검토할 수 있는 상세 신청이 아닙니다.");
    this.name = "HospitalApplicationNotReviewableError";
  }
}

export class HospitalApplicationReviewService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly applicationRepository: HospitalApplicationRepository,
    private readonly hospitalRepository: HospitalRepository,
  ) {}

  async review(
    applicationId: string,
    status: "approved" | "rejected",
    reviewerAccountId: string,
  ) {
    return this.transactionManager.run(async (executor) => {
      const application = await this.applicationRepository.findById(executor, applicationId);
      if (!application || application.status !== "pending") {
        throw new HospitalApplicationNotReviewableError();
      }

      const reviewedApplication = await this.applicationRepository.review(
        executor,
        application.id,
        status,
        reviewerAccountId,
      );
      if (!reviewedApplication) throw new HospitalApplicationNotReviewableError();

      const hospital = await this.hospitalRepository.setApprovalStatus(
        executor,
        application.hospitalId,
        status,
      );
      if (!hospital) throw new HospitalApplicationNotReviewableError();

      return { application: reviewedApplication, hospital };
    });
  }
}
