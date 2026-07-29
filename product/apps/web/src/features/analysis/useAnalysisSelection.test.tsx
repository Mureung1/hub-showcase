import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type AnalysisInitialState, useAnalysisSelection } from "./useAnalysisSelection";

const initial: AnalysisInitialState = {
  marketKey: "연남",
  category: "카페",
  selectedCategoryName: "카페",
  selectedCategoryCode: null,
  radius: 300,
  activeHour: 2,
  layer: "density",
  scope: "market",
  topic: "overview",
  boundaryVisible: true,
  storesVisible: true,
  period: "20251",
  center: [126.92, 37.56],
};

describe("useAnalysisSelection", () => {
  it("normalizes a deep-linked store category to its top-level filter", () => {
    const { result } = renderHook(() =>
      useAnalysisSelection({
        ...initial,
        selectedCategoryName: "미용실",
        selectedCategoryCode: "S20701",
      }),
    );

    expect(result.current.category).toBe("미용");
    expect(result.current.categorySelection.name).toBe("미용");
  });

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
      result.current.setBoundaryVisible(false);
      result.current.setStoresVisible(false);
    });
    act(() => result.current.resetSelection());
    expect(result.current.boundaryVisible).toBe(true);
    expect(result.current.storesVisible).toBe(true);
  });

  it("keeps the top-level category and selected partial category in sync", () => {
    const { result } = renderHook(() => useAnalysisSelection(initial));

    act(() =>
      result.current.applyCategorySelection({
        name: "미용실",
        code: "S20701",
        analysisCategory: null,
        coverage: "partial",
      }),
    );

    expect(result.current.category).toBe("미용실");
    expect(result.current.categorySelection.name).toBe("미용실");
  });
});
