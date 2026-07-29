import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAnalysisPeriodNormalization } from "./useAnalysisPeriodNormalization";

afterEach(() => window.history.replaceState({}, "", "/"));

describe("useAnalysisPeriodNormalization", () => {
  it("does not change browser history", () => {
    window.history.replaceState({}, "", "/home?market=연남");
    renderHook(() =>
      useAnalysisPeriodNormalization({
        period: "20251",
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange: vi.fn(),
      }),
    );

    expect(window.location.pathname).toBe("/home");
    expect(window.location.search).toBe("?market=%EC%97%B0%EB%82%A8");
  });

  it("corrects an unavailable period with the API default", async () => {
    const onPeriodChange = vi.fn();
    renderHook(() =>
      useAnalysisPeriodNormalization({
        period: "20244",
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange,
      }),
    );

    await waitFor(() => expect(onPeriodChange).toHaveBeenCalledWith("20251"));
  });
});
