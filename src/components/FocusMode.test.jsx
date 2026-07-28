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
        journeyLevel={
          Object.hasOwn(props, "journeyLevel")
            ? props.journeyLevel
            : Object.hasOwn(props, "entryLevel")
              ? props.entryLevel
              : 2
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

  it("shows the success character only after completion succeeds", async () => {
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    const { container } = renderFocusMode();

    expect(container.querySelector(".completion-character")).toBeNull();
    expect(container.querySelector(".focus-mode-journey")).not.toBeNull();
    const journeyCharacter = container.querySelector(
      ".focus-journey-character",
    );
    expect(journeyCharacter).not.toBeNull();
    expect(journeyCharacter.getAttribute("src")).toContain(
      "nagbot_walk_lv2.png",
    );

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => {
      expect(container.querySelector(".completion-character")).not.toBeNull();
    });
    expect(container.querySelector(".focus-mode-journey")).toBeNull();
    expect(container.querySelector(".focus-journey-character")).toBeNull();
    expect(
      container.querySelector(".focus-mode-completed").style.backgroundImage,
    ).toBe("");
    expect(screen.getByRole("button", { name: "홈으로" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기록 보기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "도움됐어요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "아쉬웠어요" }),
    ).toBeInTheDocument();
  });

  it("shows the first-action panel only when the focus session has a microTask", () => {
    const { rerender } = renderFocusMode();

    expect(screen.getByText("첫 행동")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <FocusMode
          taskId="task-1"
          title="테스트 과제"
          startedAt={Date.now()}
          entryMode="direct"
          microTask={null}
          entryLevel={null}
          generationSource="none"
          memoryEvidence={null}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText("첫 행동")).not.toBeInTheDocument();
    expect(screen.getByText("현재 할 일")).toBeInTheDocument();
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

  it("sends only one stopped request for rapid repeated clicks", async () => {
    let resolveRequest;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    apiFetch.mockReturnValue(request);
    const onStop = vi.fn();
    renderFocusMode({ onStop });

    const stopButton = screen.getByRole("button", { name: "멈추기" });
    fireEvent.click(stopButton);
    fireEvent.click(stopButton);
    fireEvent.click(stopButton);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(stopButton).toBeDisabled();

    await act(async () => {
      resolveRequest({ data: { id: "task-1", status: "active" } });
      await request;
    });

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(stopButton).toBeEnabled();
  });

  it.each([
    [59_000, 59],
    [60_000, 60],
  ])(
    "sends the click-time elapsed duration for stopped at %sms",
    async (elapsedMs, expectedSeconds) => {
      const now = new Date("2026-07-27T12:00:00.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);
      apiFetch.mockResolvedValue({ data: { id: "task-1", status: "active" } });
      renderFocusMode({ startedAt: now - elapsedMs, onStop: vi.fn() });

      fireEvent.click(screen.getByRole("button", { name: "멈추기" }));

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledTimes(1);
      });
      expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({
        eventType: "stopped",
        durationSeconds: expectedSeconds,
      });
    },
  );

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

describe("FocusMode Shared Journey asset mapping", () => {
  it.each([
    [0, "nagbot_walk_lv0.png", "journey_lv0_clear.png"],
    [1, "nagbot_walk_lv1.png", "journey_lv1_partly_cloudy.png"],
    [2, "nagbot_walk_lv2.png", "journey_lv2_cloudy.png"],
    [3, "nagbot_walk_lv3.png.png", "journey_lv3_rain.png"],
    [4, "nagbot_walk_lv4.png", "journey_lv4_storm.png"],
    [null, "nagbot_walk_lv0.png", "journey_lv0_clear.png"],
    [9, "nagbot_walk_lv0.png", "journey_lv0_clear.png"],
  ])(
    "maps journeyLevel %s to the expected character and background",
    (journeyLevel, characterFile, backgroundFile) => {
      const { container } = renderFocusMode({ journeyLevel });
      const journey = container.querySelector(".focus-mode-journey");
      const character = container.querySelector(".focus-journey-character");

      expect(character.getAttribute("src")).toContain(characterFile);
      expect(character).toHaveClass(
        `focus-journey-character-lv${Number.isInteger(journeyLevel) && journeyLevel >= 0 && journeyLevel <= 4 ? journeyLevel : 0}`,
      );
      expect(journey.style.backgroundImage).toContain(backgroundFile);
    },
  );

  it("keeps Journey assets tied to journeyLevel when entryLevel changes", () => {
    const { container, rerender } = renderFocusMode({
      entryLevel: null,
      journeyLevel: 4,
      microTask: null,
      entryMode: "direct",
      generationSource: "none",
    });

    expect(
      container.querySelector(".focus-journey-character").getAttribute("src"),
    ).toContain("nagbot_walk_lv4.png");

    rerender(
      <MemoryRouter>
        <FocusMode
          taskId="task-1"
          title="테스트 과제"
          startedAt={Date.now()}
          entryMode="direct"
          entryLevel={3}
          journeyLevel={4}
          microTask={null}
          generationSource="none"
          memoryEvidence={null}
        />
      </MemoryRouter>,
    );

    expect(
      container.querySelector(".focus-journey-character").getAttribute("src"),
    ).toContain("nagbot_walk_lv4.png");
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

  it("Lv3에서 표시된 행동과 추적 참조를 done 요청에 그대로 포함한다", async () => {
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    renderFocusMode({
      startedAt: NOW.getTime(),
      entryMode: "intervention",
      entryLevel: 3,
      microTask: "목차 후보를 세 줄로 작성하기",
      generationSource: "gemini",
      memoryEvidence: { sourceDoneEventId: "done-event-1" },
    });

    expect(
      screen.getByText("목차 후보를 세 줄로 작성하기"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      eventType: "done",
      entryMode: "intervention",
      entryLevel: 3,
      microTask: "목차 후보를 세 줄로 작성하기",
      generationSource: "gemini",
      memoryEvidence: { sourceDoneEventId: "done-event-1" },
    });
  });

  it("Lv3 fallback으로 전달된 행동을 done 요청에도 같은 값으로 포함한다", async () => {
    const fallback = "첫 슬라이드에 발표 핵심 한 문장 입력하기";
    apiFetch.mockResolvedValue({ data: { id: "task-1", status: "done" } });
    renderFocusMode({
      startedAt: NOW.getTime(),
      entryMode: "intervention",
      entryLevel: 3,
      microTask: fallback,
      generationSource: "rule_based",
      memoryEvidence: null,
    });

    expect(screen.getByText(fallback)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      eventType: "done",
      entryMode: "intervention",
      entryLevel: 3,
      microTask: fallback,
      generationSource: "rule_based",
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
