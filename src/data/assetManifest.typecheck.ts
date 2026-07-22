import {
  desktopIconAssets,
  futureAssetSlots,
  defaultLumiPetId,
  getDesktopIconAsset,
  getLumiAnimationAsset,
  getPetAnimationAsset,
  getRenderablePetStage,
  getUnlockedPetStages,
  interactionObjectAssets,
  lumiMoodToSpriteState,
  petAnimationCatalog,
  projectionModeAssets,
  resolvePetStageFromLevel,
  rewardAssets,
  soundAssets,
  themeAssets,
  type DesktopIconId,
  type PetAnimationState,
  type PetId,
  type PetStageId,
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
type _PlanariaPetExists = Assert<"planaria" extends keyof typeof petAnimationCatalog ? true : false>;
type _PinkManagerPetExists = Assert<"pink-manager" extends keyof typeof petAnimationCatalog ? true : false>;

const activePetId = "pink-manager" as const satisfies PetId;
const activeStageId = "stage-1" as const satisfies PetStageId;
const stage1PetIds = [
  "pink-manager",
  "white-headed-long-tailed-tit",
  "costasiella-kuroshimae",
  "sea-bunny-slug",
  "platypus",
  "axolotl",
  "glass-frog",
  "fried-egg-jellyfish",
  "yeti-crab",
] as const satisfies readonly PetId[];
const stage1MotionStates = [
  "idle",
  "focused",
  "happy",
  "recovering",
  "hanging",
  "hiding",
  "run",
  "jump",
  "walk",
  "climbing",
] as const satisfies readonly PetAnimationState[];

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
  const animation = getLumiAnimationAsset(state, defaultLumiPetId, activeStageId);
  if (animation.frameWidth !== 64 || animation.frameHeight !== 64 || animation.frameCount < 1) {
    throw new Error(`Invalid Lumi animation metadata for ${state}`);
  }
}

if (resolvePetStageFromLevel(3) !== "stage-2" || !getUnlockedPetStages(6).includes("stage-3")) {
  throw new Error("Pet stage unlock rules must follow level thresholds");
}

if (getRenderablePetStage(defaultLumiPetId, "stage-2") !== "stage-1") {
  throw new Error("Stage-2 must fall back to renderable stage-1 until stage-2 sheets are added");
}

for (const state of ["idle", "focused", "happy", "recovering", "hanging", "hiding"] as const) {
  const animation = getPetAnimationAsset(activePetId, activeStageId, state);
  const expectedWidth = animation.frameCount * animation.frameWidth;
  if (animation.sheetWidth !== expectedWidth || animation.sheetHeight !== 64 || animation.frameHeight !== 64) {
    throw new Error(`Invalid active Lumi stage-1 animation metadata for ${state}`);
  }
}

for (const petId of stage1PetIds) {
  for (const state of stage1MotionStates) {
    const animation = getPetAnimationAsset(petId, activeStageId, state);
    const expectedWidth = animation.frameCount * animation.frameWidth;

    if (animation.sheetWidth !== expectedWidth || animation.sheetHeight !== 64 || animation.frameHeight !== 64) {
      throw new Error(`Invalid variable-frame metadata for ${petId}/${state}`);
    }

    for (const playbackFrame of animation.playbackFrames ?? []) {
      if (playbackFrame.frame < 0 || playbackFrame.frame >= animation.frameCount) {
        throw new Error(`Invalid playback frame for ${petId}/${state}`);
      }
    }
  }
}

if (rewardAssets.length === 0 || themeAssets.length === 0) {
  throw new Error("Dynamic MVP asset manifest must include reward and theme sample data");
}

if (soundAssets.length === 0 || interactionObjectAssets.length < 2 || projectionModeAssets.length === 0) {
  throw new Error("Dynamic MVP asset manifest must include sound, interaction object, and projection slots");
}

if (!futureAssetSlots.some((slot) => slot.feature === "projection" && slot.iconId === "pixel-tv")) {
  throw new Error("Pixel TV projection mode must be represented as a future asset slot");
}

if (!futureAssetSlots.some((slot) => slot.feature === "interaction-object")) {
  throw new Error("Character interaction objects must be represented as future asset slots");
}
