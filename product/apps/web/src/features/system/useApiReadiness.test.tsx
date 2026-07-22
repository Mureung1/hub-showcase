import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadApiReadiness } from "../../services/system";
import { useApiReadiness } from "./useApiReadiness";

vi.mock("../../services/system", () => ({
  loadApiReadiness: vi.fn(),
}));

const loadApiReadinessMock = vi.mocked(loadApiReadiness);

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useApiReadiness", () => {
  it("releases data requests after the API becomes ready", async () => {
    loadApiReadinessMock.mockResolvedValueOnce();

    const { result } = renderHook(() => useApiReadiness());

    await waitFor(() => expect(result.current.state).toBe("ready"));
  });

  it("allows a user retry after the readiness check fails", async () => {
    loadApiReadinessMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce();

    const { result } = renderHook(() => useApiReadiness());

    await waitFor(() => expect(result.current.state).toBe("unavailable"));
    result.current.retry();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(loadApiReadinessMock).toHaveBeenCalledTimes(2);
  });

  it("explains that a slow API is waking up before treating it as unavailable", async () => {
    vi.useFakeTimers();
    loadApiReadinessMock.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useApiReadiness());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });
    expect(result.current.state).toBe("waking");
  });
});
