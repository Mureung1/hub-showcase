import { describe, expect, it } from "vitest";
import { hasPetAnimationAsset, interactionObjectAssets, resolveDesktopPetSpriteState, resolveSupportedPetAnimationState } from "./assetManifest";

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

  it("keeps the in-window pet idle unless the user hovers it", () => {
    expect(resolveDesktopPetSpriteState("happy", false)).toBe("idle");
    expect(resolveDesktopPetSpriteState("recovering", false)).toBe("idle");
    expect(resolveDesktopPetSpriteState("focused", false)).toBe("idle");
    expect(resolveDesktopPetSpriteState("waiting", false)).toBe("idle");
    expect(resolveDesktopPetSpriteState("waiting", true)).toBe("happy");
  });

  it("uses the generated platform base asset as the platform object source", () => {
    const platformAsset = interactionObjectAssets.find((asset) => asset.type === "platform");

    expect(platformAsset?.src).toBe("/assets/interaction-objects/platform/base.png");
  });
});
