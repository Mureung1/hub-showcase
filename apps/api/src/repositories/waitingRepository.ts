import type { WaitingSource, WaitingStatus } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface WaitingEntry {
  id: string;
  queueId: string;
  accountId: string | null;
  source: WaitingSource;
  phoneNumber: string;
  ticketNumber: string;
  status: WaitingStatus;
  queueOrder: number;
  patientCount: number;
  lookupTokenHash: string | null;
  patientDeferCount: number;
  noShowMoveCount: number;
  preparationNotifiedAt: Date | null;
  onsiteNearTurnNotifiedAt: Date | null;
  entryRequestedAt: Date | null;
  arrivalDeadlineAt: Date | null;
  calledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitingEntryCount {
  waitingEntryId: string;
  patientCategoryId: string;
  count: number;
}

export interface RegistrationSlot {
  ticketNumber: string;
  queueOrder: number;
}

export interface CreateWaitingEntryInput extends RegistrationSlot {
  queueId: string;
  accountId: string | null;
  source: WaitingSource;
  phoneNumber: string;
  status: Extract<WaitingStatus, "remote_waiting" | "onsite_waiting">;
  patientCount: number;
  lookupTokenHash: string | null;
}

export interface CreateWaitingEntryCountInput {
  patientCategoryId: string;
  count: number;
}

export interface NoShowMoveResult {
  waiting: WaitingEntry;
  previousQueueOrder: number;
}

export interface WaitingRepository {
  allocateRegistrationSlot(
    executor: DatabaseExecutor,
    queueId: string,
  ): Promise<RegistrationSlot>;
  findById(executor: DatabaseExecutor, id: string): Promise<WaitingEntry | null>;
  findActiveRemoteByAccount(
    executor: DatabaseExecutor,
    accountId: string,
  ): Promise<WaitingEntry | null>;
  listByQueue(executor: DatabaseExecutor, queueId: string): Promise<WaitingEntry[]>;
  sumActiveRemotePatients(executor: DatabaseExecutor, queueId: string): Promise<number>;
  create(executor: DatabaseExecutor, input: CreateWaitingEntryInput): Promise<WaitingEntry>;
  createCounts(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    counts: CreateWaitingEntryCountInput[],
  ): Promise<WaitingEntryCount[]>;
  markPreparationNotified(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    notifiedAt: Date,
  ): Promise<WaitingEntry | null>;
  requestEntry(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    requestedAt: Date,
    arrivalDeadlineAt: Date,
  ): Promise<WaitingEntry | null>;
  markOnsiteNearTurnNotified(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    notifiedAt: Date,
  ): Promise<WaitingEntry | null>;
  moveNoShowToEnd(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedUpdatedAt: Date,
  ): Promise<NoShowMoveResult | null>;
  cancelExpired(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedUpdatedAt: Date,
    cancelledAt: Date,
  ): Promise<WaitingEntry | null>;
}
