import { useCallback, useMemo, useState } from "react";
import { workflowWindowIds, type WindowId, type WindowPosition, type WindowSize } from "../data/windowRegistry";
import { resolveOpenWindowsAfterOpen, resolveOpenWindowsAfterOpenMany } from "../domain/windowCompatibilityPolicy";

export interface WindowRect extends WindowPosition, WindowSize {}

export interface WindowChromeProps {
  id: WindowId;
  position: WindowPosition;
  size: WindowSize | undefined;
  zIndex: number;
  isActive: boolean;
  onFocus: () => void;
  onMove: (position: WindowPosition) => void;
  onResize: (size: WindowSize) => void;
  onMeasure: (rect: WindowRect) => void;
  onMinimize: () => void;
  onClose: () => void;
}

const workflowWindowIdSet = new Set<WindowId>(workflowWindowIds);

function replaceWorkflowWindows(current: WindowId[], next: WindowId[]) {
  return [...current.filter((windowId) => !workflowWindowIdSet.has(windowId)), ...next];
}

export function useWindowManager(
  initialOpenWindows: WindowId[],
  initialPositions: Record<WindowId, WindowPosition>,
  initialSizes: Partial<Record<WindowId, WindowSize>> = {},
) {
  const [openWindows, setOpenWindows] = useState<WindowId[]>(initialOpenWindows);
  const [windowPositions, setWindowPositions] = useState<Record<WindowId, WindowPosition>>(initialPositions);
  const [windowSizes, setWindowSizes] = useState<Partial<Record<WindowId, WindowSize>>>(initialSizes);
  const [windowRects, setWindowRects] = useState<Partial<Record<WindowId, WindowRect>>>({});
  const [minimizedWindows, setMinimizedWindows] = useState<WindowId[]>([]);
  const [focusedWindow, setFocusedWindow] = useState<WindowId | null>(initialOpenWindows[initialOpenWindows.length - 1] ?? null);

  const visibleWindows = useMemo(
    () => openWindows.filter((windowId) => !minimizedWindows.includes(windowId)),
    [minimizedWindows, openWindows],
  );
  const activeWindow = focusedWindow && visibleWindows.includes(focusedWindow) ? focusedWindow : visibleWindows[visibleWindows.length - 1];

  const openWindow = useCallback((id: WindowId) => {
    setOpenWindows((current) => resolveOpenWindowsAfterOpen(current, id));
    setMinimizedWindows((current) => current.filter((windowId) => windowId !== id));
    setFocusedWindow(id);
  }, []);

  const closeWindow = useCallback((id: WindowId) => {
    setOpenWindows((current) => {
      const nextWindows = current.filter((windowId) => windowId !== id);
      setFocusedWindow((currentFocused) => (currentFocused === id ? nextWindows[nextWindows.length - 1] ?? null : currentFocused));
      return nextWindows;
    });
    setMinimizedWindows((current) => current.filter((windowId) => windowId !== id));
  }, []);

  const minimizeWindow = useCallback((id: WindowId) => {
    setMinimizedWindows((current) => (current.includes(id) ? current : [...current, id]));
    setFocusedWindow((currentFocused) => {
      if (currentFocused !== id) return currentFocused;
      const nextVisibleWindows = openWindows.filter((windowId) => windowId !== id && !minimizedWindows.includes(windowId));
      return nextVisibleWindows[nextVisibleWindows.length - 1] ?? null;
    });
  }, [minimizedWindows, openWindows]);

  const moveWindow = useCallback((id: WindowId, position: WindowPosition) => {
    setWindowPositions((current) => ({ ...current, [id]: position }));
  }, []);

  const resizeWindow = useCallback((id: WindowId, size: WindowSize) => {
    setWindowSizes((current) => ({ ...current, [id]: size }));
  }, []);

  const measureWindow = useCallback((id: WindowId, rect: WindowRect) => {
    setWindowRects((current) => {
      const previous = current[id];
      if (
        previous &&
        Math.abs(previous.x - rect.x) < 0.5 &&
        Math.abs(previous.y - rect.y) < 0.5 &&
        Math.abs(previous.width - rect.width) < 0.5 &&
        Math.abs(previous.height - rect.height) < 0.5
      ) {
        return current;
      }

      return { ...current, [id]: rect };
    });
  }, []);

  const setWorkflowWindows = useCallback((nextWindows: WindowId[]) => {
    setOpenWindows((current) => {
      const nextOpenWindows = replaceWorkflowWindows(current, nextWindows);
      const compatibleOpenWindows = resolveOpenWindowsAfterOpenMany(nextOpenWindows, nextWindows);
      setMinimizedWindows((minimized) => minimized.filter((windowId) => compatibleOpenWindows.includes(windowId) && !nextWindows.includes(windowId)));
      return compatibleOpenWindows;
    });
    setFocusedWindow(nextWindows[nextWindows.length - 1] ?? null);
  }, []);

  const resetOpenWindows = useCallback((nextWindows: WindowId[]) => {
    setOpenWindows(nextWindows);
    setMinimizedWindows([]);
    setFocusedWindow(nextWindows[nextWindows.length - 1] ?? null);
  }, []);

  const resetWindowPositions = useCallback(() => {
    setWindowPositions(initialPositions);
  }, [initialPositions]);

  const resetWindowLayout = useCallback(() => {
    setWindowPositions(initialPositions);
    setWindowSizes(initialSizes);
    setWindowRects({});
  }, [initialPositions, initialSizes]);

  const windowActions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(initialPositions).map((id) => {
          const windowId = id as WindowId;
          return [
            windowId,
            {
              onFocus: () => openWindow(windowId),
              onMove: (position: WindowPosition) => moveWindow(windowId, position),
              onResize: (size: WindowSize) => resizeWindow(windowId, size),
              onMeasure: (rect: WindowRect) => measureWindow(windowId, rect),
              onMinimize: () => minimizeWindow(windowId),
              onClose: () => closeWindow(windowId),
            },
          ];
        }),
      ) as Record<WindowId, Pick<WindowChromeProps, "onFocus" | "onMove" | "onResize" | "onMeasure" | "onMinimize" | "onClose">>,
    [closeWindow, initialPositions, measureWindow, minimizeWindow, moveWindow, openWindow, resizeWindow],
  );

  const windowChrome = useCallback((id: WindowId): WindowChromeProps => ({
    id,
    position: windowPositions[id],
    size: windowSizes[id],
    zIndex: (activeWindow === id ? 40 : 10) + openWindows.indexOf(id),
    isActive: activeWindow === id,
    ...windowActions[id],
  }), [activeWindow, openWindows, windowActions, windowPositions, windowSizes]);

  const isWindowVisible = useCallback(
    (id: WindowId) => openWindows.includes(id) && !minimizedWindows.includes(id),
    [minimizedWindows, openWindows],
  );

  return {
    activeWindow,
    isWindowVisible,
    closeWindow,
    openWindow,
    openWindows,
    resetOpenWindows,
    resetWindowLayout,
    resetWindowPositions,
    setWorkflowWindows,
    windowChrome,
    windowPositions,
    windowSizes,
    windowRects,
  };
}
