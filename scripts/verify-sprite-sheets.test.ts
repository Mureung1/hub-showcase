import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("sprite sheet verifier", () => {
  it("prints alpha and frame bounding box diagnostics for sprite placement review", () => {
    const output = execFileSync("node", ["scripts/verify-sprite-sheets.mjs"], {
      encoding: "utf8",
      windowsHide: true,
    });

    expect(output).toContain("alpha=");
    expect(output).toContain("bbox=");
    expect(output).toContain("cornerOpaque=");
  });
});
