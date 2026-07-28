function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

export function createPersistentAuthStorageAdapter(browserStorage) {
  const memoryStorage = createMemoryStorage();

  return {
    getItem(key) {
      if (!browserStorage) return memoryStorage.getItem(key);
      try {
        return browserStorage.getItem(key);
      } catch {
        return memoryStorage.getItem(key);
      }
    },
    removeItem(key) {
      if (browserStorage) {
        try {
          browserStorage.removeItem(key);
        } catch {
          // Clear the in-memory fallback below.
        }
      }
      memoryStorage.removeItem(key);
    },
    setItem(key, value) {
      if (!browserStorage) {
        memoryStorage.setItem(key, value);
        return;
      }
      try {
        browserStorage.setItem(key, value);
      } catch {
        memoryStorage.setItem(key, value);
      }
    },
  };
}

export function getPersistentAuthStorage(browserStorage) {
  if (browserStorage !== undefined) {
    return createPersistentAuthStorageAdapter(browserStorage);
  }

  try {
    return createPersistentAuthStorageAdapter(globalThis.window?.localStorage);
  } catch {
    return createPersistentAuthStorageAdapter(null);
  }
}
