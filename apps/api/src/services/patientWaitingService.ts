import {
  activeWaitingStatuses,
  AVERAGE_TREATMENT_MINUTES,
  calculateQueuePositions,
  calculateRegistrationPatientCount,
  type PatientCounts,
  type PatientRegistrationInput,
  type MockPatientConfig,
  type QueueEntry,
  type QueuePosition,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type { DailyQueueRepository } from "../repositories/dailyQueueRepository.js";
import type { HospitalRepository } from "../repositories/hospitalRepository.js";
import type { PatientCategoryRepository } from "../repositories/patientCategoryRepository.js";
import type { ProfileRepository } from "../repositories/profileRepository.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type {
  WaitingEntry,
  WaitingEntryCount,
  WaitingRepository,
} from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";

interface PatientWaitingOptions {
  patientWebOrigin: string;
  getClinicDate: () => string;
}

export interface PatientWaitingOperations {
  getHospitalConfig(hospitalId: string): Promise<MockPatientConfig>;
  register(
    accountId: string,
    hospitalId: string,
    input: PatientRegistrationInput,
  ): Promise<QueuePosition>;
  getActive(accountId: string): Promise<QueuePosition | null>;
  defer(accountId: string): Promise<QueuePosition>;
  cancel(accountId: string): Promise<QueuePosition>;
}

export class PatientWaitingService implements PatientWaitingOperations {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly profileRepository: ProfileRepository,
    private readonly hospitalRepository: HospitalRepository,
    private readonly dailyQueueRepository: DailyQueueRepository,
    private readonly categoryRepository: PatientCategoryRepository,
    private readonly waitingRepository: WaitingRepository,
    private readonly eventRepository: WaitingEventRepository,
    private readonly notificationSender: NotificationSender,
    private readonly options: PatientWaitingOptions,
  ) {}

  async getHospitalConfig(hospitalId: string): Promise<MockPatientConfig> {
    return this.transactionManager.run(async (executor) => {
      const { hospital, queue, configuration } = await this.getQueueContext(executor, hospitalId);
      const waitingPatients = (await this.waitingRepository.listByQueue(executor, queue.id))
        .filter(({ status }) => activeWaitingStatuses.includes(status))
        .reduce((total, entry) => total + entry.patientCount, 0);
      return {
        hospital: {
          id: hospital.id,
          name: hospital.name,
          department: hospital.primaryDepartment,
          district: `${hospital.regionSido} ${hospital.regionSigungu}`,
          address: hospital.address,
          operatingHoursText: hospital.operatingHoursText,
        },
        inputMode: configuration.inputMode,
        categories: configuration.categories,
        queueStatus: queue.status,
        waitingPatients,
        estimatedMinutes: waitingPatients * AVERAGE_TREATMENT_MINUTES,
      };
    });
  }

  async register(
    accountId: string,
    hospitalId: string,
    input: PatientRegistrationInput,
  ): Promise<QueuePosition> {
    return this.transactionManager.run(async (executor) => {
      const profile = await this.requirePatientProfile(executor, accountId);
      const { hospital, queue, configuration } = await this.getQueueContext(executor, hospitalId);
      if (queue.status !== "open") {
        throw new ApiError(409, "REMOTE_QUEUE_UNAVAILABLE", "현재 원격 접수를 받고 있지 않습니다.");
      }
      if (await this.waitingRepository.findActiveRemoteByAccount(executor, accountId)) {
        throw new ApiError(
          409,
          "ACTIVE_REMOTE_WAITING_EXISTS",
          "이미 진행 중인 원격 웨이팅이 있습니다.",
        );
      }
      if (input.inputMode !== configuration.inputMode) {
        throw new ApiError(
          409,
          "PATIENT_INPUT_MODE_CHANGED",
          "병원의 현재 환자 인원 입력 방식을 다시 확인해 주세요.",
        );
      }

      const patientCount = calculateRegistrationPatientCount(input);
      const countInputs =
        input.inputMode === "categorized"
          ? this.validateCategoryCounts(
              input.patientCounts,
              configuration.categories.map(({ id }) => id),
            )
          : [];
      // Slot allocation locks the daily queue row, so concurrent registrations recheck capacity serially.
      const slot = await this.waitingRepository.allocateRegistrationSlot(executor, queue.id);
      const remotePatientCount = await this.waitingRepository.sumActiveRemotePatients(
        executor,
        queue.id,
      );
      if (remotePatientCount + patientCount > queue.maxRemoteWaitingPatients) {
        throw new ApiError(409, "REMOTE_CAPACITY_EXCEEDED", "원격 접수 가능 인원을 초과했습니다.", {
          currentPatientCount: remotePatientCount,
          requestedPatientCount: patientCount,
          limit: queue.maxRemoteWaitingPatients,
        });
      }

      const waiting = await this.waitingRepository.create(executor, {
        queueId: queue.id,
        accountId,
        source: "remote",
        phoneNumber: profile.phoneNumber,
        status: "remote_waiting",
        patientCount,
        lookupTokenHash: null,
        ...slot,
      });
      await this.waitingRepository.createCounts(executor, waiting.id, countInputs);
      await this.eventRepository.create(executor, {
        waitingEntryId: waiting.id,
        actorAccountId: accountId,
        actorType: "patient",
        eventType: "registered",
        fromStatus: null,
        toStatus: "remote_waiting",
        metadata: { source: "remote" },
      });
      await this.notificationSender.send(executor, {
        waitingEntryId: waiting.id,
        recipientPhone: profile.phoneNumber,
        notificationType: "remote_registered",
        dedupeKey: "remote_registered",
        variables: {
          hospitalName: hospital.name,
          ticketNumber: waiting.ticketNumber,
          statusUrl: `${this.options.patientWebOrigin}/my-waiting`,
        },
      });
      return this.buildPosition(executor, waiting.id);
    });
  }

  async getActive(accountId: string): Promise<QueuePosition | null> {
    return this.transactionManager.run(async (executor) => {
      await this.requirePatientProfile(executor, accountId);
      const waiting = await this.waitingRepository.findActiveRemoteByAccount(executor, accountId);
      return waiting ? this.buildPosition(executor, waiting.id) : null;
    });
  }

  async defer(accountId: string): Promise<QueuePosition> {
    return this.transactionManager.run(async (executor) => {
      const current = await this.requireOwnedActiveRemote(executor, accountId);
      if (current.patientDeferCount > 0) {
        throw new ApiError(
          409,
          "PATIENT_DEFER_ALREADY_USED",
          "순서 미루기는 한 번만 사용할 수 있습니다.",
        );
      }
      if (
        !(["remote_waiting", "entry_requested"] as const).includes(
          current.status as "remote_waiting" | "entry_requested",
        )
      ) {
        throw new ApiError(
          409,
          "PATIENT_DEFER_UNAVAILABLE",
          "현재 상태에서는 순서를 미룰 수 없습니다.",
        );
      }
      const updated = await this.waitingRepository.deferRemoteToEnd(
        executor,
        current.id,
        current.version,
      );
      if (!updated) throw new ApiError(409, "QUEUE_CONFLICT", "다른 요청이 먼저 처리되었습니다.");
      await this.eventRepository.create(executor, {
        waitingEntryId: current.id,
        actorAccountId: accountId,
        actorType: "patient",
        eventType: "deferred",
        fromStatus: current.status,
        toStatus: "remote_waiting",
        metadata: { previousQueueOrder: current.queueOrder, nextQueueOrder: updated.queueOrder },
      });
      return this.buildPosition(executor, current.id);
    });
  }

  async cancel(accountId: string): Promise<QueuePosition> {
    return this.transactionManager.run(async (executor) => {
      const current = await this.requireOwnedActiveRemote(executor, accountId);
      if (
        !(["remote_waiting", "entry_requested"] as const).includes(
          current.status as "remote_waiting" | "entry_requested",
        )
      ) {
        throw new ApiError(
          409,
          "PATIENT_CANCEL_UNAVAILABLE",
          "현장 접수 후에는 병원에 문의해 주세요.",
        );
      }
      const updated = await this.waitingRepository.transitionStatus(executor, {
        waitingEntryId: current.id,
        expectedVersion: current.version,
        fromStatuses: ["remote_waiting", "entry_requested"],
        toStatus: "cancelled",
      });
      if (!updated) throw new ApiError(409, "QUEUE_CONFLICT", "다른 요청이 먼저 처리되었습니다.");
      await this.eventRepository.create(executor, {
        waitingEntryId: current.id,
        actorAccountId: accountId,
        actorType: "patient",
        eventType: "cancelled",
        fromStatus: current.status,
        toStatus: "cancelled",
        metadata: { reason: "patient_requested" },
      });
      return this.buildPosition(executor, current.id);
    });
  }

  private async requirePatientProfile(executor: DatabaseExecutor, accountId: string) {
    const profile = await this.profileRepository.findById(executor, accountId);
    if (!profile || profile.accountType !== "patient" || profile.status !== "active") {
      throw new ApiError(403, "PATIENT_ACCESS_DENIED", "활성 환자 프로필이 필요합니다.");
    }
    return profile;
  }

  private async requireOwnedActiveRemote(executor: DatabaseExecutor, accountId: string) {
    await this.requirePatientProfile(executor, accountId);
    const waiting = await this.waitingRepository.findActiveRemoteByAccount(executor, accountId);
    if (!waiting)
      throw new ApiError(404, "ACTIVE_WAITING_NOT_FOUND", "진행 중인 원격 웨이팅이 없습니다.");
    return waiting;
  }

  private async getQueueContext(executor: DatabaseExecutor, hospitalId: string) {
    const hospital = await this.hospitalRepository.findById(executor, hospitalId);
    if (!hospital || hospital.approvalStatus !== "approved") {
      throw new ApiError(404, "HOSPITAL_NOT_FOUND", "원격 접수 가능한 병원을 찾을 수 없습니다.");
    }
    const queue = await this.dailyQueueRepository.findByHospitalAndDate(
      executor,
      hospitalId,
      this.options.getClinicDate(),
    );
    if (!queue)
      throw new ApiError(404, "DAILY_QUEUE_NOT_FOUND", "오늘 대기열이 준비되지 않았습니다.");
    const configuration = await this.categoryRepository.findConfigurationById(
      executor,
      queue.categorySetId,
    );
    if (!configuration || configuration.hospitalId !== hospitalId) {
      throw new ApiError(409, "CATEGORY_CONFIGURATION_INVALID", "환자 분류 설정을 확인해 주세요.");
    }
    return { hospital, queue, configuration };
  }

  private validateCategoryCounts(patientCounts: PatientCounts, allowedIds: string[]) {
    const allowed = new Set(allowedIds);
    if (Object.keys(patientCounts).some((id) => !allowed.has(id))) {
      throw new ApiError(
        400,
        "INVALID_PATIENT_CATEGORY",
        "현재 사용하지 않는 환자 분류가 포함되어 있습니다.",
      );
    }
    return Object.entries(patientCounts)
      .filter(([, count]) => count > 0)
      .map(([patientCategoryId, count]) => ({ patientCategoryId, count }));
  }

  private async buildPosition(
    executor: DatabaseExecutor,
    waitingId: string,
  ): Promise<QueuePosition> {
    const waiting = await this.waitingRepository.findById(executor, waitingId);
    if (!waiting) throw new ApiError(404, "WAITING_NOT_FOUND", "웨이팅을 찾을 수 없습니다.");
    const queue = await this.dailyQueueRepository.findById(executor, waiting.queueId);
    if (!queue) throw new ApiError(404, "DAILY_QUEUE_NOT_FOUND", "대기열을 찾을 수 없습니다.");
    const configuration = await this.categoryRepository.findConfigurationById(
      executor,
      queue.categorySetId,
    );
    if (!configuration)
      throw new ApiError(409, "CATEGORY_CONFIGURATION_INVALID", "환자 분류 설정을 확인해 주세요.");
    const entries = await this.waitingRepository.listByQueue(executor, queue.id);
    const counts = await this.waitingRepository.listCountsByQueue(executor, queue.id);
    const positions = calculateQueuePositions(
      entries.map((entry) =>
        this.toQueueEntry(entry, counts, configuration.inputMode, configuration.categories),
      ),
    );
    const position = positions.find(({ entry }) => entry.id === waitingId);
    if (!position) throw new ApiError(404, "WAITING_NOT_FOUND", "웨이팅을 찾을 수 없습니다.");
    return position;
  }

  private toQueueEntry(
    waiting: WaitingEntry,
    counts: WaitingEntryCount[],
    inputMode: QueueEntry["inputMode"],
    categories: QueueEntry["categorySnapshot"],
  ): QueueEntry {
    return {
      id: waiting.id,
      ticketNumber: waiting.ticketNumber,
      source: waiting.source,
      inputMode,
      patientCounts: Object.fromEntries(
        counts
          .filter((row) => row.waitingEntryId === waiting.id)
          .map((row) => [row.patientCategoryId, row.count]),
      ),
      patientCount: waiting.patientCount,
      categorySnapshot: categories,
      status: waiting.status,
      registeredAt: waiting.createdAt.toISOString(),
      deferred: waiting.patientDeferCount > 0,
    };
  }
}
