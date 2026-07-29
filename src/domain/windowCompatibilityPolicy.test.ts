import { describe, expect, it } from "vitest";
import { resolveOpenWindowsAfterOpen } from "./windowCompatibilityPolicy";

describe("window compatibility policy", () => {
  it("keeps Pixel TV compatible with journal and interaction object windows", () => {
    expect(resolveOpenWindowsAfterOpen(["journal", "ladderObject", "platformObject"], "pixelTv")).toEqual([
      "journal",
      "ladderObject",
      "platformObject",
      "pixelTv",
    ]);
  });

  it("closes quest flow windows when Pixel TV opens", () => {
    expect(resolveOpenWindowsAfterOpen(["quest", "runner", "manager"], "pixelTv")).toEqual(["manager", "pixelTv"]);
  });

  it("closes Pixel TV when a quest flow window opens", () => {
    expect(resolveOpenWindowsAfterOpen(["pixelTv", "journal", "manager"], "quest")).toEqual(["journal", "manager", "quest"]);
  });
});
