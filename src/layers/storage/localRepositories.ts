export interface LocalRepository<T> {
  get(): T;
  set(value: T): void;
  update(updater: (value: T) => T): T;
  reset(): void;
}

export function createLocalRepository<T>(key: string, seed: T): LocalRepository<T> {
  const canUseStorage = () => typeof window !== "undefined" && "localStorage" in window;

  return {
    get() {
      if (!canUseStorage()) return seed;
      const raw = window.localStorage.getItem(key);
      if (!raw) return seed;

      try {
        return JSON.parse(raw) as T;
      } catch {
        return seed;
      }
    },
    set(value) {
      if (!canUseStorage()) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    update(updater) {
      const next = updater(this.get());
      this.set(next);
      return next;
    },
    reset() {
      if (!canUseStorage()) return;
      window.localStorage.removeItem(key);
    },
  };
}
