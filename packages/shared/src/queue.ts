import type {
  PatientCategoryDefinition,
  PatientCounts,
  PatientInputMode,
  PatientRegistrationInput,
  QueueStatus,
  WaitingSource,
  WaitingStatus,
} from "./domain.js";
import { z } from "zod";
export const waitingEventActorTypes = ["patient", "staff", "system"] as const;
export type WaitingEventActorType = (typeof waitingEventActorTypes)[number];

export const waitingEventTypes = [
  "registered",
  "entry_requested",
  "arrived",
  "deferred",
  "held",
  "restored",
  "called",
  "cancelled",
  "reordered",
  "no_show_moved",
] as const;
export type WaitingEventType = (typeof waitingEventTypes)[number];

export interface QueueEntry {
  id: string;
  ticketNumber: string;
  source: WaitingSource;
  inputMode: PatientInputMode;
  patientCounts: PatientCounts;
  patientCount: number;
  arrivedPatientCount?: number | undefined;
  calledPatientCount?: number | undefined;
  categorySnapshot: PatientCategoryDefinition[];
  status: WaitingStatus;
  registeredAt: string;
  deferred: boolean;
  heldFrom?: WaitingStatus | undefined;
}

export type MockQueueEntry = QueueEntry;

export interface OnsiteWaitingRegistrationInput {
  phoneNumber: string;
  registration: PatientRegistrationInput;
}

export interface NotificationReceipt {
  id: string;
  recipientPhoneMasked: string;
  templateCode: "onsite_registered";
  openPath: string;
}

export type MockNotificationReceipt = NotificationReceipt;

export interface OnsiteRegistrationResult {
  queue: StaffQueueState;
  notification: NotificationReceipt;
}

export type MockOnsiteRegistrationResult = OnsiteRegistrationResult;

export interface OnsiteWaitingStatus {
  hospital: {
    name: string;
    specialty: string;
    address: string;
    phoneNumber: string;
  };
  waiting: QueuePosition;
}

export type MockOnsiteWaitingStatus = OnsiteWaitingStatus;

export interface QueuePosition {
  entry: MockQueueEntry;
  teamNumber: number | null;
  position: number | null;
  positionEnd: number | null;
  estimatedMinutes: number | null;
}

export interface QueuePatientSlot {
  entry: MockQueueEntry;
  teamNumber: number | null;
  position: number | null;
  estimatedMinutes: number | null;
  patientSlotNumber: number | null;
  patientSlotCount: number | null;
  arrived: boolean;
  called: boolean;
  isFirstTeamSlot: boolean;
}

export interface MockPatientConfig {
  hospital: {
    id: string;
    name: string;
    department: string;
    district: string;
    address: string;
    phoneNumber: string;
    operatingHoursText: string;
  };
  inputMode: PatientInputMode;
  categories: PatientCategoryDefinition[];
  queueStatus: QueueStatus;
  waitingPatients: number;
  estimatedMinutes: number;
}

export interface StaffQueueState {
  entries: QueueEntry[];
  positions: QueuePosition[];
  queueDate: string;
  queueStatus: QueueStatus;
  todayInputMode: PatientInputMode;
  nextDayInputMode: PatientInputMode;
  todayCategories: PatientCategoryDefinition[];
  nextDayCategories: PatientCategoryDefinition[];
  settings: QueueSettings;
}

export type MockStaffQueueState = StaffQueueState;

export const AVERAGE_TREATMENT_MINUTES = 10;

export const defaultQueueSettings = {
  averageMinutesPerPatient: 10,
  preparationThreshold: 6,
  entryThreshold: 4,
  arrivalGraceMinutes: 20,
  maxRemoteWaitingPatients: 20,
} as const;

export const queueSettingsSchema = z
  .object({
    averageMinutesPerPatient: z
      .number()
      .int()
      .positive("평균 진료시간은 5분 이상이어야 합니다.")
      .refine((value) => value % 5 === 0, {
        message: "평균 진료시간은 5분 단위로 입력해 주세요.",
      }),
    preparationThreshold: z.number().int().positive("준비 기준은 1 이상이어야 합니다."),
    entryThreshold: z.number().int().positive("입장 기준은 1 이상이어야 합니다."),
    maxRemoteWaitingPatients: z.number().int().positive("원격 접수 한도는 1명 이상이어야 합니다."),
  })
  .superRefine((settings, context) => {
    if (settings.preparationThreshold <= settings.entryThreshold) {
      context.addIssue({
        code: "custom",
        path: ["preparationThreshold"],
        message: "준비 기준은 입장 기준보다 커야 합니다.",
      });
    }
  });

export type QueueSettings = z.infer<typeof queueSettingsSchema>;

export type AutomaticNotificationDecision =
  | { notificationType: "preparation"; dedupeKey: "preparation" }
  | { notificationType: "entry_requested"; dedupeKey: `entry_requested:${number}` }
  | { notificationType: "onsite_near_turn"; dedupeKey: "onsite_near_turn" };

export interface AutomaticNotificationContext {
  source: WaitingSource;
  status: WaitingStatus;
  currentPosition: number | null;
  patientDeferCount: number;
  preparationNotifiedAt: Date | null;
  onsiteNearTurnNotifiedAt: Date | null;
  preparationThreshold?: number;
  entryThreshold?: number;
}

export function decideAutomaticNotification({
  source,
  status,
  currentPosition,
  patientDeferCount,
  preparationNotifiedAt,
  onsiteNearTurnNotifiedAt,
  preparationThreshold = defaultQueueSettings.preparationThreshold,
  entryThreshold = defaultQueueSettings.entryThreshold,
}: AutomaticNotificationContext): AutomaticNotificationDecision | null {
  if (currentPosition === null || currentPosition < 1) return null;

  if (source === "onsite") {
    return status === "onsite_waiting" &&
      currentPosition - 1 <= entryThreshold &&
      onsiteNearTurnNotifiedAt === null
      ? { notificationType: "onsite_near_turn", dedupeKey: "onsite_near_turn" }
      : null;
  }

  if (status !== "remote_waiting") return null;
  if (currentPosition <= entryThreshold) {
    return {
      notificationType: "entry_requested",
      dedupeKey: `entry_requested:${patientDeferCount}`,
    };
  }
  if (currentPosition <= preparationThreshold && preparationNotifiedAt === null) {
    return { notificationType: "preparation", dedupeKey: "preparation" };
  }
  return null;
}

export const defaultPatientCategories: PatientCategoryDefinition[] = [
  { id: "child", name: "소아", description: "만 13세 미만", sortOrder: 0 },
  {
    id: "youth",
    name: "청소년",
    description: "만 13세 이상 19세 미만",
    sortOrder: 1,
  },
  { id: "adult", name: "성인", description: "만 19세 이상", sortOrder: 2 },
];

export const activeWaitingStatuses: WaitingStatus[] = [
  "remote_waiting",
  "entry_requested",
  "onsite_waiting",
];

export function cloneCategories(
  categories: PatientCategoryDefinition[],
): PatientCategoryDefinition[] {
  return categories.map((category) => ({ ...category }));
}

export function createEmptyPatientCounts(categories: PatientCategoryDefinition[]): PatientCounts {
  return Object.fromEntries(categories.map((category) => [category.id, 0]));
}

export function isActiveEntry(entry: MockQueueEntry): boolean {
  return activeWaitingStatuses.includes(entry.status);
}

export function calculateQueuePositions(
  entries: MockQueueEntry[],
  averageMinutesPerPatient = AVERAGE_TREATMENT_MINUTES,
): QueuePosition[] {
  let patientsAhead = 0;
  let activeTeamNumber = 0;

  return entries.map((entry) => {
    if (!isActiveEntry(entry)) {
      return {
        entry,
        teamNumber: null,
        position: null,
        positionEnd: null,
        estimatedMinutes: null,
      };
    }

    const patientCount = entry.patientCount;
    const position = patientsAhead + 1;
    const positionEnd = position + patientCount - 1;
    const estimatedMinutes = patientsAhead * averageMinutesPerPatient;
    patientsAhead += patientCount;
    activeTeamNumber += 1;

    return { entry, teamNumber: activeTeamNumber, position, positionEnd, estimatedMinutes };
  });
}

export function expandQueuePositionsToPatientSlots(
  positions: QueuePosition[],
  averageMinutesPerPatient = AVERAGE_TREATMENT_MINUTES,
): QueuePatientSlot[] {
  return positions.flatMap((position) => {
    if (position.position === null || position.positionEnd === null) {
      const inactiveSlot: QueuePatientSlot = {
        entry: position.entry,
        teamNumber: position.teamNumber,
        position: null,
        estimatedMinutes: null,
        patientSlotNumber: null,
        patientSlotCount: null,
        arrived: false,
        called: false,
        isFirstTeamSlot: true,
      };
      return [inactiveSlot];
    }

    const arrivedPatientCount =
      position.entry.arrivedPatientCount ??
      (["onsite_waiting", "called"].includes(position.entry.status)
        ? position.entry.patientCount
        : 0);
    const calledPatientCount =
      position.entry.calledPatientCount ??
      (position.entry.status === "called" ? position.entry.patientCount : 0);

    return Array.from({ length: position.entry.patientCount }, (_, index): QueuePatientSlot => {
      const patientPosition = position.position! + index;
      const patientSlotNumber = index + 1;
      return {
        entry: position.entry,
        teamNumber: position.teamNumber,
        position: patientPosition,
        estimatedMinutes: (patientPosition - 1) * averageMinutesPerPatient,
        patientSlotNumber,
        patientSlotCount: position.entry.patientCount,
        arrived: patientSlotNumber <= arrivedPatientCount,
        called: patientSlotNumber <= calledPatientCount,
        isFirstTeamSlot: index === 0,
      };
    });
  });
}

export function formatPatientCounts(entry: MockQueueEntry): string {
  if (entry.inputMode === "total_only") return `총인원 ${entry.patientCount}명`;

  return entry.categorySnapshot
    .filter((category) => (entry.patientCounts[category.id] ?? 0) > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => `${category.name} ${entry.patientCounts[category.id]}`)
    .join(" · ");
}

export function formatPositionRange(position: QueuePosition): string {
  if (position.position === null || position.positionEnd === null) return "-";
  return position.position === position.positionEnd
    ? `${position.position}번째`
    : `${position.position}~${position.positionEnd}번째`;
}
