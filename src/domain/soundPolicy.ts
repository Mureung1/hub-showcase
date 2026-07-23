import type { SoundAsset } from "../data/assetManifest";

export type SoundEvent = SoundAsset["event"];

export function resolveSoundAssetId(assets: SoundAsset[], event: SoundEvent, soundEnabled: boolean): string | null {
  if (!soundEnabled) return null;
  return assets.find((asset) => asset.event === event)?.id ?? null;
}
