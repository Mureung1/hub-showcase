import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface ActiveHospitalAccess {
  accountId: string;
  hospitalId: string;
}

export interface HospitalAccessRepository {
  findActiveByAccountId(
    executor: DatabaseExecutor,
    accountId: string,
  ): Promise<ActiveHospitalAccess | null>;
}
