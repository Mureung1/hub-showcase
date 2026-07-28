import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useMapViewport } from "./useMapViewport";

afterEach(() => window.history.replaceState({}, "", "/"));

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

  it("restores the presentation mode recorded in the URL", () => {
    window.history.replaceState({}, "", "/?view=storefront3d");
    const { result } = renderHook(() => useMapViewport([126.923, 37.56]));

    expect(result.current.presentationMode).toBe("storefront3d");
    expect(result.current.prefabMode).toBe(true);
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

  it("keeps fallback buildings visible in analysis mode for polygon filtering", () => {
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

    expect(result.current.baseBuildingsRendered).toBe(true);
  });

  it("keeps fallback buildings visible in storefront mode", () => {
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

  it("keeps demo fallback buildings visible", () => {
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
