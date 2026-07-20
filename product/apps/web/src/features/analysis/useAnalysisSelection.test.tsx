import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AnalysisUrlState } from "./analysisUrlState";
import { useAnalysisSelection } from "./useAnalysisSelection";

const initial: AnalysisUrlState = {
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

describe("useAnalysisSelection", () => {
  it("keeps topic and layer semantics together", () => {
    const { result } = renderHook(() => useAnalysisSelection(initial));
    act(() => result.current.chooseTopic("flow"));
    expect(result.current.analysisTopic).toBe("flow");
    expect(result.current.layer).toBe("demand");
    act(() => result.current.chooseTopic("competition"));
    expect(result.current.layer).toBe("density");
  });

  it("resets all user-selectable filters to the neutral defaults", () => {
    const { result } = renderHook(() => useAnalysisSelection(initial));
    act(() => {
      result.current.setRadius(500);
      result.current.setBoundaryVisible(false);
      result.current.setStoresVisible(false);
    });
    act(() => result.current.resetSelection());
    expect(result.current.radius).toBe(300);
    expect(result.current.boundaryVisible).toBe(true);
    expect(result.current.storesVisible).toBe(true);
  });
});
