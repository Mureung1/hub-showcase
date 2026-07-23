export const createTtlCache = ({ ttlMs, now = () => Date.now() } = {}) => {
  const store = new Map();
  const pending = new Map();
  const normalizedTtlMs = Number(ttlMs || 0);

  const get = (key) => {
    const entry = store.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= now()) {
      store.delete(key);
      return undefined;
    }

    return entry.value;
  };

  const set = (key, value) => {
    if (normalizedTtlMs <= 0) {
      return value;
    }

    store.set(key, {
      value,
      expiresAt: now() + normalizedTtlMs,
    });

    return value;
  };

  const getOrSet = async (key, loader) => {
    const cachedValue = get(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    if (pending.has(key)) {
      return pending.get(key);
    }

    const promise = Promise.resolve()
      .then(loader)
      .then((value) => set(key, value))
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, promise);
    return promise;
  };

  return {
    get,
    set,
    getOrSet,
    clear: () => {
      store.clear();
      pending.clear();
    },
    size: () => store.size,
  };
};
