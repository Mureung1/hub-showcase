import { describe, expect, it } from "vitest";
import {
  getDesktopIconAsset,
  getLumiAnimationAsset,
  getPetAnimationAsset,
  hasPetAnimationAsset,
  interactionObjectAssets,
  resolvePixelTvWatchingAnimationAsset,
  resolveDesktopPetSpriteState,
  resolvePetStageFromLevel,
  resolveSupportedPetAnimationState,
} from "./assetManifest";

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

  it("switches pink manager runtime animations to stage 2 at level 2", () => {
    const stage = resolvePetStageFromLevel(2);

    expect(stage).toBe("stage-2");
    expect(getLumiAnimationAsset("idle", "pink-manager", stage).src).toBe("/assets/lumi/pink-manager-stage-2/pink-manager-stage-2-idle-sheet.png");
  });

  it("promotes selected stage 2 production candidates into the runtime manager catalog", () => {
    expect(getLumiAnimationAsset("idle", "costasiella-kuroshimae", "stage-2").src).toBe(
      "/assets/lumi/costasiella-kuroshimae-stage-2-production-candidates/costasiella-kuroshimae-stage-2-idle-sheet-v1.png",
    );
    expect(getLumiAnimationAsset("hanging", "costasiella-kuroshimae", "stage-2").src).toBe(
      "/assets/lumi/costasiella-kuroshimae-stage-2-production-candidates/costasiella-kuroshimae-stage-2-hanging-sheet-v2.png",
    );
    expect(getLumiAnimationAsset("idle", "fried-egg-jellyfish", "stage-2").src).toBe(
      "/assets/lumi/fried-egg-jellyfish-stage-2-production-candidates/fried-egg-jellyfish-stage-2-idle-sheet-v1.png",
    );
    expect(getPetAnimationAsset("sea-bunny-slug", "stage-2", "climbing").src).toBe(
      "/assets/lumi/sea-bunny-slug-stage-2-production-candidates/sea-bunny-slug-stage-2-climbing-sheet-v2.png",
    );
  });

  it("tracks the pink manager watching candidate without requiring every manager to provide it", () => {
    expect(hasPetAnimationAsset("pink-manager", "stage-2", "watching")).toBe(true);
    expect(hasPetAnimationAsset("glass-frog", "stage-2", "watching")).toBe(false);
  });

  it("keeps the pink manager watching sheet in the runtime sprite-sheet shape", () => {
    expect(getPetAnimationAsset("pink-manager", "stage-2", "watching")).toMatchObject({
      src: "/assets/lumi/pink-manager-stage-2-production-candidates/pink-manager-stage-2-watching-sheet-v1.png",
      sheetWidth: 256,
      sheetHeight: 64,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 4,
      fps: 5,
      states: ["watching"],
    });
  });

  it("alternates Pixel TV watching between focused and happy every ten seconds", () => {
    expect(resolvePixelTvWatchingAnimationAsset("glass-frog", "stage-2", 0).animation.states).toEqual(["focused"]);
    expect(resolvePixelTvWatchingAnimationAsset("glass-frog", "stage-2", 9_999).animation.states).toEqual(["focused"]);
    expect(resolvePixelTvWatchingAnimationAsset("glass-frog", "stage-2", 10_000).animation.states).toEqual(["happy"]);
    expect(resolvePixelTvWatchingAnimationAsset("glass-frog", "stage-2", 19_999).animation.states).toEqual(["happy"]);
    expect(resolvePixelTvWatchingAnimationAsset("glass-frog", "stage-2", 20_000).animation.states).toEqual(["focused"]);
  });

  it("shows the Pixel TV watching reaction for every manager", () => {
    expect(resolvePixelTvWatchingAnimationAsset("pink-manager", "stage-1", 0).hasWatchingReaction).toBe(true);
    expect(resolvePixelTvWatchingAnimationAsset("glass-frog", "stage-2", 10_000).hasWatchingReaction).toBe(true);
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

  it("registers the manager swap icon candidate as a reusable desktop icon asset", () => {
    expect(getDesktopIconAsset("pet-swap").idleSrc).toBe("/assets/icons/pet_swap_icon_64px.png");
  });
});
