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

export function createSessionStorageAdapter(browserStorage) {
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

export function getAuthSessionStorage() {
  try {
    return createSessionStorageAdapter(globalThis.window?.sessionStorage);
  } catch {
    return createSessionStorageAdapter(null);
  }
}
export function clearLegacyLocalAuthSession(supabaseUrl, localStorage) {
  if (!supabaseUrl || !localStorage) return;
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    if (projectRef) localStorage.removeItem(`sb-${projectRef}-auth-token`);
  } catch {
    // Ignore unavailable storage or malformed configuration.
  }
}
