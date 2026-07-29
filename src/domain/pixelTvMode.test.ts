import { describe, expect, it } from "vitest";
import { normalizePixelTvMode, resetPixelTvMode, togglePixelTvMode } from "./pixelTvMode";

describe("pixel tv mode", () => {
  it("toggles between default and projection mode", () => {
    expect(togglePixelTvMode("default")).toBe("projection");
    expect(togglePixelTvMode("projection")).toBe("default");
  });

  it("normalizes unknown stored values to default mode", () => {
    expect(normalizePixelTvMode("projection")).toBe("projection");
    expect(normalizePixelTvMode("bad-value")).toBe("default");
    expect(normalizePixelTvMode(null)).toBe("default");
  });

  it("resets projection state back to default mode", () => {
    expect(resetPixelTvMode()).toBe("default");
  });
});
