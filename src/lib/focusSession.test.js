import { beforeEach, describe, expect, it } from "vitest";
import {
  FOCUS_SESSION_KEY,
  FUTURE_START_TOLERANCE_MS,
  MAX_FOCUS_SESSION_AGE_MS,
  createFocusSession,
  getRestorableFocusSession,
  readFocusSession,
  saveFocusSession,
} from "./focusSession.js";

const NOW = 1_800_000_000_000;

function activeTask(id = "task-1") {
  return { id, title: "테스트 과제", status: "active" };
}

describe("focusSession", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates and stores only the approved session fields", () => {
    const session = createFocusSession({
      taskId: "task-1",
      startedAt: NOW,
      entryLevel: 2,
      microTask: "첫 문장 쓰기",
    });

    expect(saveFocusSession(session)).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual({
      version: 1,
      taskId: "task-1",
      startedAt: NOW,
      entryLevel: 2,
      microTask: "첫 문장 쓰기",
    });
  });

  it("removes invalid JSON", () => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, "{broken");

    expect(readFocusSession({ now: NOW })).toBeNull();
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it.each([
    {},
    { version: 1, startedAt: NOW, entryLevel: null, microTask: null },
    {
      version: 1,
      taskId: "task-1",
      entryLevel: null,
      microTask: null,
    },
    {
      version: 1,
      taskId: "task-1",
      startedAt: NOW,
      entryLevel: 5,
      microTask: null,
    },
    {
      version: 1,
      taskId: "task-1",
      startedAt: NOW,
      entryLevel: null,
      microTask: 123,
    },
  ])("removes a session with invalid or missing fields", (value) => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(value));

    expect(readFocusSession({ now: NOW })).toBeNull();
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("accepts up to one minute in the future and rejects anything later", () => {
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
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("accepts the 12-hour boundary and removes an older session", () => {
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
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it.each([
    { label: "deleted", tasks: [] },
    { label: "done", tasks: [{ ...activeTask(), status: "done" }] },
    { label: "waiting", tasks: [{ ...activeTask(), status: "waiting" }] },
  ])("rejects a $label Task during restoration", ({ tasks }) => {
    const session = createFocusSession({
      taskId: "task-1",
      startedAt: NOW,
    });
    saveFocusSession(session);

    expect(getRestorableFocusSession(tasks, { now: NOW })).toBeNull();
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("returns both the stored session and its current active Task", () => {
    const session = createFocusSession({
      taskId: "task-1",
      startedAt: NOW,
      entryLevel: 2,
      microTask: "첫 문장 쓰기",
    });
    const task = activeTask();
    saveFocusSession(session);

    expect(getRestorableFocusSession([task], { now: NOW })).toEqual({
      session,
      task,
    });
  });
});
