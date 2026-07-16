import { createHash } from "node:crypto";
import { calculateQueuePositions, type OnsiteWaitingStatus, type QueueEntry } from "@baro-jinryo/shared";
import type { TransactionManager } from "../db/transactionManager.js";
import type { DailyQueueRepository } from "../repositories/dailyQueueRepository.js";
import type { HospitalRepository } from "../repositories/hospitalRepository.js";
import type { PatientCategoryRepository } from "../repositories/patientCategoryRepository.js";
import type {
  WaitingEntry,
  WaitingEntryCount,
  WaitingRepository,
} from "../repositories/waitingRepository.js";

export interface OnsiteStatusOperations {
  getByLookupToken(lookupToken: string): Promise<OnsiteWaitingStatus | null>;
}

export class OnsiteStatusService implements OnsiteStatusOperations {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly waitingRepository: WaitingRepository,
    private readonly dailyQueueRepository: DailyQueueRepository,
    private readonly categoryRepository: PatientCategoryRepository,
    private readonly hospitalRepository: HospitalRepository,
  ) {}

  async getByLookupToken(lookupToken: string): Promise<OnsiteWaitingStatus | null> {
    const lookupTokenHash = createHash("sha256").update(lookupToken).digest("hex");
    return this.transactionManager.run(async (executor) => {
      const target = await this.waitingRepository.findByLookupTokenHash(
        executor,
        lookupTokenHash,
      );
      if (!target) return null;

      const queue = await this.dailyQueueRepository.findById(executor, target.queueId);
      if (!queue) return null;
      const hospital = await this.hospitalRepository.findById(executor, queue.hospitalId);
      const configuration = await this.categoryRepository.findConfigurationById(
        executor,
        queue.categorySetId,
      );
      const waitings = await this.waitingRepository.listByQueue(executor, queue.id);
      const counts = await this.waitingRepository.listCountsByQueue(executor, queue.id);
      if (!hospital || !configuration || configuration.hospitalId !== hospital.id) return null;

      const entries = waitings.map((waiting) =>
        toQueueEntry(waiting, counts, configuration.inputMode, configuration.categories),
      );
      const waiting = calculateQueuePositions(entries).find(
        ({ entry }) => entry.id === target.id,
      );
      if (!waiting) return null;

      return {
        hospital: {
          name: hospital.name,
          specialty: hospital.primaryDepartment,
          address: hospital.address,
          phoneNumber: hospital.phoneNumber,
        },
        waiting,
      };
    });
  }
}

function toQueueEntry(
  waiting: WaitingEntry,
  counts: WaitingEntryCount[],
  inputMode: "categorized" | "total_only",
  categories: QueueEntry["categorySnapshot"],
): QueueEntry {
  return {
    id: waiting.id,
    ticketNumber: waiting.ticketNumber,
    source: waiting.source,
    inputMode,
    patientCounts: Object.fromEntries(
      counts
        .filter(({ waitingEntryId }) => waitingEntryId === waiting.id)
        .map(({ patientCategoryId, count }) => [patientCategoryId, count]),
    ),
    patientCount: waiting.patientCount,
    categorySnapshot: categories,
    status: waiting.status,
    registeredAt: waiting.createdAt.toISOString(),
    deferred: waiting.patientDeferCount > 0,
  };
}
