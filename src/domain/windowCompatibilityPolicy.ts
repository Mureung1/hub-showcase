import type { WindowId } from "../data/windowRegistry";

const questFlowWindows = new Set<WindowId>(["quest", "runner", "failure", "recovery"]);
const pixelTvWindows = new Set<WindowId>(["pixelTv"]);

export function resolveOpenWindowsAfterOpen(current: WindowId[], opening: WindowId): WindowId[] {
  const filtered = current.filter((windowId) => isCompatibleWindowPair(windowId, opening));
  return filtered.includes(opening) ? filtered : [...filtered, opening];
}

export function resolveOpenWindowsAfterOpenMany(current: WindowId[], opening: WindowId[]): WindowId[] {
  return opening.reduce((nextWindows, windowId) => resolveOpenWindowsAfterOpen(nextWindows, windowId), current);
}

function isCompatibleWindowPair(left: WindowId, right: WindowId): boolean {
  if (left === right) return true;
  if (pixelTvWindows.has(left) && questFlowWindows.has(right)) return false;
  if (questFlowWindows.has(left) && pixelTvWindows.has(right)) return false;
  return true;
}
