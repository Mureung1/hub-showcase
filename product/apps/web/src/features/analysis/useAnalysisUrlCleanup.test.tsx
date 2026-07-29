import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAnalysisUrlCleanup } from "./useAnalysisUrlCleanup";

afterEach(() => window.history.replaceState({}, "", "/"));

describe("useAnalysisUrlCleanup", () => {
  it("keeps a persisted analysis URL after the initial state is restored", () => {
    window.history.replaceState({}, "", "/?market=연남&selectedCategory=체육&radius=300");

    renderHook(() =>
      useAnalysisUrlCleanup({
        hasInitialUrlState: true,
        period: "20251",
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange: vi.fn(),
      }),
    );

    expect(window.location.search).toBe("?market=%EC%97%B0%EB%82%A8&selectedCategory=%EC%B2%B4%EC%9C%A1&radius=300");
  });

  it("does not add analysis state to a clean product URL", () => {
    renderHook(() =>
      useAnalysisUrlCleanup({
        hasInitialUrlState: false,
        period: "20251",
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange: vi.fn(),
      }),
    );

    expect(window.location.search).toBe("");
  });

  it("corrects an unavailable period with the API default", async () => {
    const onPeriodChange = vi.fn();
    renderHook(() =>
      useAnalysisUrlCleanup({
        hasInitialUrlState: false,
        period: "20244",
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange,
      }),
    );

    await waitFor(() => expect(onPeriodChange).toHaveBeenCalledWith("20251"));
  });
});
