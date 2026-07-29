import { describe, expect, it } from "vitest";
import { hasPetAnimationAsset, resolveSupportedPetAnimationState } from "./assetManifest";

describe("asset manifest", () => {
  it("reports only exact pet animation assets as available", () => {
    expect(hasPetAnimationAsset("pink-manager", "stage-1", "idle")).toBe(true);
    expect(hasPetAnimationAsset("pink-manager", "stage-1", "jump")).toBe(false);
  });

  it("falls back to the same pet and stage idle state before using another sprite", () => {
    expect(resolveSupportedPetAnimationState("pink-manager", "stage-1", "jump")).toBe("idle");
  });

  it("keeps supported animation states unchanged", () => {
    expect(resolveSupportedPetAnimationState("glass-frog", "stage-2", "jump")).toBe("jump");
  });
});
