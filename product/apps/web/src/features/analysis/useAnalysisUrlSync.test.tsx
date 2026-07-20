import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnalysisUrlState } from "./analysisUrlState";
import { useAnalysisUrlSync } from "./useAnalysisUrlSync";

const state: AnalysisUrlState = {
  marketKey: "연남",
  category: "카페",
  selectedCategoryName: "카페",
  selectedCategoryCode: null,
  radius: 300,
  layer: "density",
  scope: "radius",
  topic: "overview",
  boundaryVisible: true,
  storesVisible: true,
  period: "20251",
  center: [126.92, 37.56],
};

afterEach(() => window.history.replaceState({}, "", "/"));

describe("useAnalysisUrlSync", () => {
  it("keeps the initial URL neutral until a user action enables sync", () => {
    const { result } = renderHook(() =>
      useAnalysisUrlSync({
        initialEnabled: false,
        state,
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange: vi.fn(),
      }),
    );

    expect(window.location.search).toBe("");
    act(() => result.current.enableUrlSync());
    expect(new URLSearchParams(window.location.search).get("market")).toBe("연남");
  });

  it("corrects an unavailable period with the API default", async () => {
    const onPeriodChange = vi.fn();
    renderHook(() =>
      useAnalysisUrlSync({
        initialEnabled: true,
        state: { ...state, period: "20244" },
        availablePeriods: ["20251"],
        defaultPeriod: "20251",
        onPeriodChange,
      }),
    );

    await waitFor(() => expect(onPeriodChange).toHaveBeenCalledWith("20251"));
  });
});
