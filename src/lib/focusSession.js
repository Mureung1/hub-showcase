export const FOCUS_SESSION_KEY = "jansori.focusSession.v1";
export const MAX_FOCUS_SESSION_AGE_MS = 12 * 60 * 60 * 1000;
export const FUTURE_START_TOLERANCE_MS = 60 * 1000;

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

export function isValidFocusSession(session, now = Date.now()) {
  if (!isPlainObject(session)) return false;
  if (session.version !== 1) return false;
  if (typeof session.taskId !== "string" || session.taskId.trim() === "") {
    return false;
  }
  if (
    !Number.isFinite(session.startedAt) ||
    !Number.isInteger(session.startedAt) ||
    session.startedAt <= 0
  ) {
    return false;
  }
  if (
    session.entryLevel !== null &&
    (!Number.isInteger(session.entryLevel) ||
      session.entryLevel < 0 ||
      session.entryLevel > 4)
  ) {
    return false;
  }
  if (
    session.microTask !== null &&
    typeof session.microTask !== "string"
  ) {
    return false;
  }

  if (session.startedAt - now > FUTURE_START_TOLERANCE_MS) return false;
  if (now - session.startedAt > MAX_FOCUS_SESSION_AGE_MS) return false;
  return true;
}

export function createFocusSession({
  taskId,
  startedAt = Date.now(),
  entryLevel = null,
  microTask = null,
}) {
  const session = {
    version: 1,
    taskId,
    startedAt,
    entryLevel,
    microTask,
  };
  if (!isValidFocusSession(session, startedAt)) {
    throw new TypeError("유효하지 않은 Focus 세션입니다.");
  }
  return session;
}

export function saveFocusSession(session, storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function removeFocusSession(storage) {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.removeItem(FOCUS_SESSION_KEY);
  } catch {
    // Storage 접근이 차단된 환경에서는 제거할 값도 사용할 수 없으므로 조용히 끝낸다.
  }
}

export function readFocusSession({ storage, now = Date.now() } = {}) {
  const target = resolveStorage(storage);
  if (!target) return null;

  let raw;
  try {
    raw = target.getItem(FOCUS_SESSION_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const session = JSON.parse(raw);
    if (!isValidFocusSession(session, now)) {
      removeFocusSession(target);
      return null;
    }
    return session;
  } catch {
    removeFocusSession(target);
    return null;
  }
}

export function getRestorableFocusSession(
  tasks,
  { storage, now = Date.now() } = {},
) {
  const session = readFocusSession({ storage, now });
  if (!session) return null;

  const task = tasks.find((candidate) => candidate.id === session.taskId);
  if (!task || task.status !== "active") {
    removeFocusSession(storage);
    return null;
  }

  return { session, task };
}
