import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMapViewport } from "./useMapViewport";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

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

  it("queues market camera moves until the current 3D frame has committed", () => {
    const initial: [number, number] = [126.923, 37.56];
    const next: [number, number] = [126.919, 37.553];
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    let moveEnd: (() => void) | null = null;
    const stop = vi.fn();
    const easeTo = vi.fn();
    const flyTo = vi.fn();
    const map = {
      stop,
      easeTo,
      once: vi.fn((_event: string, callback: () => void) => {
        moveEnd = callback;
      }),
      off: vi.fn(),
    };
    const { result } = renderHook(() => useMapViewport(initial));
    result.current.mapRef.current = {
      flyTo,
      getMap: () => map,
    } as never;

    const commitMarket = vi.fn();
    act(() => result.current.transitionToMarket(next, commitMarket));

    expect(result.current.committedCenter).toEqual(initial);
    expect(result.current.marketTransitionActive).toBe(true);
    expect(commitMarket).not.toHaveBeenCalled();
    expect(easeTo).not.toHaveBeenCalled();
    expect(flyTo).not.toHaveBeenCalled();

    act(() => animationFrames[0](0));

    expect(stop).toHaveBeenCalledOnce();
    expect(commitMarket).toHaveBeenCalledOnce();
    expect(result.current.committedCenter).toEqual(next);
    expect(easeTo).toHaveBeenCalledWith({
      center: next,
      zoom: 15.4,
      pitch: 0,
      bearing: 0,
      duration: 720,
      essential: true,
    });

    act(() => moveEnd?.());
    expect(easeTo).toHaveBeenLastCalledWith({
      pitch: 38,
      bearing: -18,
      duration: 260,
      essential: true,
    });
    act(() => moveEnd?.());
    expect(result.current.marketTransitionActive).toBe(false);
  });

  it("cancels a queued market move when a newer market is selected", () => {
    const initial: [number, number] = [126.923, 37.56];
    const first: [number, number] = [126.919, 37.553];
    const latest: [number, number] = [126.913, 37.55];
    const animationFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");
    const stop = vi.fn();
    const easeTo = vi.fn();
    const { result } = renderHook(() => useMapViewport(initial));
    result.current.mapRef.current = {
      getMap: () => ({
        stop,
        easeTo,
        once: vi.fn(),
        off: vi.fn(),
      }),
    } as never;

    act(() => {
      result.current.transitionToMarket(first, vi.fn());
      result.current.transitionToMarket(latest, vi.fn());
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    act(() => animationFrames[1](0));
    expect(easeTo).toHaveBeenCalledOnce();
    expect(easeTo).toHaveBeenCalledWith(expect.objectContaining({ pitch: 0, bearing: 0 }));
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
