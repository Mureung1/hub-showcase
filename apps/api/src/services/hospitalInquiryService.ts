import type { TransactionManager } from "../db/transactionManager.js";
import type { HospitalRepository } from "../repositories/hospitalRepository.js";
import type { HospitalInquiryRepository } from "../repositories/hospitalInquiryRepository.js";

export class HospitalInquiryNotReviewableError extends Error {
  constructor() {
    super("검토할 수 있는 입점 문의가 아닙니다.");
    this.name = "HospitalInquiryNotReviewableError";
  }
}

export class HospitalInquiryService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly hospitalRepository: HospitalRepository,
    private readonly inquiryRepository: HospitalInquiryRepository,
  ) {}

  async accept(inquiryId: string, reviewerAccountId: string) {
    return this.transactionManager.run(async (executor) => {
      const inquiry = await this.inquiryRepository.findById(executor, inquiryId);
      if (!inquiry || inquiry.status !== "submitted") {
        throw new HospitalInquiryNotReviewableError();
      }

      const hospital = await this.hospitalRepository.create(executor, {
        name: inquiry.hospitalName,
        primaryDepartment: inquiry.primaryDepartment,
        phoneNumber: inquiry.phoneNumber,
        regionSido: inquiry.regionSido,
        regionSigungu: inquiry.regionSigungu,
        address: inquiry.address,
      });
      const membership = await this.hospitalRepository.createOwnerMembership(
        executor,
        hospital.id,
        inquiry.applicantAccountId,
      );
      const acceptedInquiry = await this.inquiryRepository.accept(
        executor,
        inquiry.id,
        hospital.id,
        reviewerAccountId,
      );
      if (!acceptedInquiry) throw new HospitalInquiryNotReviewableError();

      return { inquiry: acceptedInquiry, hospital, membership };
    });
  }

  async reject(inquiryId: string, reviewerAccountId: string) {
    return this.transactionManager.run(async (executor) => {
      const rejectedInquiry = await this.inquiryRepository.reject(
        executor,
        inquiryId,
        reviewerAccountId,
      );
      if (!rejectedInquiry) throw new HospitalInquiryNotReviewableError();
      return rejectedInquiry;
    });
  }
}
