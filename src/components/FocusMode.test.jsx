import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FocusMode from "./FocusMode.jsx";
import { apiFetch } from "../lib/api";
import {
  FOCUS_SESSION_KEY,
  removeFocusSession,
} from "../lib/focusSession.js";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

function renderFocusMode(props = {}) {
  return render(
    <MemoryRouter>
      <FocusMode
        taskId="task-1"
        title="테스트 과제"
        startedAt={props.startedAt ?? Date.now()}
        entryMode={props.entryMode ?? "intervention"}
        microTask={
          Object.hasOwn(props, "microTask") ? props.microTask : "첫 문장 쓰기"
        }
        entryLevel={
          Object.hasOwn(props, "entryLevel") ? props.entryLevel : 2
        }
        generationSource={props.generationSource ?? "gemini"}
        memoryEvidence={props.memoryEvidence ?? null}
        onSessionCompleted={props.onSessionCompleted}
        onStop={props.onStop}
      />
    </MemoryRouter>,
  );
}

describe("FocusMode completion request guard", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends only one done request for rapid repeated clicks", async () => {
    let resolveRequest;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    apiFetch.mockReturnValue(request);
    renderFocusMode();

    const completeButton = screen.getByRole("button", { name: "완료" });
    fireEvent.click(completeButton);
    fireEvent.click(completeButton);
    fireEvent.click(completeButton);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(completeButton).toBeDisabled();

    await act(async () => {
      resolveRequest({ data: { id: "task-1", status: "done" } });
      await request;
    });

    expect(screen.getByText("완료한 할일")).toBeInTheDocument();
  });

  it("restores both guards after failure so completion can be retried", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiFetch
      .mockRejectedValueOnce(new Error("network failed"))
      .mockResolvedValueOnce({ data: { id: "task-1", status: "done" } });
    renderFocusMode();

    const completeButton = screen.getByRole("button", { name: "완료" });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(completeButton).toBeEnabled();
    });
    expect(
      screen.getByText("완료 기록에 실패했어요. 다시 시도해주세요."),
    ).toBeInTheDocument();

    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText("완료한 할일")).toBeInTheDocument();
    });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("removes the stored session only after completion succeeds", async () => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, '{"saved":true}');
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    renderFocusMode({ onSessionCompleted: () => removeFocusSession() });

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => {
      expect(screen.getByText("완료한 할일")).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
  });

  it("keeps the stored session when completion fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sessionStorage.setItem(FOCUS_SESSION_KEY, '{"saved":true}');
    apiFetch.mockRejectedValue(new Error("network failed"));
    renderFocusMode({ onSessionCompleted: () => removeFocusSession() });

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => {
      expect(
        screen.getByText("완료 기록에 실패했어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBe('{"saved":true}');
  });

  it("removes the stored session after stop succeeds", async () => {
    sessionStorage.setItem(FOCUS_SESSION_KEY, '{"saved":true}');
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "active" } });
    renderFocusMode({ onStop: () => removeFocusSession() });

    fireEvent.click(screen.getByRole("button", { name: "멈추기" }));

    await waitFor(() => {
      expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBeNull();
    });
  });

  it("keeps the stored session when stop fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sessionStorage.setItem(FOCUS_SESSION_KEY, '{"saved":true}');
    apiFetch.mockRejectedValue(new Error("network failed"));
    renderFocusMode({ onStop: () => removeFocusSession() });

    fireEvent.click(screen.getByRole("button", { name: "멈추기" }));

    await waitFor(() => {
      expect(
        screen.getByText("멈추기 기록에 실패했어요. 다시 시도해주세요."),
      ).toBeInTheDocument();
    });
    expect(sessionStorage.getItem(FOCUS_SESSION_KEY)).toBe('{"saved":true}');
  });
});

describe("FocusMode elapsed time recovery", () => {
  const NOW = new Date("2026-07-23T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    apiFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restores a 125-second session as 02:05", () => {
    renderFocusMode({ startedAt: NOW.getTime() - 125_000 });

    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("recalculates from Date.now after a background-style time jump", async () => {
    renderFocusMode({ startedAt: NOW.getTime() });
    expect(screen.getByText("00:00")).toBeInTheDocument();

    vi.setSystemTime(NOW.getTime() + 90_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText("01:31")).toBeInTheDocument();
  });

  it("recalculates durationSeconds at the completion click", async () => {
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    renderFocusMode({ startedAt: NOW.getTime() });

    vi.setSystemTime(NOW.getTime() + 125_900);
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    await act(async () => {
      await Promise.resolve();
    });

    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      eventType: "done",
      durationSeconds: 125,
      entryMode: "intervention",
      entryLevel: 2,
      microTask: "첫 문장 쓰기",
      generationSource: "gemini",
      memoryEvidence: null,
    });
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("카드 직접 시작 컨텍스트를 done 요청에 그대로 포함한다", async () => {
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    renderFocusMode({
      startedAt: NOW.getTime(),
      entryMode: "direct",
      entryLevel: null,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      eventType: "done",
      entryMode: "direct",
      entryLevel: null,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    });
  });

  it("v1 이관 세션의 unknown 출처는 done 요청에서 null로 변환한다", async () => {
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    renderFocusMode({
      startedAt: NOW.getTime(),
      generationSource: "unknown",
    });

    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      microTask: "첫 문장 쓰기",
      generationSource: null,
    });
  });

  it("clears its interval when unmounted", () => {
    const { unmount } = renderFocusMode({ startedAt: NOW.getTime() });

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
