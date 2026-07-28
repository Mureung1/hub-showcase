export const FOCUS_SESSION_KEY = "jansori.focusSession.v2";
export const LEGACY_FOCUS_SESSION_KEY = "jansori.focusSession.v1";
export const MAX_FOCUS_SESSION_AGE_MS = 12 * 60 * 60 * 1000;
export const FUTURE_START_TOLERANCE_MS = 60 * 1000;

const ENTRY_MODES = new Set(["direct", "intervention"]);
const GENERATION_SOURCES = new Set([
  "none",
  "gemini",
  "rule_based",
  "history_reuse",
  "unknown",
]);
const NEW_SESSION_GENERATION_SOURCES = new Set([
  "none",
  "gemini",
  "rule_based",
  "history_reuse",
]);

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

function hasValidTaskIdAndTime(session, now) {
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
  if (session.startedAt - now > FUTURE_START_TOLERANCE_MS) return false;
  if (now - session.startedAt > MAX_FOCUS_SESSION_AGE_MS) return false;
  return true;
}

function isValidEntryLevel(entryLevel) {
  return (
    entryLevel === null ||
    (Number.isInteger(entryLevel) && entryLevel >= 0 && entryLevel <= 4)
  );
}

function isValidJourneyLevel(journeyLevel) {
  return (
    Number.isInteger(journeyLevel) &&
    journeyLevel >= 0 &&
    journeyLevel <= 4
  );
}

function isValidMicroTask(microTask) {
  return microTask === null || typeof microTask === "string";
}

function isValidMemoryEvidence(memoryEvidence) {
  if (memoryEvidence === null) return true;
  if (!isPlainObject(memoryEvidence)) return false;
  const keys = Object.keys(memoryEvidence);
  return (
    keys.length === 1 &&
    keys[0] === "sourceDoneEventId" &&
    typeof memoryEvidence.sourceDoneEventId === "string" &&
    memoryEvidence.sourceDoneEventId.trim().length > 0 &&
    memoryEvidence.sourceDoneEventId.trim().length <= 128
  );
}

// 저장된 v2에는 v1 이관 과정에서만 생기는 unknown을 허용한다.
// 신규 세션은 createFocusSession의 더 엄격한 검증을 반드시 거친다.
export function isValidFocusSession(session, now = Date.now()) {
  if (!isPlainObject(session) || session.version !== 2) return false;
  if (!hasValidTaskIdAndTime(session, now)) return false;
  if (!ENTRY_MODES.has(session.entryMode)) return false;
  if (!isValidEntryLevel(session.entryLevel)) return false;
  if (!isValidMicroTask(session.microTask)) return false;
  if (!GENERATION_SOURCES.has(session.generationSource)) return false;
  return isValidMemoryEvidence(session.memoryEvidence);
}

function isValidLegacyFocusSession(session, now) {
  if (!isPlainObject(session) || session.version !== 1) return false;
  if (!hasValidTaskIdAndTime(session, now)) return false;
  return (
    isValidEntryLevel(session.entryLevel) &&
    isValidMicroTask(session.microTask)
  );
}

function assertValidNewContext(session) {
  if (!NEW_SESSION_GENERATION_SOURCES.has(session.generationSource)) {
    throw new TypeError("신규 Focus 세션에는 unknown 출처를 사용할 수 없습니다.");
  }

  if (!isValidJourneyLevel(session.journeyLevel)) {
    throw new TypeError("신규 Focus 세션의 Journey 레벨이 올바르지 않습니다.");
  }

  if (session.entryMode === "direct") {
    if (
      session.entryLevel !== null ||
      session.microTask !== null ||
      session.generationSource !== "none" ||
      session.memoryEvidence !== null
    ) {
      throw new TypeError("직접 시작 Focus 세션의 컨텍스트가 올바르지 않습니다.");
    }
    return;
  }

  if (
    session.entryMode !== "intervention" ||
    !Number.isInteger(session.entryLevel) ||
    session.entryLevel < 1 ||
    session.entryLevel > 4
  ) {
    throw new TypeError("개입 시작 Focus 세션의 레벨이 올바르지 않습니다.");
  }

  if (session.journeyLevel !== session.entryLevel) {
    throw new TypeError(
      "개입 시작 Focus 세션의 Journey 레벨은 진입 레벨과 같아야 합니다.",
    );
  }

  if (session.entryLevel === 1) {
    if (
      session.microTask !== null ||
      session.generationSource !== "none" ||
      session.memoryEvidence !== null
    ) {
      throw new TypeError("Lv.1 Focus 세션의 컨텍스트가 올바르지 않습니다.");
    }
    return;
  }

  if (
    typeof session.microTask !== "string" ||
    session.microTask.trim() === "" ||
    session.generationSource === "none"
  ) {
    throw new TypeError("Lv.2~Lv.4 Focus 세션에는 실행 action이 필요합니다.");
  }

  if (
    session.generationSource === "history_reuse" &&
    session.memoryEvidence === null
  ) {
    throw new TypeError("history_reuse에는 과거 완료 근거가 필요합니다.");
  }
}

export function createFocusSession({
  taskId,
  startedAt = Date.now(),
  entryMode = "direct",
  entryLevel = null,
  journeyLevel = 0,
  microTask = null,
  generationSource = "none",
  memoryEvidence = null,
}) {
  const session = {
    version: 2,
    taskId,
    startedAt,
    entryMode,
    entryLevel,
    journeyLevel,
    microTask,
    generationSource,
    memoryEvidence,
  };
  if (!isValidFocusSession(session, startedAt)) {
    throw new TypeError("유효하지 않은 Focus 세션입니다.");
  }
  assertValidNewContext(session);
  return session;
}

function writeFocusSession(session, target, allowLegacyUnknown = false) {
  if (
    !target ||
    !isValidFocusSession(session, session.startedAt) ||
    (!allowLegacyUnknown && session.generationSource === "unknown")
  ) {
    return false;
  }
  try {
    target.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function saveFocusSession(session, storage) {
  return writeFocusSession(session, resolveStorage(storage));
}

function removeStorageKey(target, key) {
  try {
    target.removeItem(key);
  } catch {
    // Storage 접근이 차단된 환경에서는 제거할 값도 사용할 수 없으므로 조용히 끝낸다.
  }
}

export function removeFocusSession(storage) {
  const target = resolveStorage(storage);
  if (!target) return;
  removeStorageKey(target, FOCUS_SESSION_KEY);
  removeStorageKey(target, LEGACY_FOCUS_SESSION_KEY);
}

function parseStoredValue(target, key) {
  let raw;
  try {
    raw = target.getItem(key);
  } catch {
    return { found: false, value: null };
  }
  if (raw === null) return { found: false, value: null };

  try {
    return { found: true, value: JSON.parse(raw) };
  } catch {
    removeStorageKey(target, key);
    return { found: true, value: null };
  }
}

function migrateLegacyFocusSession(session) {
  return {
    version: 2,
    taskId: session.taskId,
    startedAt: session.startedAt,
    entryMode: session.entryLevel === null ? "direct" : "intervention",
    entryLevel: session.entryLevel,
    microTask: session.microTask,
    generationSource: session.microTask === null ? "none" : "unknown",
    memoryEvidence: null,
  };
}

export function readFocusSession({ storage, now = Date.now() } = {}) {
  const target = resolveStorage(storage);
  if (!target) return null;

  const current = parseStoredValue(target, FOCUS_SESSION_KEY);
  if (current.value && isValidFocusSession(current.value, now)) {
    removeStorageKey(target, LEGACY_FOCUS_SESSION_KEY);
    return current.value;
  }
  if (current.found) removeStorageKey(target, FOCUS_SESSION_KEY);

  const legacy = parseStoredValue(target, LEGACY_FOCUS_SESSION_KEY);
  if (!legacy.found) return null;
  if (!legacy.value || !isValidLegacyFocusSession(legacy.value, now)) {
    removeStorageKey(target, LEGACY_FOCUS_SESSION_KEY);
    return null;
  }

  const migrated = migrateLegacyFocusSession(legacy.value);
  if (!isValidFocusSession(migrated, now)) {
    removeStorageKey(target, LEGACY_FOCUS_SESSION_KEY);
    return null;
  }

  if (writeFocusSession(migrated, target, true)) {
    removeStorageKey(target, LEGACY_FOCUS_SESSION_KEY);
  }
  return migrated;
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
