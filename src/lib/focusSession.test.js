import { beforeEach, describe, expect, it } from "vitest";
import {
  FOCUS_SESSION_KEY,
  FUTURE_START_TOLERANCE_MS,
  LEGACY_FOCUS_SESSION_KEY,
  MAX_FOCUS_SESSION_AGE_MS,
  createFocusSession,
  getRestorableFocusSession,
  readFocusSession,
  removeFocusSession,
  saveFocusSession,
} from "./focusSession.js";

const NOW = 1_800_000_000_000;

function activeTask(id = "task-1") {
  return { id, title: "테스트 과제", status: "active" };
}

function createInterventionSession(overrides = {}) {
  return createFocusSession({
    taskId: "task-1",
    startedAt: NOW,
    entryMode: "intervention",
    entryLevel: 2,
    journeyLevel: 2,
    microTask: "첫 문장 쓰기",
    generationSource: "gemini",
    memoryEvidence: null,
    ...overrides,
  });
}

describe("focusSession v2", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("승인된 v2 개입 컨텍스트를 생성하고 저장한다", () => {
    const session = createInterventionSession();

    expect(saveFocusSession(session)).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual({
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "intervention",
      entryLevel: 2,
      journeyLevel: 2,
      microTask: "첫 문장 쓰기",
      generationSource: "gemini",
      memoryEvidence: null,
    });
  });

  it("카드 직접 시작은 direct/none 컨텍스트를 기본값으로 만든다", () => {
    expect(
      createFocusSession({ taskId: "task-1", startedAt: NOW }),
    ).toEqual({
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "direct",
      entryLevel: null,
      journeyLevel: 0,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    });
  });

  it("신규 세션은 유효한 Journey 레벨만 허용한다", () => {
    expect(() =>
      createFocusSession({
        taskId: "task-1",
        startedAt: NOW,
        journeyLevel: 5,
      }),
    ).toThrow("Journey 레벨");

    expect(() =>
      createInterventionSession({ journeyLevel: 3 }),
    ).toThrow("진입 레벨과 같아야");
  });

  it("journeyLevel이 없는 기존 v2 세션을 복구한다", () => {
    const stored = {
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "direct",
      entryLevel: null,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    };
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(stored));

    expect(readFocusSession({ now: NOW })).toEqual(stored);
  });

  it("유효하지 않은 기존 journeyLevel도 세션 복구를 막지 않는다", () => {
    const stored = {
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "direct",
      entryLevel: null,
      journeyLevel: 9,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    };
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(stored));

    expect(readFocusSession({ now: NOW })).toEqual(stored);
  });

  it("신규 v2 생성 함수는 unknown 출처를 거부한다", () => {
    expect(() =>
      createInterventionSession({ generationSource: "unknown" }),
    ).toThrow("unknown 출처");
  });

  it("공개 저장 함수도 수동으로 만든 unknown v2 세션을 거부한다", () => {
    const session = {
      ...createInterventionSession(),
      generationSource: "unknown",
    };

    expect(saveFocusSession(session)).toBe(false);
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("history_reuse 신규 세션은 sourceDoneEventId 근거를 요구한다", () => {
    expect(() =>
      createInterventionSession({ generationSource: "history_reuse" }),
    ).toThrow("과거 완료 근거");

    expect(
      createInterventionSession({
        generationSource: "history_reuse",
        memoryEvidence: { sourceDoneEventId: "done-event-1" },
      }),
    ).toMatchObject({
      generationSource: "history_reuse",
      memoryEvidence: { sourceDoneEventId: "done-event-1" },
    });
  });

  it("손상된 v2 JSON을 제거한다", () => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, "{broken");

    expect(readFocusSession({ now: NOW })).toBeNull();
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it.each([
    {},
    {
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "invalid",
      entryLevel: null,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    },
    {
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "direct",
      entryLevel: null,
      microTask: null,
      generationSource: "invalid",
      memoryEvidence: null,
    },
    {
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "intervention",
      entryLevel: 2,
      microTask: "첫 문장 쓰기",
      generationSource: "gemini",
      memoryEvidence: { sourceTaskTitle: "위조된 제목" },
    },
  ])("필수 필드가 없거나 잘못된 v2 세션을 제거한다", (value) => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(value));

    expect(readFocusSession({ now: NOW })).toBeNull();
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("미래 1분 경계는 허용하고 그 이후는 제거한다", () => {
    const boundary = createFocusSession({
      taskId: "task-1",
      startedAt: NOW + FUTURE_START_TOLERANCE_MS,
    });
    saveFocusSession(boundary);
    expect(readFocusSession({ now: NOW })).toEqual(boundary);

    sessionStorage.setItem(
      FOCUS_SESSION_KEY,
      JSON.stringify({
        ...boundary,
        startedAt: NOW + FUTURE_START_TOLERANCE_MS + 1,
      }),
    );
    expect(readFocusSession({ now: NOW })).toBeNull();
  });

  it("12시간 경계는 허용하고 더 오래된 세션은 제거한다", () => {
    const boundary = createFocusSession({
      taskId: "task-1",
      startedAt: NOW - MAX_FOCUS_SESSION_AGE_MS,
    });
    saveFocusSession(boundary);
    expect(readFocusSession({ now: NOW })).toEqual(boundary);

    sessionStorage.setItem(
      FOCUS_SESSION_KEY,
      JSON.stringify({
        ...boundary,
        startedAt: NOW - MAX_FOCUS_SESSION_AGE_MS - 1,
      }),
    );
    expect(readFocusSession({ now: NOW })).toBeNull();
  });

  it("v1 개입 세션을 unknown 출처의 v2로 이관한다", () => {
    const legacy = {
      version: 1,
      taskId: "task-1",
      startedAt: NOW,
      entryLevel: 2,
      microTask: "기존 첫 행동",
    };
    sessionStorage.setItem(LEGACY_FOCUS_SESSION_KEY, JSON.stringify(legacy));

    const migrated = readFocusSession({ now: NOW });

    expect(migrated).toEqual({
      version: 2,
      taskId: "task-1",
      startedAt: NOW,
      entryMode: "intervention",
      entryLevel: 2,
      microTask: "기존 첫 행동",
      generationSource: "unknown",
      memoryEvidence: null,
    });
    expect(sessionStorage.getItem(LEGACY_FOCUS_SESSION_KEY)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual(
      migrated,
    );
  });

  it("v1 직접 시작 세션을 direct/none으로 이관한다", () => {
    sessionStorage.setItem(
      LEGACY_FOCUS_SESSION_KEY,
      JSON.stringify({
        version: 1,
        taskId: "task-1",
        startedAt: NOW,
        entryLevel: null,
        microTask: null,
      }),
    );

    expect(readFocusSession({ now: NOW })).toMatchObject({
      version: 2,
      entryMode: "direct",
      entryLevel: null,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    });
  });

  it("유효한 v2가 있으면 우선 복구하고 남은 v1 키를 제거한다", () => {
    const current = createInterventionSession();
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(current));
    sessionStorage.setItem(
      LEGACY_FOCUS_SESSION_KEY,
      JSON.stringify({
        version: 1,
        taskId: "old-task",
        startedAt: NOW,
        entryLevel: null,
        microTask: null,
      }),
    );

    expect(readFocusSession({ now: NOW })).toEqual(current);
    expect(sessionStorage.getItem(LEGACY_FOCUS_SESSION_KEY)).toBeNull();
  });

  it("세션 제거 시 v1·v2 키를 함께 제거한다", () => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, "{}");
    sessionStorage.setItem(LEGACY_FOCUS_SESSION_KEY, "{}");

    removeFocusSession();

    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(LEGACY_FOCUS_SESSION_KEY)).toBeNull();
  });

  it.each([
    { label: "deleted", tasks: [] },
    { label: "done", tasks: [{ ...activeTask(), status: "done" }] },
    { label: "waiting", tasks: [{ ...activeTask(), status: "waiting" }] },
  ])("복구 시 $label Task를 거부한다", ({ tasks }) => {
    const session = createInterventionSession();
    saveFocusSession(session);

    expect(getRestorableFocusSession(tasks, { now: NOW })).toBeNull();
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("현재 active Task와 저장된 v2 세션을 함께 복구한다", () => {
    const session = createInterventionSession();
    const task = activeTask();
    saveFocusSession(session);

    expect(getRestorableFocusSession([task], { now: NOW })).toEqual({
      session,
      task,
    });
  });
});
