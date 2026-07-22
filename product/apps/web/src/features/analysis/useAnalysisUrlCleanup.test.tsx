import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAnalysisUrlCleanup } from "./useAnalysisUrlCleanup";

afterEach(() => window.history.replaceState({}, "", "/"));

describe("useAnalysisUrlCleanup", () => {
  it("cleans a legacy analysis URL after the initial state is restored", () => {
    window.history.replaceState({}, "", "/?market=연남&radius=300");

    renderHook(() =>
      useAnalysisUrlCleanup({
        hasInitialUrlState: true,
        period: "20251",
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange: vi.fn(),
      }),
    );

    expect(window.location.search).toBe("");
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
