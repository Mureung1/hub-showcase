import { describe, expect, it } from "vitest";
import { getRuntimeFallbacksByArea, runtimeFallbacks } from "./runtimeFallbacks";

describe("runtime fallbacks", () => {
  it("tracks placeholder and rule fallback behavior explicitly", () => {
    expect(runtimeFallbacks.map((fallback) => fallback.id)).toEqual(
      expect.arrayContaining([
        "stat-evaluation-rule-fallback",
        "manager-behavior-rule-fallback",
        "cyber-purr-placeholder-sound",
        "stage-asset-motion-fallback",
      ]),
    );
  });

  it("groups fallbacks by runtime area", () => {
    expect(getRuntimeFallbacksByArea("sound").map((fallback) => fallback.id)).toEqual(["cyber-purr-placeholder-sound"]);
  });
});
