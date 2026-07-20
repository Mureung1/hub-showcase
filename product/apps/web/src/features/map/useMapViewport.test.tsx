import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useMapViewport } from "./useMapViewport";

describe("useMapViewport", () => {
  it("keeps a draft center separate until the move is confirmed", () => {
    const initial: [number, number] = [126.923, 37.56];
    const next: [number, number] = [126.925, 37.561];
    const { result } = renderHook(() => useMapViewport(initial));

    act(() => result.current.updateVisibleCenter(next));
    act(() => result.current.startMove());
    expect(result.current.analysisCenter).toEqual(next);
    expect(result.current.committedCenter).toEqual(initial);

    act(() => result.current.commitDraftCenter());
    expect(result.current.committedCenter).toEqual(next);
    expect(result.current.analysisMoveMode).toBe("idle");
  });

  it("restores map display defaults during reset", () => {
    const initial: [number, number] = [126.923, 37.56];
    const { result } = renderHook(() => useMapViewport(initial));
    act(() => {
      result.current.setMapMode("original");
      result.current.setPrefabMode(false);
      result.current.setBaseBuildingsVisible(false);
    });
    act(() => result.current.resetViewport(initial));
    expect(result.current.mapMode).toBe("localtwin");
    expect(result.current.prefabMode).toBe(true);
    expect(result.current.baseBuildingsVisible).toBe(true);
  });
});
