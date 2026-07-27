import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage.jsx";
import { apiFetch } from "../lib/api";
import {
  FOCUS_SESSION_KEY,
  LEGACY_FOCUS_SESSION_KEY,
  createFocusSession,
} from "../lib/focusSession.js";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("./TaskCard", () => ({
  default: ({ task, onClick }) => (
    <button data-testid={`task-${task.id}`} onClick={onClick}>
      {task.title}
    </button>
  ),
}));

vi.mock("./EmptyState", () => ({
  default: () => <div data-testid="empty-state" />,
}));

vi.mock("./NudgeModal", () => ({
  default: ({
    task,
    checkpointLevel,
    onClose,
    onStart,
    onReconfirmReason,
    onLv2ActionResolved,
    lv2MicroTask,
    lv3ReasonChanged,
  }) => (
    <div
      data-testid="nudge-modal"
      data-level={task.level}
      data-checkpoint-level={checkpointLevel ?? ""}
      data-reason={task.reason}
      data-custom-reason={task.customReasonText ?? ""}
      data-lv2-micro-task={lv2MicroTask ?? ""}
      data-reason-changed={
        lv3ReasonChanged === null ? "" : String(lv3ReasonChanged)
      }
    >
      <span>{task.id}</span>
      <input aria-label="reason-input" />
      <button onClick={onClose}>close-modal</button>
      <button
        onClick={() =>
          onReconfirmReason?.("custom", "방금 저장한 이유")
        }
      >
        reconfirm-custom
      </button>
      <button
        onClick={() =>
          onReconfirmReason?.(task.reason, task.customReasonText ?? null)
        }
      >
        reconfirm-same
      </button>
      <button
        onClick={() =>
          onLv2ActionResolved?.(task.id, "resolved Lv2 action")
        }
      >
        resolve-lv2-action
      </button>
      <button
        onClick={() =>
          onStart({
            entryMode: "intervention",
            entryLevel: task.level,
            journeyLevel: task.level,
            microTask: task.level === 1 ? null : "open one paragraph",
            generationSource: task.level === 1 ? "none" : "rule_based",
            memoryEvidence: null,
          })
        }
      >
        start-focus
      </button>
    </div>
  ),
}));

vi.mock("./FocusMode", () => ({
  default: ({
    taskId,
    startedAt,
    entryMode,
    microTask,
    entryLevel,
    journeyLevel,
    generationSource,
    memoryEvidence,
    onSessionCompleted,
    onStop,
  }) => (
    <div
      data-testid="focus-mode"
      data-task-id={taskId}
      data-started-at={startedAt ?? ""}
      data-entry-mode={entryMode ?? ""}
      data-micro-task={microTask ?? ""}
      data-entry-level={entryLevel ?? ""}
      data-journey-level={journeyLevel ?? ""}
      data-generation-source={generationSource ?? ""}
      data-memory-evidence={
        memoryEvidence ? JSON.stringify(memoryEvidence) : ""
      }
    >
      <button onClick={() => onSessionCompleted?.()}>complete-session</button>
      <button onClick={() => onStop?.()}>stop-session</button>
    </div>
  ),
}));

const NOW = new Date("2026-07-23T12:00:00.000Z");

function makeTask({
  id,
  level = 1,
  deadline = "2026-07-22T12:00:00.000Z",
  status = "active",
}) {
  return {
    id,
    title: `task ${id}`,
    type: "assignment",
    status,
    level,
    skipCount: level,
    reason: "hard",
    startTime: "2026-07-23T09:00:00.000Z",
    deadline,
    createdAt: "2026-07-23T08:00:00.000Z",
  };
}

function setupApi(
  initialTasks,
  {
    failNotificationOnceFor = null,
    failReasonOnceFor = null,
    streak = 0,
  } = {},
) {
  let serverTasks = initialTasks.map((task) => ({ ...task }));
  const notificationCalls = [];
  let taskListCalls = 0;
  let failed = false;
  let reasonFailed = false;

  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === "/api/tasks" && !options.method) {
      taskListCalls += 1;
      return { data: serverTasks.map((task) => ({ ...task })), streak };
    }

    const eventMatch = path.match(/^\/api\/tasks\/([^/]+)\/events$/);
    if (eventMatch && options.method === "POST") {
      const taskId = eventMatch[1];
      const body = JSON.parse(options.body);
      if (body.eventType !== "notification_sent") {
        throw new Error(`Unexpected event: ${body.eventType}`);
      }

      notificationCalls.push(taskId);
      if (taskId === failNotificationOnceFor && !failed) {
        failed = true;
        throw new Error("network failed");
      }

      const current = serverTasks.find((task) => task.id === taskId);
      const updated = {
        ...current,
        level: Math.min(current.level + 1, 4),
        skipCount: current.skipCount + 1,
      };
      serverTasks = serverTasks.map((task) =>
        task.id === taskId ? updated : task,
      );
      return { data: { ...updated } };
    }

    const reasonMatch = path.match(
      /^\/api\/tasks\/([^/]+)\/avoidance-reasons$/,
    );
    if (reasonMatch && options.method === "POST") {
      if (reasonMatch[1] === failReasonOnceFor && !reasonFailed) {
        reasonFailed = true;
        throw new Error("reason save failed");
      }
      const body = JSON.parse(options.body);
      return {
        data: {
          taskId: reasonMatch[1],
          level: body.level,
          reason: body.reason,
          customText: body.customText ?? null,
        },
      };
    }

    throw new Error(`Unexpected API call: ${path}`);
  });

  return {
    callsFor: (taskId) =>
      notificationCalls.filter((calledId) => calledId === taskId).length,
    allCalls: () => [...notificationCalls],
    taskListCalls: () => taskListCalls,
    updateTask: (taskId, updates) => {
      serverTasks = serverTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task,
      );
    },
  };
}

async function renderHome() {
  const result = render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("HomePage response-driven nudge scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    apiFetch.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    { label: "Lv.1", initialLevel: 0, openAfter: 0, blockedFor: 30_000 },
    { label: "Lv.2", initialLevel: 1, openAfter: 3_000, blockedFor: 30_000 },
    { label: "Lv.3", initialLevel: 2, openAfter: 6_000, blockedFor: 30_000 },
    { label: "Lv.4", initialLevel: 3, openAfter: 10_000, blockedFor: 60_000 },
  ])(
    "$label modal pauses further notifications and level changes",
    async ({ initialLevel, openAfter, blockedFor }) => {
      const api = setupApi([makeTask({ id: "a", level: initialLevel })]);
      await renderHome();

      await advance(openAfter);
      expect(screen.getByTestId("nudge-modal")).toBeInTheDocument();
      expect(api.callsFor("a")).toBe(1);

      await advance(blockedFor);
      expect(api.callsFor("a")).toBe(1);
    },
  );

  it("restarts every active task with a full interval from explicit close", async () => {
    const api = setupApi([
      makeTask({
        id: "modal-task",
        level: 1,
        deadline: "2026-07-24T12:00:00.000Z",
      }),
      makeTask({
        id: "other-task",
        level: 1,
        deadline: "2026-07-26T12:00:00.000Z",
      }),
    ]);
    await renderHome();

    await advance(6_000);
    expect(screen.getByTestId("nudge-modal")).toHaveTextContent("modal-task");
    expect(api.callsFor("other-task")).toBe(0);

    await advance(20_000);
    expect(api.callsFor("other-task")).toBe(0);
    fireEvent.click(screen.getByText("close-modal"));

    await advance(9_999);
    expect(api.callsFor("other-task")).toBe(0);
    await advance(1);
    expect(api.callsFor("other-task")).toBe(1);
  });

  it("repeated modal open and close resets another task and can defer it", async () => {
    const api = setupApi([
      makeTask({ id: "repeating-task", level: 0 }),
      makeTask({
        id: "deferred-task",
        level: 1,
        deadline: "2026-07-30T12:00:00.000Z",
      }),
    ]);
    await renderHome();

    await advance(0);
    fireEvent.click(screen.getByText("close-modal"));
    await advance(3_000);
    fireEvent.click(screen.getByText("close-modal"));
    await advance(6_000);
    fireEvent.click(screen.getByText("close-modal"));
    await advance(10_000);

    expect(api.callsFor("repeating-task")).toBe(4);
    expect(api.callsFor("deferred-task")).toBe(0);
    expect(screen.getByTestId("nudge-modal")).toHaveTextContent(
      "repeating-task",
    );
  });

  it("does not reschedule after Focus starts and preserves the Lv.2 session", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();

    await advance(3_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "2",
    );
    fireEvent.click(screen.getByText("start-focus"));

    const focus = screen.getByTestId("focus-mode");
    expect(focus).toHaveAttribute("data-task-id", "a");
    expect(focus).toHaveAttribute("data-entry-mode", "intervention");
    expect(focus).toHaveAttribute("data-micro-task", "open one paragraph");
    expect(focus).toHaveAttribute("data-entry-level", "2");
    expect(focus).toHaveAttribute("data-journey-level", "2");
    expect(focus).toHaveAttribute("data-generation-source", "rule_based");
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual({
      version: 2,
      taskId: "a",
      startedAt: NOW.getTime() + 3_000,
      entryMode: "intervention",
      entryLevel: 2,
      journeyLevel: 2,
      microTask: "open one paragraph",
      generationSource: "rule_based",
      memoryEvidence: null,
    });

    await advance(60_000);
    expect(api.callsFor("a")).toBe(1);
  });

  it.each([1, 2, 3, 4])(
    "stores a direct session with Journey level %s when Focus starts from a Task card",
    async (level) => {
    setupApi([makeTask({ id: "a", level })]);
    await renderHome();

    fireEvent.click(screen.getByTestId("task-a"));

    expect(screen.getByTestId("focus-mode")).toHaveAttribute(
      "data-task-id",
      "a",
    );
    expect(screen.getByTestId("focus-mode")).toHaveAttribute(
      "data-journey-level",
      String(level),
    );
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual({
      version: 2,
      taskId: "a",
      startedAt: NOW.getTime(),
      entryMode: "direct",
      entryLevel: null,
      journeyLevel: level,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    });
    },
  );

  it("removes the stored session when Focus reports completion success", async () => {
    setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();
    fireEvent.click(screen.getByTestId("task-a"));
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).not.toBeNull();

    fireEvent.click(screen.getByText("complete-session"));

    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
    expect(screen.getByTestId("focus-mode")).toBeInTheDocument();
  });

  it("removes the stored session and closes Focus after a successful stop", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();
    fireEvent.click(screen.getByTestId("task-a"));
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).not.toBeNull();

    fireEvent.click(screen.getByText("stop-session"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
    expect(screen.queryByTestId("focus-mode")).not.toBeInTheDocument();
    expect(api.taskListCalls()).toBe(2);
  });

  it("restores a valid active Focus session before scheduling its notification", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    const session = createFocusSession({
      taskId: "a",
      startedAt: NOW.getTime() - 125_000,
      entryMode: "intervention",
      entryLevel: 2,
      journeyLevel: 2,
      microTask: "open one paragraph",
      generationSource: "rule_based",
      memoryEvidence: null,
    });
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));

    await renderHome();

    const focus = screen.getByTestId("focus-mode");
    expect(focus).toHaveAttribute("data-task-id", "a");
    expect(focus).toHaveAttribute(
      "data-started-at",
      String(NOW.getTime() - 125_000),
    );
    expect(focus).toHaveAttribute("data-micro-task", "open one paragraph");
    expect(focus).toHaveAttribute("data-entry-level", "2");
    expect(focus).toHaveAttribute("data-journey-level", "2");
    expect(focus).toHaveAttribute("data-entry-mode", "intervention");
    expect(focus).toHaveAttribute("data-generation-source", "rule_based");

    await advance(60_000);
    expect(api.callsFor("a")).toBe(0);
  });

  it("v1 Focus 세션을 v2 unknown 출처로 이관해 복구한다", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    sessionStorage.setItem(
      LEGACY_FOCUS_SESSION_KEY,
      JSON.stringify({
        version: 1,
        taskId: "a",
        startedAt: NOW.getTime() - 125_000,
        entryLevel: 2,
        microTask: "legacy action",
      }),
    );

    await renderHome();

    const focus = screen.getByTestId("focus-mode");
    expect(focus).toHaveAttribute("data-entry-mode", "intervention");
    expect(focus).toHaveAttribute("data-entry-level", "2");
    expect(focus).toHaveAttribute("data-micro-task", "legacy action");
    expect(focus).toHaveAttribute("data-generation-source", "unknown");
    expect(sessionStorage.getItem(LEGACY_FOCUS_SESSION_KEY)).toBeNull();
    expect(
      JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY)),
    ).toMatchObject({
      version: 2,
      generationSource: "unknown",
      memoryEvidence: null,
    });

    await advance(60_000);
    expect(api.callsFor("a")).toBe(0);
  });

  it("removes corrupted storage and stays on the normal Home screen", async () => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, "{broken");
    setupApi([makeTask({ id: "a", level: 1 })]);

    await renderHome();

    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
    expect(screen.queryByTestId("focus-mode")).not.toBeInTheDocument();
    expect(screen.getByTestId("task-a")).toBeInTheDocument();
  });

  it("does not overwrite a valid session for another active Task", async () => {
    setupApi([
      makeTask({ id: "a", level: 1 }),
      makeTask({ id: "b", level: 1 }),
    ]);
    await renderHome();
    const existing = createFocusSession({
      taskId: "a",
      startedAt: NOW.getTime() - 10_000,
      entryMode: "intervention",
      entryLevel: 2,
      journeyLevel: 2,
      microTask: "existing step",
      generationSource: "rule_based",
      memoryEvidence: null,
    });
    sessionStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(existing));

    fireEvent.click(screen.getByTestId("task-b"));

    expect(screen.getByTestId("focus-mode")).toHaveAttribute(
      "data-task-id",
      "a",
    );
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual(
      existing,
    );
  });

  it("keeps the current level while the user is editing a reason", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();

    await advance(3_000);
    fireEvent.change(screen.getByLabelText("reason-input"), {
      target: { value: "still deciding" },
    });
    await advance(60_000);

    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "2",
    );
    expect(api.callsFor("a")).toBe(1);
  });

  it("회피 이유 저장 성공 결과를 현재 Task의 최신 이유로 반영한다", async () => {
    setupApi([makeTask({ id: "a", level: 2 })]);
    await renderHome();

    await advance(6_000);
    await act(async () => {
      fireEvent.click(screen.getByText("reconfirm-custom"));
      await Promise.resolve();
    });
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-reason",
      "custom",
    );
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-custom-reason",
      "방금 저장한 이유",
    );
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-reason-changed",
      "true",
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/tasks/a/avoidance-reasons",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          level: 3,
          reason: "custom",
          customText: "방금 저장한 이유",
        }),
      }),
    );
  });

  it("Lv2에 실제 표시된 행동을 같은 Task의 다음 Lv3 요청 컨텍스트로 유지한다", async () => {
    setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();

    await advance(3_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "2",
    );
    fireEvent.click(screen.getByText("resolve-lv2-action"));
    fireEvent.click(screen.getByText("close-modal"));

    await advance(6_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "3",
    );
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-lv2-micro-task",
      "resolved Lv2 action",
    );
  });

  it("Lv3에서 같은 회피 이유를 다시 고르면 변경되지 않은 것으로 기록한다", async () => {
    setupApi([makeTask({ id: "a", level: 2 })]);
    await renderHome();

    await advance(6_000);
    await act(async () => {
      fireEvent.click(screen.getByText("reconfirm-same"));
      await Promise.resolve();
    });

    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-reason-changed",
      "false",
    );
  });

  it("Lv3 이유를 확인하지 않고 닫으면 레벨 하락 후 재진입 때 체크포인트를 다시 표시한다", async () => {
    const api = setupApi([makeTask({ id: "a", level: 2 })]);
    await renderHome();

    await advance(6_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-checkpoint-level",
      "3",
    );
    fireEvent.click(screen.getByText("close-modal"));

    api.updateTask("a", { level: 0, skipCount: 0 });
    await advance(10_000);
    await advance(3_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "2",
    );
    fireEvent.click(screen.getByText("close-modal"));
    await advance(6_000);

    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "3",
    );
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-checkpoint-level",
      "3",
    );
  });

  it("Lv3 이유 저장 실패는 체크포인트를 소비하지 않아 다음 재진입에서 다시 표시한다", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const api = setupApi([makeTask({ id: "a", level: 2 })], {
      failReasonOnceFor: "a",
    });
    await renderHome();

    await advance(6_000);
    fireEvent.click(screen.getByText("reconfirm-custom"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("close-modal"));

    api.updateTask("a", { level: 0, skipCount: 0 });
    await advance(10_000);
    await advance(3_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "2",
    );
    fireEvent.click(screen.getByText("close-modal"));
    await advance(6_000);

    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-checkpoint-level",
      "3",
    );
  });

  it("releases the global request lock after a failed notification", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const api = setupApi(
      [makeTask({ id: "fails", level: 1 }), makeTask({ id: "continues", level: 1 })],
      { failNotificationOnceFor: "fails" },
    );
    await renderHome();

    await advance(3_000);
    expect(api.callsFor("fails")).toBe(1);
    await advance(3_000);

    expect(api.callsFor("continues")).toBe(1);
    expect(screen.getByTestId("nudge-modal")).toHaveTextContent("continues");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("does not create duplicate timers after rerender", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    const { rerender } = await renderHome();

    rerender(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    await advance(3_000);

    expect(api.callsFor("a")).toBe(1);
  });

  it("clears all scheduled timers when HomePage unmounts", async () => {
    setupApi([
      makeTask({ id: "a", level: 1 }),
      makeTask({ id: "b", level: 2 }),
    ]);
    const { unmount } = await renderHome();

    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule a new timeout when an in-flight request settles after unmount", async () => {
    const task = makeTask({ id: "a", level: 0 });
    let resolveNotification;
    const notificationPromise = new Promise((resolve) => {
      resolveNotification = resolve;
    });
    apiFetch.mockImplementation((path, options = {}) => {
      if (path === "/api/tasks" && !options.method) {
        return Promise.resolve({ data: [task] });
      }
      return notificationPromise;
    });

    const { unmount } = await renderHome();
    await advance(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      resolveNotification({
        data: { ...task, level: 1, skipCount: task.skipCount + 1 },
      });
      await notificationPromise;
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders the streak chip using the server's streak value", async () => {
    const task = makeTask({ id: "a", level: 0 });
    setupApi([task], { streak: 5 });

    await renderHome();

    expect(screen.getByText("🔥 5")).toBeInTheDocument();
  });
});
