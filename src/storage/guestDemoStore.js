const GUEST_DEMO_PREFIX = "uniradar.guest-demo";
const SAVED_ANALYSES_KEY = "saved-analyses";

function getStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function getKey(key) {
  return `${GUEST_DEMO_PREFIX}:${key}`;
}

export const guestDemoStorage = {
  getItem(key) {
    return getStorage()?.getItem(getKey(key)) ?? null;
  },
  removeItem(key) {
    getStorage()?.removeItem(getKey(key));
  },
  setItem(key, value) {
    getStorage()?.setItem(getKey(key), value);
  },
};

export function readGuestDemoSavedAnalyses(storage = guestDemoStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(SAVED_ANALYSES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestDemoAnalysis(analysis, storage = guestDemoStorage) {
  const storageId = `guest:${analysis.opportunity.sourceUrl || analysis.id}`;
  const item = {
    ...analysis,
    persistedAt: new Date().toISOString(),
    storageId,
  };
  const nextItems = [
    item,
    ...readGuestDemoSavedAnalyses(storage).filter((current) => current.storageId !== storageId),
  ].slice(0, 30);
  storage?.setItem(SAVED_ANALYSES_KEY, JSON.stringify(nextItems));
  return item;
}

export function deleteGuestDemoAnalysis(storageId, storage = guestDemoStorage) {
  const nextItems = readGuestDemoSavedAnalyses(storage)
    .filter((item) => item.storageId !== storageId);
  storage?.setItem(SAVED_ANALYSES_KEY, JSON.stringify(nextItems));
}
