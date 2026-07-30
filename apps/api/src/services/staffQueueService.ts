import { createHash, randomBytes } from "node:crypto";
import {
  calculateQueuePositions,
  calculateRegistrationPatientCount,
  defaultQueueSettings,
} from "@baro-jinryo/shared";
import type {
  NotificationReceipt,
  OnsiteRegistrationResult,
  OnsiteWaitingRegistrationInput,
  PatientCounts,
  PatientInputConfiguration,
  QueueSettings,
  QueueStatus,
  QueueEntry,
  StaffNotificationHistoryItem,
  StaffQueueState,
  WaitingStatus,
} from "@baro-jinryo/shared";
import type { DatabaseExecutor } from "../db/databaseExecutor.js";
import type { TransactionManager } from "../db/transactionManager.js";
import { ApiError } from "../errors/apiError.js";
import type { DailyQueueRepository } from "../repositories/dailyQueueRepository.js";
import type { HospitalRepository } from "../repositories/hospitalRepository.js";
import type { NotificationRepository } from "../repositories/notificationRepository.js";
import type { PatientCategoryRepository } from "../repositories/patientCategoryRepository.js";
import type { WaitingEventRepository } from "../repositories/waitingEventRepository.js";
import type {
  WaitingEntry,
  WaitingEntryCount,
  WaitingRepository,
} from "../repositories/waitingRepository.js";
import type { NotificationSender } from "./notificationService.js";
import type { AutomaticNotificationProcessor } from "./automaticNotificationService.js";

export interface StaffQueueServiceOptions {
  patientWebOrigin: string;
  getClinicDate: () => string;
}

export interface StaffQueueOperations {
  getTodayQueue(hospitalId: string): Promise<StaffQueueState>;
  getWaitingNotifications(
    hospitalId: string,
    waitingEntryId: string,
  ): Promise<StaffNotificationHistoryItem[]>;
  saveNextDayConfiguration(
    hospitalId: string,
    input: PatientInputConfiguration,
  ): Promise<StaffQueueState>;
  registerOnsite(
    hospitalId: string,
    input: OnsiteWaitingRegistrationInput,
  ): Promise<OnsiteRegistrationResult>;
  setQueueStatus(hospitalId: string, status: QueueStatus): Promise<StaffQueueState>;
  updateQueueSettings(hospitalId: string, settings: QueueSettings): Promise<StaffQueueState>;
  changeWaitingStatus(
    hospitalId: string,
    waitingEntryId: string,
    status: Extract<WaitingStatus, "onsite_waiting" | "called" | "cancelled">,
    actorAccountId: string | null,
    reason?: string,
  ): Promise<StaffQueueState>;
  holdWaiting(
    hospitalId: string,
    waitingEntryId: string,
    actorAccountId: string | null,
  ): Promise<StaffQueueState>;
  restoreWaiting(
    hospitalId: string,
    waitingEntryId: string,
    actorAccountId: string | null,
    position?: number,
  ): Promise<StaffQueueState>;
  reorderWaitings(
    hospitalId: string,
    expectedWaitingIds: string[],
    orderedWaitingIds: string[],
    actorAccountId: string | null,
  ): Promise<StaffQueueState>;
}

export class StaffQueueService implements StaffQueueOperations {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly dailyQueueRepository: DailyQueueRepository,
    private readonly hospitalRepository: HospitalRepository,
    private readonly categoryRepository: PatientCategoryRepository,
    private readonly waitingRepository: WaitingRepository,
    private readonly waitingEventRepository: WaitingEventRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationSender: NotificationSender,
    private readonly automaticNotificationProcessor: AutomaticNotificationProcessor,
    private readonly options: StaffQueueServiceOptions,
  ) {}

  async getTodayQueue(hospitalId: string): Promise<StaffQueueState> {
    return this.transactionManager.run((executor) => this.buildQueueState(executor, hospitalId));
  }

  async getWaitingNotifications(
    hospitalId: string,
    waitingEntryId: string,
  ): Promise<StaffNotificationHistoryItem[]> {
    return this.transactionManager.run(async (executor) => {
      await this.requireApprovedHospital(executor, hospitalId);
      const waiting = await this.waitingRepository.findById(executor, waitingEntryId);
      if (!waiting) {
        throw new ApiError(404, "WAITING_NOT_FOUND", "대기 정보를 찾을 수 없습니다.");
      }
      const queue = await this.dailyQueueRepository.findById(executor, waiting.queueId);
      if (!queue || queue.hospitalId !== hospitalId) {
        throw new ApiError(404, "WAITING_NOT_FOUND", "대기 정보를 찾을 수 없습니다.");
      }

      const notifications = await this.notificationRepository.listByWaitingEntry(
        executor,
        waitingEntryId,
      );
      return notifications.map((notification) => ({
        id: notification.id,
        notificationType: notification.notificationType,
        deliveryStatus: notification.deliveryStatus,
        templateCode: notification.templateCode,
        sentAt: notification.sentAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      }));
    });
  }

  async saveNextDayConfiguration(
    hospitalId: string,
    input: PatientInputConfiguration,
  ): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      await this.requireApprovedHospital(executor, hospitalId);
      await this.categoryRepository.saveScheduledConfiguration(executor, {
        hospitalId,
        effectiveDate: this.getNextClinicDate(),
        inputMode: input.inputMode,
        categories: input.categories,
      });
      return this.buildQueueState(executor, hospitalId);
    });
  }

  async registerOnsite(
    hospitalId: string,
    input: OnsiteWaitingRegistrationInput,
  ): Promise<OnsiteRegistrationResult> {
    return this.transactionManager.run(async (executor) => {
      const { queue, configuration, hospital } = await this.getOrCreatePausedQueueContext(
        executor,
        hospitalId,
      );
      if (queue.status === "closed") {
        throw new ApiError(409, "QUEUE_CLOSED", "오늘 대기열이 종료되었습니다.");
      }
      if (input.registration.inputMode !== configuration.inputMode) {
        throw new ApiError(
          409,
          "PATIENT_INPUT_MODE_CHANGED",
          "병원의 현재 환자 인원 입력 방식을 다시 확인해 주세요.",
        );
      }

      const patientCount = calculateRegistrationPatientCount(input.registration);
      const countInputs =
        input.registration.inputMode === "categorized"
          ? this.validateCategoryCounts(
              input.registration.patientCounts,
              configuration.categories.map(({ id }) => id),
            )
          : [];
      const lookupToken = randomBytes(32).toString("base64url");
      const lookupTokenHash = createHash("sha256").update(lookupToken).digest("hex");
      const slot = await this.waitingRepository.allocateRegistrationSlot(executor, queue.id);
      const waiting = await this.waitingRepository.create(executor, {
        queueId: queue.id,
        accountId: null,
        source: "onsite",
        phoneNumber: input.phoneNumber,
        status: "onsite_waiting",
        patientCount,
        lookupTokenHash,
        ...slot,
      });
      await this.waitingRepository.createCounts(executor, waiting.id, countInputs);
      await this.waitingEventRepository.create(executor, {
        waitingEntryId: waiting.id,
        actorAccountId: null,
        actorType: "system",
        eventType: "registered",
        fromStatus: null,
        toStatus: "onsite_waiting",
        metadata: { source: "onsite" },
      });

      const statusUrl = `${this.options.patientWebOrigin}/?onsiteStatus=${encodeURIComponent(lookupToken)}`;
      const notificationResult = await this.notificationSender.send(executor, {
        waitingEntryId: waiting.id,
        recipientPhone: waiting.phoneNumber,
        notificationType: "onsite_registered",
        dedupeKey: "onsite_registered",
        variables: {
          hospitalName: hospital.name,
          ticketNumber: waiting.ticketNumber,
          statusUrl,
        },
      });
      if (notificationResult.duplicate || !notificationResult.notification) {
        throw new ApiError(409, "NOTIFICATION_DUPLICATED", "접수 알림이 이미 생성되었습니다.");
      }
      await this.processQueueNotifications(executor, queue.id, hospital.name);

      return {
        queue: await this.buildQueueState(executor, hospitalId),
        notification: this.toNotificationReceipt(
          notificationResult.notification.id,
          waiting.phoneNumber,
          statusUrl,
        ),
      };
    });
  }

  async setQueueStatus(hospitalId: string, status: QueueStatus): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      await this.requireApprovedHospital(executor, hospitalId);
      const queue = await this.dailyQueueRepository.findByHospitalAndDate(
        executor,
        hospitalId,
        this.options.getClinicDate(),
      );
      if (!queue) {
        if (status !== "open") {
          return this.buildQueueState(executor, hospitalId);
        }
        const configuration = await this.getEffectiveConfiguration(executor, hospitalId);
        await this.dailyQueueRepository.createOpen(executor, {
          hospitalId,
          categorySetId: configuration.id,
          queueDate: this.options.getClinicDate(),
        });
        return this.buildQueueState(executor, hospitalId);
      }
      const updated = await this.dailyQueueRepository.setStatus(executor, queue.id, status);
      if (!updated) throw new ApiError(409, "QUEUE_CONFLICT", "대기열 상태가 변경되었습니다.");
      return this.buildQueueState(executor, hospitalId);
    });
  }

  async changeWaitingStatus(
    hospitalId: string,
    waitingEntryId: string,
    status: "onsite_waiting" | "called" | "cancelled",
    actorAccountId: string | null,
    reason?: string,
  ): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      const current = await this.getHospitalWaiting(executor, hospitalId, waitingEntryId);
      const allowedFrom: Record<typeof status, WaitingStatus[]> = {
        onsite_waiting: ["entry_requested"],
        called: ["onsite_waiting"],
        cancelled: ["remote_waiting", "entry_requested", "onsite_waiting", "held"],
      };
      if (!allowedFrom[status].includes(current.status)) {
        throw new ApiError(
          409,
          "INVALID_TRANSITION",
          "현재 상태에서는 요청한 처리를 할 수 없습니다.",
        );
      }
      const updated =
        status === "onsite_waiting"
          ? await this.waitingRepository.advanceArrival(executor, waitingEntryId, current.version)
          : status === "called"
            ? await this.waitingRepository.advanceCall(executor, waitingEntryId, current.version)
            : await this.waitingRepository.transitionStatus(executor, {
                waitingEntryId,
                expectedVersion: current.version,
                fromStatuses: allowedFrom[status],
                toStatus: status,
              });
      if (!updated) throw new ApiError(409, "QUEUE_CONFLICT", "다른 요청이 먼저 처리되었습니다.");
      const eventType = status === "onsite_waiting" ? "arrived" : status;
      await this.waitingEventRepository.create(executor, {
        waitingEntryId,
        actorAccountId,
        actorType: actorAccountId ? "staff" : "system",
        eventType,
        fromStatus: current.status,
        toStatus: updated.status,
        metadata: {
          ...(reason ? { reason } : {}),
          ...(status === "onsite_waiting"
            ? {
                arrivedPatientCount: updated.arrivedPatientCount,
                patientCount: updated.patientCount,
              }
            : {}),
          ...(status === "called"
            ? {
                calledPatientCount: updated.calledPatientCount,
                patientCount: updated.patientCount,
              }
            : {}),
          ...(actorAccountId ? {} : { developmentBypass: true }),
        },
      });
      await this.processQueueNotifications(executor, current.queueId);
      return this.buildQueueState(executor, hospitalId);
    });
  }

  async holdWaiting(
    hospitalId: string,
    waitingEntryId: string,
    actorAccountId: string | null,
  ): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      const current = await this.getHospitalWaiting(executor, hospitalId, waitingEntryId);
      const activeStatuses: WaitingStatus[] = [
        "remote_waiting",
        "entry_requested",
        "onsite_waiting",
      ];
      if (!activeStatuses.includes(current.status)) {
        throw new ApiError(409, "INVALID_TRANSITION", "활성 대기만 보류할 수 있습니다.");
      }
      const held = await this.waitingRepository.transitionStatus(executor, {
        waitingEntryId,
        expectedVersion: current.version,
        fromStatuses: activeStatuses,
        toStatus: "held",
      });
      if (!held) throw new ApiError(409, "QUEUE_CONFLICT", "다른 요청이 먼저 처리되었습니다.");
      await this.waitingEventRepository.create(executor, {
        waitingEntryId,
        actorAccountId,
        actorType: actorAccountId ? "staff" : "system",
        eventType: "held",
        fromStatus: current.status,
        toStatus: "held",
        metadata: {
          previousQueueOrder: current.queueOrder,
          ...(actorAccountId ? {} : { developmentBypass: true }),
        },
      });
      await this.processQueueNotifications(executor, current.queueId);
      return this.buildQueueState(executor, hospitalId);
    });
  }

  async restoreWaiting(
    hospitalId: string,
    waitingEntryId: string,
    actorAccountId: string | null,
    position?: number,
  ): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      const current = await this.getHospitalWaiting(executor, hospitalId, waitingEntryId);
      if (current.status !== "held") {
        throw new ApiError(409, "INVALID_TRANSITION", "보류된 대기만 복귀할 수 있습니다.");
      }
      const events = await this.waitingEventRepository.listByWaitingEntry(executor, waitingEntryId);
      const heldEvent = [...events].reverse().find((event) => event.eventType === "held");
      const restoredStatus = heldEvent?.fromStatus;
      if (
        !restoredStatus ||
        !["remote_waiting", "entry_requested", "onsite_waiting"].includes(restoredStatus)
      ) {
        throw new ApiError(409, "WAITING_HISTORY_INVALID", "보류 전 상태를 확인할 수 없습니다.");
      }
      const activeIds = (await this.waitingRepository.listByQueue(executor, current.queueId))
        .filter(({ status }) =>
          ["remote_waiting", "entry_requested", "onsite_waiting"].includes(status),
        )
        .map(({ id }) => id);
      const insertIndex = position === undefined ? activeIds.length : position - 1;
      if (insertIndex < 0 || insertIndex > activeIds.length) {
        throw new ApiError(
          400,
          "INVALID_RETURN_POSITION",
          `복귀 위치는 1부터 ${activeIds.length + 1} 사이여야 합니다.`,
        );
      }
      const orderedIds = [...activeIds];
      orderedIds.splice(insertIndex, 0, waitingEntryId);
      const restored = await this.waitingRepository.restoreHeldAtPosition(
        executor,
        waitingEntryId,
        current.version,
        restoredStatus as "remote_waiting" | "entry_requested" | "onsite_waiting",
        orderedIds,
      );
      if (!restored) throw new ApiError(409, "QUEUE_CONFLICT", "다른 요청이 먼저 처리되었습니다.");
      await this.waitingEventRepository.create(executor, {
        waitingEntryId,
        actorAccountId,
        actorType: actorAccountId ? "staff" : "system",
        eventType: "restored",
        fromStatus: "held",
        toStatus: restored.status,
        metadata: {
          previousQueueOrder: heldEvent.metadata.previousQueueOrder ?? null,
          nextQueueOrder: restored.queueOrder,
          requestedPosition: position ?? activeIds.length + 1,
          ...(actorAccountId ? {} : { developmentBypass: true }),
        },
      });
      await this.processQueueNotifications(executor, current.queueId);
      return this.buildQueueState(executor, hospitalId);
    });
  }

  async reorderWaitings(
    hospitalId: string,
    expectedWaitingIds: string[],
    orderedWaitingIds: string[],
    actorAccountId: string | null,
  ): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      const { queue } = await this.getQueueContext(executor, hospitalId);
      const before = (await this.waitingRepository.listByQueue(executor, queue.id)).filter(
        ({ status }) => ["remote_waiting", "entry_requested", "onsite_waiting"].includes(status),
      );
      if (orderedWaitingIds.length === 0) {
        throw new ApiError(400, "WAITING_ORDER_REQUIRED", "변경할 활성 대기 순서를 입력해 주세요.");
      }
      const reordered = await this.waitingRepository.reorderActive(
        executor,
        queue.id,
        expectedWaitingIds,
        orderedWaitingIds,
      );
      if (!reordered) {
        throw new ApiError(
          409,
          "QUEUE_ORDER_CONFLICT",
          "대기열이 변경되었습니다. 새로고침 후 다시 시도해 주세요.",
        );
      }
      const previousOrder = new Map(before.map(({ id }, index) => [id, index + 1]));
      for (const [index, waitingEntryId] of orderedWaitingIds.entries()) {
        if (previousOrder.get(waitingEntryId) === index + 1) continue;
        await this.waitingEventRepository.create(executor, {
          waitingEntryId,
          actorAccountId,
          actorType: actorAccountId ? "staff" : "system",
          eventType: "reordered",
          fromStatus: before.find(({ id }) => id === waitingEntryId)?.status ?? null,
          toStatus: before.find(({ id }) => id === waitingEntryId)?.status ?? null,
          metadata: {
            previousPosition: previousOrder.get(waitingEntryId) ?? null,
            nextPosition: index + 1,
            ...(actorAccountId ? {} : { developmentBypass: true }),
          },
        });
      }
      await this.processQueueNotifications(executor, queue.id, undefined, hospitalId);
      return this.buildQueueState(executor, hospitalId);
    });
  }

  async updateQueueSettings(hospitalId: string, settings: QueueSettings): Promise<StaffQueueState> {
    return this.transactionManager.run(async (executor) => {
      const { queue, hospital } = await this.getOrCreatePausedQueueContext(executor, hospitalId);
      const updated = await this.dailyQueueRepository.updateSettings(executor, queue.id, settings);
      if (!updated) {
        throw new ApiError(409, "QUEUE_CONFLICT", "대기열 설정이 변경되었습니다.");
      }
      await this.processQueueNotifications(executor, queue.id, hospital.name);
      return this.buildQueueState(executor, hospitalId);
    });
  }

  private async processQueueNotifications(
    executor: DatabaseExecutor,
    queueId: string,
    hospitalName?: string,
    hospitalId?: string,
  ): Promise<void> {
    const queue = await this.dailyQueueRepository.findById(executor, queueId);
    if (!queue) throw new ApiError(404, "DAILY_QUEUE_NOT_FOUND", "Daily queue was not found.");
    let resolvedHospitalName = hospitalName;
    if (!resolvedHospitalName) {
      const hospital = await this.requireApprovedHospital(executor, hospitalId ?? queue.hospitalId);
      resolvedHospitalName = hospital.name;
    }
    await this.automaticNotificationProcessor.processQueue(executor, {
      queueId,
      hospitalName: resolvedHospitalName,
      patientWebOrigin: this.options.patientWebOrigin,
      averageMinutesPerPatient: queue.averageMinutesPerPatient,
      preparationThreshold: queue.preparationThreshold,
      entryThreshold: queue.entryThreshold,
    });
  }

  private async buildQueueState(
    executor: DatabaseExecutor,
    hospitalId: string,
  ): Promise<StaffQueueState> {
    await this.requireApprovedHospital(executor, hospitalId);
    const clinicDate = this.options.getClinicDate();
    const queue = await this.dailyQueueRepository.findByHospitalAndDate(
      executor,
      hospitalId,
      clinicDate,
    );
    const nextDayConfiguration = await this.categoryRepository.findEffectiveConfiguration(
      executor,
      hospitalId,
      this.getNextClinicDate(),
    );
    if (!queue) {
      const configuration = await this.getEffectiveConfiguration(executor, hospitalId);
      const nextConfiguration = nextDayConfiguration ?? configuration;
      return {
        entries: [],
        positions: [],
        queueDate: clinicDate,
        queueStatus: "paused",
        todayInputMode: configuration.inputMode,
        nextDayInputMode: nextConfiguration.inputMode,
        todayCategories: configuration.categories,
        nextDayCategories: nextConfiguration.categories,
        settings: { ...defaultQueueSettings },
      };
    }
    const configuration = await this.getConfigurationById(
      executor,
      hospitalId,
      queue.categorySetId,
    );
    const waitingEntries = await this.waitingRepository.listByQueue(executor, queue.id);
    const countRows = await this.waitingRepository.listCountsByQueue(executor, queue.id);
    const entries = waitingEntries.map((waiting) =>
      this.toQueueEntry(waiting, countRows, configuration.inputMode, configuration.categories),
    );
    const nextConfiguration = nextDayConfiguration ?? configuration;
    return {
      entries,
      positions: calculateQueuePositions(entries, queue.averageMinutesPerPatient),
      queueDate: queue.queueDate,
      queueStatus: queue.status,
      todayInputMode: configuration.inputMode,
      nextDayInputMode: nextConfiguration.inputMode,
      todayCategories: configuration.categories,
      nextDayCategories: nextConfiguration.categories,
      settings: {
        averageMinutesPerPatient: queue.averageMinutesPerPatient,
        preparationThreshold: queue.preparationThreshold,
        entryThreshold: queue.entryThreshold,
        maxRemoteWaitingPatients: queue.maxRemoteWaitingPatients,
      },
    };
  }

  private getNextClinicDate(): string {
    const clinicDate = new Date(`${this.options.getClinicDate()}T00:00:00.000Z`);
    clinicDate.setUTCDate(clinicDate.getUTCDate() + 1);
    return clinicDate.toISOString().slice(0, 10);
  }

  private async getQueueContext(executor: DatabaseExecutor, hospitalId: string) {
    const hospital = await this.requireApprovedHospital(executor, hospitalId);
    const queue = await this.dailyQueueRepository.findByHospitalAndDate(
      executor,
      hospitalId,
      this.options.getClinicDate(),
    );
    if (!queue) {
      throw new ApiError(404, "DAILY_QUEUE_NOT_FOUND", "오늘 대기열이 준비되지 않았습니다.");
    }
    const configuration = await this.getConfigurationById(
      executor,
      hospitalId,
      queue.categorySetId,
    );
    return { queue, configuration, hospital };
  }

  private async getOrCreatePausedQueueContext(executor: DatabaseExecutor, hospitalId: string) {
    const hospital = await this.requireApprovedHospital(executor, hospitalId);
    let queue = await this.dailyQueueRepository.findByHospitalAndDate(
      executor,
      hospitalId,
      this.options.getClinicDate(),
    );
    if (!queue) {
      const effectiveConfiguration = await this.getEffectiveConfiguration(executor, hospitalId);
      queue = await this.dailyQueueRepository.createPaused(executor, {
        hospitalId,
        categorySetId: effectiveConfiguration.id,
        queueDate: this.options.getClinicDate(),
      });
    }
    const configuration = await this.getConfigurationById(
      executor,
      hospitalId,
      queue.categorySetId,
    );
    return { queue, configuration, hospital };
  }

  private async requireApprovedHospital(executor: DatabaseExecutor, hospitalId: string) {
    const hospital = await this.hospitalRepository.findById(executor, hospitalId);
    if (!hospital || hospital.approvalStatus !== "approved") {
      throw new ApiError(403, "HOSPITAL_NOT_APPROVED", "승인된 병원을 찾을 수 없습니다.");
    }
    return hospital;
  }

  private async getEffectiveConfiguration(executor: DatabaseExecutor, hospitalId: string) {
    const configuration = await this.categoryRepository.findEffectiveConfiguration(
      executor,
      hospitalId,
      this.options.getClinicDate(),
    );
    if (!configuration) {
      throw new ApiError(409, "CATEGORY_CONFIGURATION_INVALID", "환자 분류 설정을 확인해 주세요.");
    }
    return configuration;
  }

  private async getConfigurationById(
    executor: DatabaseExecutor,
    hospitalId: string,
    categorySetId: string,
  ) {
    const configuration = await this.categoryRepository.findConfigurationById(
      executor,
      categorySetId,
    );
    if (!configuration || configuration.hospitalId !== hospitalId) {
      throw new ApiError(409, "CATEGORY_CONFIGURATION_INVALID", "환자 분류 설정을 확인해 주세요.");
    }
    return configuration;
  }

  private async getHospitalWaiting(
    executor: DatabaseExecutor,
    hospitalId: string,
    waitingEntryId: string,
  ) {
    const waiting = await this.waitingRepository.findById(executor, waitingEntryId);
    if (!waiting) throw new ApiError(404, "WAITING_NOT_FOUND", "웨이팅을 찾을 수 없습니다.");
    const queue = await this.dailyQueueRepository.findById(executor, waiting.queueId);
    if (!queue || queue.hospitalId !== hospitalId) {
      throw new ApiError(403, "HOSPITAL_ACCESS_DENIED", "다른 병원의 웨이팅입니다.");
    }
    return waiting;
  }

  private validateCategoryCounts(patientCounts: PatientCounts, allowedIds: string[]) {
    const allowed = new Set(allowedIds);
    const unknownIds = Object.keys(patientCounts).filter((id) => !allowed.has(id));
    if (unknownIds.length > 0) {
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

  private toQueueEntry(
    waiting: WaitingEntry,
    counts: WaitingEntryCount[],
    inputMode: "categorized" | "total_only",
    categories: StaffQueueState["todayCategories"],
  ): QueueEntry {
    const patientCounts = Object.fromEntries(
      counts
        .filter(({ waitingEntryId }) => waitingEntryId === waiting.id)
        .map(({ patientCategoryId, count }) => [patientCategoryId, count]),
    );
    return {
      id: waiting.id,
      ticketNumber: waiting.ticketNumber,
      source: waiting.source,
      inputMode,
      patientCounts,
      patientCount: waiting.patientCount,
      arrivedPatientCount: waiting.arrivedPatientCount,
      calledPatientCount: waiting.calledPatientCount,
      categorySnapshot: categories,
      status: waiting.status,
      registeredAt: waiting.createdAt.toISOString(),
      deferred: waiting.patientDeferCount > 0,
    };
  }

  private toNotificationReceipt(
    id: string,
    phoneNumber: string,
    statusUrl: string,
  ): NotificationReceipt {
    const digits = phoneNumber.replace(/\D/g, "");
    return {
      id,
      recipientPhoneMasked: `${digits.slice(0, 4)}-****-${digits.slice(-4)}`,
      templateCode: "onsite_registered",
      openPath: statusUrl,
    };
  }
}
