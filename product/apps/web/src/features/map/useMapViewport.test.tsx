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

  it("restores the analysis presentation during reset", () => {
    const initial: [number, number] = [126.923, 37.56];
    const { result } = renderHook(() => useMapViewport(initial));

    act(() => result.current.setPresentationMode("storefront3d"));
    expect(result.current.presentationMode).toBe("storefront3d");
    expect(result.current.prefabMode).toBe(true);

    act(() => result.current.resetViewport(initial));
    expect(result.current.presentationMode).toBe("analysis");
    expect(result.current.mapMode).toBe("localtwin");
    expect(result.current.prefabMode).toBe(false);
    expect(result.current.baseBuildingsVisible).toBe(true);
  });

  it("hides base buildings when a LocalTwin overlay is visible at the edge of the analysis map", () => {
    const initial: [number, number] = [126.923, 37.56];
    const { result } = renderHook(() => useMapViewport(initial));

    act(() => {
      result.current.updateVisibleCenter([126.904, 37.547]);
      result.current.updateVisibleBounds({
        west: 126.912,
        south: 37.548,
        east: 126.928,
        north: 37.558,
      });
    });

    expect(result.current.baseBuildingsRendered).toBe(false);
  });

  it("keeps base buildings visible in storefront mode so individual footprints can be replaced", () => {
    const initial: [number, number] = [126.923, 37.56];
    const { result } = renderHook(() => useMapViewport(initial));

    act(() => {
      result.current.updateVisibleBounds({
        west: 126.912,
        south: 37.548,
        east: 126.928,
        north: 37.558,
      });
      result.current.setPresentationMode("storefront3d");
    });

    expect(result.current.baseBuildingsRendered).toBe(true);
  });

  it("keeps the demo viewport's existing center-only building rule", () => {
    const initial: [number, number] = [126.923, 37.56];
    const { result } = renderHook(() => useMapViewport(initial, false));

    act(() => {
      result.current.updateVisibleCenter([126.904, 37.547]);
      result.current.updateVisibleBounds({
        west: 126.912,
        south: 37.548,
        east: 126.928,
        north: 37.558,
      });
    });

    expect(result.current.baseBuildingsRendered).toBe(true);
  });
});
