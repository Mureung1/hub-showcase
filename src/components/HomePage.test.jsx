import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage.jsx";
import { apiFetch } from "../lib/api";
import {
  FOCUS_SESSION_KEY,
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
  default: ({ task, onClose, onStart }) => (
    <div data-testid="nudge-modal" data-level={task.level}>
      <span>{task.id}</span>
      <input aria-label="reason-input" />
      <button onClick={onClose}>close-modal</button>
      <button
        onClick={() =>
          onStart(
            task.level === 2
              ? {
                  taskId: task.id,
                  title: task.title,
                  startedAt: "2026-07-23T00:00:00.000Z",
                  entryLevel: 2,
                  microTask: "open one paragraph",
                  reason: task.reason,
                }
              : undefined,
          )
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
    microTask,
    entryLevel,
    onSessionCompleted,
    onStop,
  }) => (
    <div
      data-testid="focus-mode"
      data-task-id={taskId}
      data-started-at={startedAt ?? ""}
      data-micro-task={microTask ?? ""}
      data-entry-level={entryLevel ?? ""}
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

function setupApi(initialTasks, { failNotificationOnceFor = null } = {}) {
  let serverTasks = initialTasks.map((task) => ({ ...task }));
  const notificationCalls = [];
  let failed = false;

  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === "/api/tasks" && !options.method) {
      return { data: serverTasks.map((task) => ({ ...task })) };
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

    throw new Error(`Unexpected API call: ${path}`);
  });

  return {
    callsFor: (taskId) =>
      notificationCalls.filter((calledId) => calledId === taskId).length,
    allCalls: () => [...notificationCalls],
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
    expect(focus).toHaveAttribute("data-micro-task", "open one paragraph");
    expect(focus).toHaveAttribute("data-entry-level", "2");
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual({
      version: 1,
      taskId: "a",
      startedAt: NOW.getTime() + 3_000,
      entryLevel: 2,
      microTask: "open one paragraph",
    });

    await advance(60_000);
    expect(api.callsFor("a")).toBe(1);
  });

  it("stores a null-metadata session when Focus starts from a Task card", async () => {
    setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();

    fireEvent.click(screen.getByTestId("task-a"));

    expect(screen.getByTestId("focus-mode")).toHaveAttribute(
      "data-task-id",
      "a",
    );
    expect(JSON.parse(sessionStorage.getItem(FOCUS_SESSION_KEY))).toEqual({
      version: 1,
      taskId: "a",
      startedAt: NOW.getTime(),
      entryLevel: null,
      microTask: null,
    });
  });

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
    setupApi([makeTask({ id: "a", level: 1 })]);
    await renderHome();
    fireEvent.click(screen.getByTestId("task-a"));
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).not.toBeNull();

    fireEvent.click(screen.getByText("stop-session"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
    expect(screen.queryByTestId("focus-mode")).not.toBeInTheDocument();
  });

  it("restores a valid active Focus session before scheduling its notification", async () => {
    const api = setupApi([makeTask({ id: "a", level: 1 })]);
    const session = createFocusSession({
      taskId: "a",
      startedAt: NOW.getTime() - 125_000,
      entryLevel: 2,
      microTask: "open one paragraph",
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
      entryLevel: 2,
      microTask: "existing step",
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
});
