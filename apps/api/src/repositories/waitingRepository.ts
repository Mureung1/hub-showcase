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
  arrivedPatientCount: number;
  calledPatientCount: number;
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
  version: number;
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

export interface TransitionWaitingInput {
  waitingEntryId: string;
  expectedVersion: number;
  fromStatuses: WaitingStatus[];
  toStatus: WaitingStatus;
}

export interface WaitingRepository {
  allocateRegistrationSlot(
    executor: DatabaseExecutor,
    queueId: string,
  ): Promise<RegistrationSlot>;
  findById(executor: DatabaseExecutor, id: string): Promise<WaitingEntry | null>;
  findByLookupTokenHash(
    executor: DatabaseExecutor,
    lookupTokenHash: string,
  ): Promise<WaitingEntry | null>;
  findActiveRemoteByAccount(
    executor: DatabaseExecutor,
    accountId: string,
  ): Promise<WaitingEntry | null>;
  listByQueue(executor: DatabaseExecutor, queueId: string): Promise<WaitingEntry[]>;
  listCountsByQueue(
    executor: DatabaseExecutor,
    queueId: string,
  ): Promise<WaitingEntryCount[]>;
  sumActiveRemotePatients(executor: DatabaseExecutor, queueId: string): Promise<number>;
  create(executor: DatabaseExecutor, input: CreateWaitingEntryInput): Promise<WaitingEntry>;
  createCounts(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    counts: CreateWaitingEntryCountInput[],
  ): Promise<WaitingEntryCount[]>;
  transitionStatus(
    executor: DatabaseExecutor,
    input: TransitionWaitingInput,
  ): Promise<WaitingEntry | null>;
  advanceArrival(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
  ): Promise<WaitingEntry | null>;
  advanceCall(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
  ): Promise<WaitingEntry | null>;
  restoreHeldToEnd(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
    restoredStatus: Extract<WaitingStatus, "remote_waiting" | "entry_requested" | "onsite_waiting">,
  ): Promise<WaitingEntry | null>;
  restoreHeldAtPosition(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
    restoredStatus: Extract<WaitingStatus, "remote_waiting" | "entry_requested" | "onsite_waiting">,
    orderedWaitingIds: string[],
  ): Promise<WaitingEntry | null>;
  reorderActive(
    executor: DatabaseExecutor,
    queueId: string,
    expectedWaitingIds: string[],
    orderedWaitingIds: string[],
  ): Promise<boolean>;
  deferRemoteToEnd(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
  ): Promise<WaitingEntry | null>;
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
    expectedVersion: number,
  ): Promise<NoShowMoveResult | null>;
  cancelExpired(
    executor: DatabaseExecutor,
    waitingEntryId: string,
    expectedVersion: number,
    cancelledAt: Date,
  ): Promise<WaitingEntry | null>;
}
