import type {
  WaitingEventActorType,
  WaitingEventType,
  WaitingStatus,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";

export interface WaitingEvent {
  id: string;
  waitingEntryId: string;
  actorAccountId: string | null;
  actorType: WaitingEventActorType;
  eventType: WaitingEventType;
  fromStatus: WaitingStatus | null;
  toStatus: WaitingStatus | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateWaitingEventInput {
  waitingEntryId: string;
  actorAccountId: string | null;
  actorType: WaitingEventActorType;
  eventType: WaitingEventType;
  fromStatus: WaitingStatus | null;
  toStatus: WaitingStatus | null;
  metadata: Record<string, unknown>;
}

export interface WaitingEventRepository {
  create(executor: DatabaseExecutor, input: CreateWaitingEventInput): Promise<WaitingEvent>;
  listByWaitingEntry(executor: DatabaseExecutor, waitingEntryId: string): Promise<WaitingEvent[]>;
}
