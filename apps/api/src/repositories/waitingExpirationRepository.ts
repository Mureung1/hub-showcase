import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface WaitingExpirationCandidate {
  waitingEntryId: string;
  queueId: string;
  hospitalName: string;
  averageMinutesPerPatient: number;
  preparationThreshold: number;
  entryThreshold: number;
}

export interface WaitingExpirationRepository {
  tryAcquireJobLock(executor: DatabaseExecutor): Promise<boolean>;
  listExpired(executor: DatabaseExecutor, now: Date): Promise<WaitingExpirationCandidate[]>;
  listTurnReached(executor: DatabaseExecutor, now: Date): Promise<WaitingExpirationCandidate[]>;
}
