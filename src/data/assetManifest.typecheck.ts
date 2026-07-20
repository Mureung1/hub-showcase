import {
  desktopIconAssets,
  getDesktopIconAsset,
  getLumiAnimationAsset,
  lumiMoodToSpriteState,
  rewardAssets,
  themeAssets,
  type DesktopIconId,
} from "./assetManifest";

type Assert<T extends true> = T;

const requiredIconIds = [
  "quest",
  "runner",
  "recovery",
  "manager",
  "profile",
  "journal",
  "trash",
  "rewards",
  "theme-settings",
  "pixel-tv",
] as const satisfies readonly DesktopIconId[];

type _QuestIconExists = Assert<"quest" extends keyof typeof desktopIconAssets ? true : false>;
type _ThemeSettingsIconExists = Assert<"theme-settings" extends keyof typeof desktopIconAssets ? true : false>;
type _PixelTvIconExists = Assert<"pixel-tv" extends keyof typeof desktopIconAssets ? true : false>;

for (const iconId of requiredIconIds) {
  const icon = getDesktopIconAsset(iconId);
  if (!icon.idleSrc || !icon.hoverSrc || !icon.activeSrc || !icon.disabledSrc) {
    throw new Error(`Missing desktop icon state asset for ${iconId}`);
  }
}

const waitingState = lumiMoodToSpriteState.waiting;
if (waitingState !== "idle") {
  throw new Error("waiting mood must map to idle Lumi animation");
}

for (const state of ["idle", "focused", "happy", "recovering", "resting", "hover", "hanging", "hiding"] as const) {
  const animation = getLumiAnimationAsset(state);
  if (animation.frameWidth !== 64 || animation.frameHeight !== 64 || animation.frameCount < 1) {
    throw new Error(`Invalid Lumi animation metadata for ${state}`);
  }
}

if (rewardAssets.length === 0 || themeAssets.length === 0) {
  throw new Error("Dynamic MVP asset manifest must include reward and theme sample data");
}
