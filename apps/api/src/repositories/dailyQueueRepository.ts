import type { QueueStatus } from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface DailyQueue {
  id: string;
  hospitalId: string;
  categorySetId: string;
  queueDate: string;
  status: QueueStatus;
  averageMinutesPerPatient: number;
  preparationThreshold: number;
  entryThreshold: number;
  arrivalGraceMinutes: number;
  maxRemoteWaitingPatients: number;
  nextTicketNumber: number;
  openedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDailyQueueInput {
  hospitalId: string;
  categorySetId: string;
  queueDate: string;
}

export interface DailyQueueRepository {
  findById(executor: DatabaseExecutor, id: string): Promise<DailyQueue | null>;
  findByHospitalAndDate(
    executor: DatabaseExecutor,
    hospitalId: string,
    queueDate: string,
  ): Promise<DailyQueue | null>;
  createOpen(executor: DatabaseExecutor, input: CreateDailyQueueInput): Promise<DailyQueue>;
  setStatus(
    executor: DatabaseExecutor,
    queueId: string,
    status: QueueStatus,
  ): Promise<DailyQueue | null>;
}
