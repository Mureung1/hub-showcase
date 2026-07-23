import { describe, expect, it } from "vitest";
import type { SoundAsset } from "../data/assetManifest";
import { resolveSoundAssetId } from "./soundPolicy";

const sounds: SoundAsset[] = [
  { id: "complete-soft", src: "/sounds/complete.webm", event: "complete", defaultVolume: 0.4, mutedByDefault: true },
  { id: "cyber-purr", src: "/sounds/purr.webm", event: "cyber_purr", defaultVolume: 0.35, mutedByDefault: true },
];

describe("sound policy", () => {
  it("does not resolve a sound while sound is disabled", () => {
    expect(resolveSoundAssetId(sounds, "complete", false)).toBeNull();
  });

  it("resolves the matching sound when sound is enabled", () => {
    expect(resolveSoundAssetId(sounds, "complete", true)).toBe("complete-soft");
    expect(resolveSoundAssetId(sounds, "cyber_purr", true)).toBe("cyber-purr");
  });

  it("returns null when a matching sound asset is missing", () => {
    expect(resolveSoundAssetId(sounds, "level_up", true)).toBeNull();
  });
});
