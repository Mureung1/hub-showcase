import { describe, expect, it } from "vitest";
import { defaultOpenWindowIds, workflowWindowIds, windowIds, windowRegistry } from "./windowRegistry";

describe("window registry", () => {
  it("keeps a complete spec for every app window", () => {
    expect(Object.keys(windowRegistry).sort()).toEqual([...windowIds].sort());

    for (const id of windowIds) {
      expect(windowRegistry[id].label.length).toBeGreaterThan(0);
      expect(windowRegistry[id].titleIcon.length).toBeGreaterThan(0);
      expect(windowRegistry[id].initialPosition.x).toBeGreaterThanOrEqual(0);
      expect(windowRegistry[id].initialPosition.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps workflow and default open windows inside the registry", () => {
    for (const id of [...workflowWindowIds, ...defaultOpenWindowIds]) {
      expect(windowRegistry[id]).toBeDefined();
    }
  });

  it("keeps the ladder object window wide enough for its icon content", () => {
    expect(windowRegistry.ladderObject.initialSize?.width).toBeGreaterThanOrEqual(104);
  });

  it("sizes Pixel TV as a world object instead of a tall control panel", () => {
    expect(windowRegistry.pixelTv.initialSize).toEqual({ width: 780, height: 780 });
  });
});
