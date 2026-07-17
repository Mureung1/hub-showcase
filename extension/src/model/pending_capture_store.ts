const STORAGE_PREFIX = 'amadda.pending-capture.';

export type PendingCaptureTarget = {
  insightId: string;
  title: string;
};

type ChromeStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  remove(key: string): Promise<void>;
  set(items: Record<string, unknown>): Promise<void>;
};

export type PendingCaptureStore = {
  get(notificationId: string): Promise<PendingCaptureTarget | null>;
  remove(notificationId: string): Promise<void>;
  save(notificationId: string, target: PendingCaptureTarget): Promise<void>;
};

export function createPendingCaptureStore(
  area: ChromeStorageArea
): PendingCaptureStore {
  return {
    async get(notificationId) {
      const key = getStorageKey(notificationId);
      const values = await area.get(key);
      const value = values[key];

      return isPendingCaptureTarget(value) ? value : null;
    },
    async remove(notificationId) {
      await area.remove(getStorageKey(notificationId));
    },
    async save(notificationId, target) {
      await area.set({ [getStorageKey(notificationId)]: target });
    },
  };
}

export function getCaptureNotificationId(insightId: string) {
  return `capture:${insightId}`;
}

function getStorageKey(notificationId: string) {
  return `${STORAGE_PREFIX}${notificationId}`;
}

function isPendingCaptureTarget(value: unknown): value is PendingCaptureTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    'insightId' in value &&
    typeof value.insightId === 'string' &&
    'title' in value &&
    typeof value.title === 'string'
  );
}
