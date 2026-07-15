import type { AccountStatus, AccountType } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface Profile {
  id: string;
  phoneNumber: string;
  accountType: AccountType;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  id: string;
  phoneNumber: string;
  accountType: AccountType;
}

export interface ProfileRepository {
  findById(executor: DatabaseExecutor, id: string): Promise<Profile | null>;
  findByPhoneNumber(executor: DatabaseExecutor, phoneNumber: string): Promise<Profile | null>;
  create(executor: DatabaseExecutor, input: CreateProfileInput): Promise<Profile>;
}
