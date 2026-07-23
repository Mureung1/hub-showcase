import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FocusMode from "./FocusMode.jsx";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

function renderFocusMode() {
  return render(
    <MemoryRouter>
      <FocusMode
        taskId="task-1"
        title="테스트 과제"
        microTask="첫 문장 쓰기"
        entryLevel={2}
      />
    </MemoryRouter>,
  );
}

describe("FocusMode completion request guard", () => {
  beforeEach(() => {
    apiFetch.mockReset();
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
});
