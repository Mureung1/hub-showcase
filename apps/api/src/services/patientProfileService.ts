import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type { AccountType } from "@baro-jinryo/shared";
import type { Profile, ProfileRepository } from "../repositories/profileRepository.js";

export class PatientProfileService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly profileRepository: ProfileRepository,
  ) {}

  async getProfile(accountId: string): Promise<Profile | null> {
    return this.transactionManager.run((executor) =>
      this.profileRepository.findById(executor, accountId),
    );
  }

  async ensureProfile(
    accountId: string,
    phoneNumber: string,
    accountType: Extract<AccountType, "patient" | "hospital_admin">,
  ): Promise<Profile> {
    return this.transactionManager.run(async (executor) => {
      const existing = await this.profileRepository.findById(executor, accountId);
      if (existing) {
        if (existing.accountType !== accountType) {
          throw new ApiError(409, "ACCOUNT_TYPE_CONFLICT", "이미 다른 유형으로 등록된 계정입니다.");
        }
        return existing;
      }
      const phoneOwner = await this.profileRepository.findByPhoneNumber(executor, phoneNumber);
      if (phoneOwner) throw new ApiError(409, "PHONE_NUMBER_ALREADY_USED", "이미 등록된 전화번호입니다.");
      return this.profileRepository.create(executor, { id: accountId, phoneNumber, accountType });
    });
  }
}
