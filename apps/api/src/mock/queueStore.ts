import type {
  MockNotificationReceipt,
  MockOnsiteRegistrationResult,
  MockOnsiteWaitingStatus,
  MockQueueEntry,
  MockStaffQueueState,
  OnsiteWaitingRegistrationInput,
  PatientCategoryDefinition,
  PatientInputMode,
  PatientRegistrationInput,
  QueuePosition,
  QueueStatus,
  WaitingSource,
  WaitingStatus,
} from "@baro-jinryo/shared";
import {
  calculateQueuePositions,
  calculateRegistrationPatientCount,
  cloneCategories,
  defaultPatientCategories,
} from "@baro-jinryo/shared";
import { createHash, randomBytes } from "node:crypto";

const PATIENT_WAITING_ID = "waiting-patient";
const MOCK_HOSPITAL = {
  name: "서울이비인후과",
  specialty: "이비인후과",
  address: "서울 마포구 월드컵로 12, 2층",
  phoneNumber: "02-1234-5678",
};

interface MockNotificationRecord {
  id: string;
  entryId: string;
  lookupToken: string;
  recipientPhoneMasked: string;
}

function createEntry(
  id: string,
  ticketNumber: string,
  source: WaitingSource,
  input: PatientRegistrationInput,
  status: WaitingStatus,
  registeredAt: string,
  categories: PatientCategoryDefinition[],
): MockQueueEntry {
  return {
    id,
    ticketNumber,
    source,
    inputMode: input.inputMode,
    patientCounts: input.inputMode === "categorized" ? input.patientCounts : {},
    patientCount: calculateRegistrationPatientCount(input),
    categorySnapshot: cloneCategories(categories),
    status,
    registeredAt,
    deferred: false,
  };
}

function createInitialEntries(): MockQueueEntry[] {
  return [
    createEntry(
      "waiting-a012",
      "12",
      "onsite",
      { inputMode: "categorized", patientCounts: { child: 0, youth: 0, adult: 1 } },
      "onsite_waiting",
      "09:21",
      defaultPatientCategories,
    ),
    createEntry(
      "waiting-a013",
      "13",
      "remote",
      { inputMode: "categorized", patientCounts: { child: 1, youth: 0, adult: 1 } },
      "entry_requested",
      "09:32",
      defaultPatientCategories,
    ),
    createEntry(
      "waiting-a014",
      "14",
      "remote",
      { inputMode: "categorized", patientCounts: { child: 0, youth: 1, adult: 0 } },
      "remote_waiting",
      "09:40",
      defaultPatientCategories,
    ),
    createEntry(
      "waiting-a015",
      "15",
      "onsite",
      { inputMode: "categorized", patientCounts: { child: 0, youth: 0, adult: 1 } },
      "onsite_waiting",
      "09:43",
      defaultPatientCategories,
    ),
    {
      ...createEntry(
        "waiting-a016",
        "16",
        "remote",
        { inputMode: "categorized", patientCounts: { child: 0, youth: 0, adult: 2 } },
        "held",
        "09:45",
        defaultPatientCategories,
      ),
      heldFrom: "remote_waiting",
    },
  ];
}

function currentTime(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function applyEntryRequestPolicy(entries: MockQueueEntry[]): MockQueueEntry[] {
  const patientWaiting = calculateQueuePositions(entries).find(
    ({ entry }) => entry.id === PATIENT_WAITING_ID,
  );
  if (
    patientWaiting?.entry.status !== "remote_waiting" ||
    patientWaiting.position === null ||
    patientWaiting.position > 4
  ) {
    return entries;
  }
  return entries.map((entry) =>
    entry.id === PATIENT_WAITING_ID ? { ...entry, status: "entry_requested" } : entry,
  );
}

let entries = createInitialEntries();
let queueStatus: QueueStatus = "open";
let todayInputMode: PatientInputMode = "categorized";
let nextDayInputMode: PatientInputMode = "categorized";
let todayCategories = cloneCategories(defaultPatientCategories);
let nextDayCategories = cloneCategories(defaultPatientCategories);
let onsiteNotifications = new Map<string, MockNotificationRecord>();
let onsiteLookupTokens = new Map<string, string>();

function hashLookupToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function maskPhoneNumber(phoneNumber: string): string {
  const domestic = `0${phoneNumber.replace(/\D/g, "").slice(2)}`;
  return `${domestic.slice(0, 3)}-****-${domestic.slice(-4)}`;
}

function invalidateOnsiteLink(entryId: string): void {
  for (const [notificationId, notification] of onsiteNotifications) {
    if (notification.entryId !== entryId) continue;
    onsiteLookupTokens.delete(hashLookupToken(notification.lookupToken));
    onsiteNotifications.delete(notificationId);
  }
}

export function resetMockQueueStore(): void {
  entries = createInitialEntries();
  queueStatus = "open";
  todayInputMode = "categorized";
  nextDayInputMode = "categorized";
  todayCategories = cloneCategories(defaultPatientCategories);
  nextDayCategories = cloneCategories(defaultPatientCategories);
  onsiteNotifications = new Map();
  onsiteLookupTokens = new Map();
}

export function getPatientConfig() {
  return { inputMode: todayInputMode, categories: cloneCategories(todayCategories), queueStatus };
}

export function getPatientWaiting(): QueuePosition | null {
  return (
    calculateQueuePositions(entries).find(({ entry }) => entry.id === PATIENT_WAITING_ID) ?? null
  );
}

export function registerRemoteWaiting(input: PatientRegistrationInput): QueuePosition {
  const entry = createEntry(
    PATIENT_WAITING_ID,
    "17",
    "remote",
    input,
    "remote_waiting",
    currentTime(),
    todayCategories,
  );
  entries = [...entries.filter(({ id }) => id !== PATIENT_WAITING_ID), entry];
  return getPatientWaiting()!;
}

export function deferPatientWaiting(): QueuePosition | null {
  const target = entries.find(({ id }) => id === PATIENT_WAITING_ID);
  if (
    !target ||
    target.deferred ||
    !["remote_waiting", "entry_requested"].includes(target.status)
  ) {
    return getPatientWaiting();
  }
  entries = [
    ...entries.filter(({ id }) => id !== PATIENT_WAITING_ID),
    { ...target, status: "remote_waiting", deferred: true },
  ];
  return getPatientWaiting();
}

export function cancelPatientWaiting(): QueuePosition | null {
  changeWaitingStatus(PATIENT_WAITING_ID, "cancelled");
  return getPatientWaiting();
}

export function getStaffQueueState(): MockStaffQueueState {
  return {
    entries,
    positions: calculateQueuePositions(entries),
    queueDate: "2026-07-15",
    queueStatus,
    todayInputMode,
    nextDayInputMode,
    todayCategories: cloneCategories(todayCategories),
    nextDayCategories: cloneCategories(nextDayCategories),
  };
}

export function addOnsiteWaiting(
  input: OnsiteWaitingRegistrationInput,
): MockOnsiteRegistrationResult {
  const sequence = 18 + entries.filter(({ id }) => id.startsWith("onsite-new-")).length;
  const entryId = `onsite-new-${sequence}`;
  entries = [
    ...entries,
    createEntry(
      entryId,
      String(sequence),
      "onsite",
      input.registration,
      "onsite_waiting",
      currentTime(),
      todayCategories,
    ),
  ];
  const notificationId = `notification-onsite-${sequence}`;
  const lookupToken = randomBytes(24).toString("base64url");
  const recipientPhoneMasked = maskPhoneNumber(input.phoneNumber);
  onsiteNotifications.set(notificationId, {
    id: notificationId,
    entryId,
    lookupToken,
    recipientPhoneMasked,
  });
  onsiteLookupTokens.set(hashLookupToken(lookupToken), entryId);

  const notification: MockNotificationReceipt = {
    id: notificationId,
    recipientPhoneMasked,
    templateCode: "onsite_registered",
    openPath: `/api/mock/notifications/${notificationId}/open`,
  };
  return { queue: getStaffQueueState(), notification };
}

export function getOnsiteWaitingStatus(lookupToken: string): MockOnsiteWaitingStatus | null {
  const entryId = onsiteLookupTokens.get(hashLookupToken(lookupToken));
  if (!entryId) return null;
  const waiting = calculateQueuePositions(entries).find(({ entry }) => entry.id === entryId);
  if (!waiting || ["called", "cancelled"].includes(waiting.entry.status)) return null;
  return { hospital: MOCK_HOSPITAL, waiting };
}

export function getMockNotificationLookupToken(notificationId: string): string | null {
  const notification = onsiteNotifications.get(notificationId);
  if (!notification) return null;
  return onsiteLookupTokens.has(hashLookupToken(notification.lookupToken))
    ? notification.lookupToken
    : null;
}

export function changeWaitingStatus(id: string, status: WaitingStatus): MockStaffQueueState {
  if (["called", "cancelled"].includes(status)) invalidateOnsiteLink(id);
  entries = applyEntryRequestPolicy(
    entries.map((entry) => (entry.id === id ? { ...entry, status, heldFrom: undefined } : entry)),
  );
  return getStaffQueueState();
}

export function holdWaiting(id: string): MockStaffQueueState {
  entries = applyEntryRequestPolicy(
    entries.map((entry) =>
      entry.id === id ? { ...entry, heldFrom: entry.status, status: "held" } : entry,
    ),
  );
  return getStaffQueueState();
}

export function restoreWaiting(id: string): MockStaffQueueState {
  const target = entries.find((entry) => entry.id === id);
  if (!target) return getStaffQueueState();
  const restored: MockQueueEntry = {
    ...target,
    status: target.heldFrom ?? (target.source === "remote" ? "remote_waiting" : "onsite_waiting"),
    heldFrom: undefined,
  };
  entries = [...entries.filter((entry) => entry.id !== id), restored];
  return getStaffQueueState();
}

export function changeQueueStatus(status: QueueStatus): MockStaffQueueState {
  queueStatus = status;
  return getStaffQueueState();
}

export function saveNextDayCategories(
  inputMode: PatientInputMode,
  categories: PatientCategoryDefinition[],
): MockStaffQueueState {
  nextDayInputMode = inputMode;
  nextDayCategories = cloneCategories(categories);
  return getStaffQueueState();
}
