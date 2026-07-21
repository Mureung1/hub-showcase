import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface WaitingExpirationCandidate {
  waitingEntryId: string;
  hospitalName: string;
}

export interface WaitingExpirationRepository {
  tryAcquireJobLock(executor: DatabaseExecutor): Promise<boolean>;
  listExpired(executor: DatabaseExecutor, now: Date): Promise<WaitingExpirationCandidate[]>;
  listTurnReached(executor: DatabaseExecutor, now: Date): Promise<WaitingExpirationCandidate[]>;
}
