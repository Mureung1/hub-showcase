import {
  act,
  fireEvent,
  render,
  screen,
  within,
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
  default: ({ task, onClick, onDelete }) => (
    <div data-testid={`card-${task.id}`}>
      <button data-testid={`task-${task.id}`} onClick={onClick}>
        {task.title}
      </button>
      <button aria-label={`delete-${task.id}`} onClick={onDelete}>
        delete
      </button>
    </div>
  ),
}));

vi.mock("./EmptyState", () => ({
  default: ({ actionLabel }) => (
    <a data-testid="empty-state" href="/register">
      {actionLabel}
    </a>
  ),
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
    onComplete,
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
      <button onClick={() => onComplete?.()}>leave-completion</button>
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
    failHistory = false,
    history = [],
    includeStreak = true,
    streak = 0,
  } = {},
) {
  let serverTasks = initialTasks.map((task) => ({ ...task }));
  let serverHistory = history.map((entry) => ({ ...entry }));
  const notificationCalls = [];
  let taskListCalls = 0;
  let historyListCalls = 0;
  let failed = false;
  let reasonFailed = false;

  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === "/api/tasks" && !options.method) {
      taskListCalls += 1;
      const response = { data: serverTasks.map((task) => ({ ...task })) };
      if (includeStreak) response.streak = streak;
      return response;
    }
    if (path === "/api/history" && !options.method) {
      historyListCalls += 1;
      if (failHistory) throw new Error("history failed");
      return { data: serverHistory.map((entry) => ({ ...entry })) };
    }

    const deleteMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (deleteMatch && options.method === "DELETE") {
      serverTasks = serverTasks.filter((task) => task.id !== deleteMatch[1]);
      return { data: null };
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
    historyListCalls: () => historyListCalls,
    updateHistory: (entries) => {
      serverHistory = entries.map((entry) => ({ ...entry }));
    },
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
    { label: "Lv.2", initialLevel: 1, openAfter: 10_000, blockedFor: 30_000 },
    { label: "Lv.3", initialLevel: 2, openAfter: 6_000, blockedFor: 30_000 },
    { label: "Lv.4", initialLevel: 3, openAfter: 3_000, blockedFor: 60_000 },
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
    // modal-task는 Lv0→1(항상 즉시)로 모달을 띄우고, other-task는 기본
    // deadline(overdue)이라 Lv2 지연이 짧다. close 이후 modal-task는 far
    // 버킷의 Lv2(40000ms)로 재예약돼 other-task의 Lv2(overdue, 10000ms)보다
    // 훨씬 늦게 다시 개입하므로, 레벨이 높을수록 간격이 짧아지는 현재
    // 정책에서도 other-task가 방해받지 않고 자신의 새 간격을 완주할 수 있다.
    const api = setupApi([
      makeTask({
        id: "modal-task",
        level: 0,
        deadline: "2026-08-02T12:00:00.000Z", // far
      }),
      makeTask({ id: "other-task", level: 1 }), // 기본 deadline → overdue
    ]);
    await renderHome();

    await advance(0);
    expect(screen.getByTestId("nudge-modal")).toHaveTextContent("modal-task");
    expect(api.callsFor("other-task")).toBe(0);

    await advance(30_000);
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
    await advance(10_000);
    fireEvent.click(screen.getByText("close-modal"));
    await advance(6_000);
    fireEvent.click(screen.getByText("close-modal"));
    await advance(3_000);

    expect(api.callsFor("repeating-task")).toBe(4);
    expect(api.callsFor("deferred-task")).toBe(0);
    expect(screen.getByTestId("nudge-modal")).toHaveTextContent(
      "repeating-task",
    );
  });

  it("does not reschedule after Focus starts and preserves the Lv.2 session", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();

    await advance(10_000);
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
      startedAt: NOW.getTime() + 10_000,
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

    await advance(10_000);
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

    await advance(10_000);
    expect(screen.getByTestId("nudge-modal")).toHaveAttribute(
      "data-level",
      "2",
    );
    fireEvent.click(screen.getByText("resolve-lv2-action"));
    expect(screen.getByText("이전에 제안한 첫 행동")).toBeInTheDocument();
    expect(screen.getByText("resolved Lv2 action")).toBeInTheDocument();
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

    await advance(10_000);
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
    await advance(10_000);

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
      if (path === "/api/history" && !options.method) {
        return Promise.resolve({ data: [] });
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

  it("renders the date streak chip using the server's streak value", async () => {
    const task = makeTask({ id: "a", level: 0 });
    setupApi([task], { streak: 5 });

    await renderHome();

    expect(screen.getByText("연속 완료")).toBeInTheDocument();
    expect(screen.getByText("5일")).toBeInTheDocument();
  });

  it("Home Summary 네 개를 Task와 History 기준으로 표시한다", async () => {
    const api = setupApi(
      [
        makeTask({ id: "active", status: "active" }),
        makeTask({ id: "waiting", status: "waiting" }),
        makeTask({ id: "done", status: "done" }),
      ],
      {
        streak: 4,
        history: [
          { taskId: "history-1", completedAt: NOW.toISOString() },
          { taskId: "history-2", completedAt: NOW.toISOString() },
        ],
      },
    );

    await renderHome();

    const activeCard = screen.getByText("진행 중").closest(".stat-chip");
    const urgentCard = screen.getByText("마감 임박").closest(".stat-chip");
    const todayCard = screen.getByText("오늘 완료").closest(".stat-chip");
    const streakCard = screen.getByText("연속 완료").closest(".stat-chip");

    expect(within(activeCard).getByText("1개")).toBeInTheDocument();
    expect(within(urgentCard).getByText("2개")).toBeInTheDocument();
    expect(within(urgentCard).getByText("기한 초과 포함")).toBeInTheDocument();
    expect(within(todayCard).getByText("2개")).toBeInTheDocument();
    expect(within(streakCard).getByText("4일")).toBeInTheDocument();
    expect(api.taskListCalls()).toBe(1);
    expect(api.historyListCalls()).toBe(1);
    expect(
      screen.getByRole("heading", { name: "task active" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "진행 중인 할 일" }),
    ).toBeInTheDocument();
  });

  it("History 성공 응답이 빈 배열이면 오늘 완료를 0개로 표시한다", async () => {
    setupApi([makeTask({ id: "active" })], { history: [] });

    await renderHome();

    const todayCard = screen.getByText("오늘 완료").closest(".stat-chip");
    expect(within(todayCard).getByText("0개")).toBeInTheDocument();
  });

  it("History 요청 실패 시 Home을 유지하고 오늘 완료만 대시로 표시한다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setupApi([makeTask({ id: "active" })], { failHistory: true });

    await renderHome();

    const todayCard = screen.getByText("오늘 완료").closest(".stat-chip");
    expect(within(todayCard).getByText("—")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "task active" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("task-active")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it.each(["5", -1, 1.5, Infinity, NaN])(
    "비정상 streak %s는 0일로 표시한다",
    async (streak) => {
      setupApi([makeTask({ id: "active" })], { streak });

      await renderHome();

      const streakCard = screen.getByText("연속 완료").closest(".stat-chip");
      expect(within(streakCard).getByText("0일")).toBeInTheDocument();
    },
  );

  it("streak가 누락되면 0일로 표시한다", async () => {
    setupApi([makeTask({ id: "active" })], { includeStreak: false });

    await renderHome();

    const streakCard = screen.getByText("연속 완료").closest(".stat-chip");
    expect(within(streakCard).getByText("0일")).toBeInTheDocument();
  });

  it("Focus 종료 후 Task와 History를 다시 조회해 오늘 완료를 갱신한다", async () => {
    const api = setupApi([makeTask({ id: "active" })], { history: [] });
    await renderHome();
    expect(
      within(screen.getByText("오늘 완료").closest(".stat-chip")).getByText(
        "0개",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("task-active"));
    api.updateHistory([
      { taskId: "active", completedAt: NOW.toISOString() },
    ]);
    await act(async () => {
      fireEvent.click(screen.getByText("leave-completion"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      within(screen.getByText("오늘 완료").closest(".stat-chip")).getByText(
        "1개",
      ),
    ).toBeInTheDocument();
    expect(api.taskListCalls()).toBe(2);
    expect(api.historyListCalls()).toBe(2);
  });

  it("첫 번째 active Task를 Hero에 표시하고 기존 목록에도 유지한다", async () => {
    setupApi([
      makeTask({ id: "done", status: "done", level: 0 }),
      makeTask({ id: "waiting", status: "waiting", level: 0 }),
      makeTask({ id: "first-active", status: "active", level: 2 }),
      makeTask({ id: "second-active", status: "active", level: 3 }),
    ]);

    await renderHome();

    expect(
      screen.getByRole("heading", { name: "task first-active" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "task second-active" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("task-first-active")).toBeInTheDocument();
    expect(screen.getByTestId("task-second-active")).toBeInTheDocument();
  });

  it("Hero CTA는 기존 direct Focus 계약을 유지한다", async () => {
    setupApi([makeTask({ id: "hero", level: 3 })]);
    await renderHome();

    fireEvent.click(
      screen.getByRole("button", { name: "할 일 바로 시작하기" }),
    );

    const focus = screen.getByTestId("focus-mode");
    expect(focus).toHaveAttribute("data-task-id", "hero");
    expect(focus).toHaveAttribute("data-entry-mode", "direct");
    expect(focus).toHaveAttribute("data-entry-level", "");
    expect(focus).toHaveAttribute("data-journey-level", "3");
    expect(focus).toHaveAttribute("data-micro-task", "");
    expect(focus).toHaveAttribute("data-generation-source", "none");
  });

  it("active Task가 없으면 빈 Hero를 표시하고 기존 Task 목록을 유지한다", async () => {
    setupApi([
      makeTask({ id: "waiting", status: "waiting", level: 0 }),
      makeTask({ id: "done", status: "done", level: 0 }),
    ]);

    await renderHome();

    expect(
      screen.getByRole("heading", { name: "아직 시작할 여정이 없어요." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("task-waiting")).toBeInTheDocument();
    expect(screen.getByTestId("task-done")).toBeInTheDocument();
  });

  it("Task가 전혀 없으면 빈 Hero와 기존 EmptyState의 역할을 분리한다", async () => {
    setupApi([]);
    await renderHome();

    expect(
      screen.getByRole("heading", { name: "아직 시작할 여정이 없어요." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "할 일 바로 시작하기" }),
    ).not.toBeInTheDocument();
  });

  it("상태별 섹션으로 나누되 각 그룹의 API 배열 순서를 유지한다", async () => {
    setupApi([
      makeTask({ id: "active-1", status: "active" }),
      makeTask({ id: "done-1", status: "done" }),
      makeTask({ id: "waiting-1", status: "waiting" }),
      makeTask({ id: "active-2", status: "active" }),
      makeTask({ id: "done-2", status: "done" }),
    ]);

    await renderHome();

    const activeSection = screen.getByRole("region", {
      name: "진행 중인 할 일",
    });
    const waitingSection = screen.getByRole("region", { name: "시작 예정" });
    const doneSection = screen.getByRole("region", { name: "완료한 할 일" });
    const taskIds = (section) =>
      Array.from(section.querySelectorAll('[data-testid^="task-"]')).map(
        (element) => element.dataset.testid,
      );

    expect(taskIds(activeSection)).toEqual(["task-active-1", "task-active-2"]);
    expect(taskIds(waitingSection)).toEqual(["task-waiting-1"]);
    expect(taskIds(doneSection)).toEqual(["task-done-1", "task-done-2"]);
    expect(
      within(activeSection).getByLabelText("진행 중인 할 일 2개"),
    ).toBeInTheDocument();
  });

  it("완료 목록은 세 개만 표시하고 같은 목록 안에서 펼치고 접는다", async () => {
    setupApi(
      Array.from({ length: 5 }, (_, index) =>
        makeTask({ id: `done-${index + 1}`, status: "done" }),
      ),
    );

    await renderHome();

    const doneSection = screen.getByRole("region", { name: "완료한 할 일" });
    const toggle = within(doneSection).getByRole("button", {
      name: "완료한 할 일 모두 보기",
    });
    expect(within(doneSection).getAllByTestId(/^task-done-/)).toHaveLength(3);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(within(doneSection).getAllByTestId(/^task-done-/)).toHaveLength(5);
    expect(
      within(doneSection).getByRole("button", { name: "완료 목록 접기" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(
      within(doneSection).getByRole("button", { name: "완료 목록 접기" }),
    );
    expect(within(doneSection).getAllByTestId(/^task-done-/)).toHaveLength(3);
  });

  it("펼친 완료 목록이 세 개 이하로 줄면 기본 상태로 돌아가고 토글을 제거한다", async () => {
    setupApi(
      Array.from({ length: 4 }, (_, index) =>
        makeTask({ id: `done-${index + 1}`, status: "done" }),
      ),
    );

    await renderHome();
    const doneSection = screen.getByRole("region", { name: "완료한 할 일" });
    fireEvent.click(
      within(doneSection).getByRole("button", {
        name: "완료한 할 일 모두 보기",
      }),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "delete-done-4" }));
      await Promise.resolve();
    });

    expect(within(doneSection).getAllByTestId(/^task-done-/)).toHaveLength(3);
    expect(
      within(doneSection).queryByRole("button", {
        name: /완료한 할 일 모두 보기|완료 목록 접기/,
      }),
    ).not.toBeInTheDocument();
  });

  it("알 수 없는 status도 기존 TaskCard fallback을 유지해 화면에서 누락하지 않는다", async () => {
    setupApi([makeTask({ id: "paused", status: "paused", level: 2 })]);

    await renderHome();

    const otherSection = screen.getByRole("region", { name: "기타 상태" });
    expect(within(otherSection).getByTestId("task-paused")).toBeInTheDocument();
    fireEvent.click(within(otherSection).getByTestId("task-paused"));
    expect(screen.getByTestId("focus-mode")).toHaveAttribute(
      "data-task-id",
      "paused",
    );
  });

  it.each([
    ["active", "active"],
    ["waiting", "waiting"],
    ["done", "done"],
  ])(
    "%s Task만 있어도 공통 새 할 일 CTA를 한 번 표시한다",
    async (_label, status) => {
      setupApi([makeTask({ id: status, status })]);

      await renderHome();

      const links = screen.getAllByRole("link", { name: "+ 새 할 일" });
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", "/register");
    },
  );

  it("Task가 없으면 공통 CTA 대신 기존 EmptyState CTA만 표시한다", async () => {
    setupApi([]);

    await renderHome();

    expect(screen.queryByRole("link", { name: "+ 새 할 일" })).toBeNull();
    expect(screen.getByTestId("empty-state")).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("마감 임박이 있을 때만 해당 Stats 카드를 약하게 강조한다", async () => {
    setupApi([
      makeTask({
        id: "urgent",
        deadline: "2026-07-23T11:59:59.000Z",
      }),
    ]);

    await renderHome();

    const urgentCard = screen.getByText("마감 임박").closest(".stat-chip");
    const streakCard = screen.getByText("연속 완료").closest(".stat-chip");
    expect(urgentCard).toHaveClass("stat-chip-urgent");
    expect(streakCard).not.toHaveClass("stat-chip-urgent");
  });

  it("마감 임박이 0개이면 Stats 강조를 적용하지 않는다", async () => {
    setupApi([
      makeTask({
        id: "later",
        deadline: "2026-08-01T12:00:00.000Z",
      }),
    ]);

    await renderHome();

    expect(
      screen.getByText("마감 임박").closest(".stat-chip"),
    ).not.toHaveClass("stat-chip-urgent");
  });
});
