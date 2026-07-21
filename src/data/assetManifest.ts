export type LumiSpriteState =
  | "idle"
  | "focused"
  | "happy"
  | "recovering"
  | "resting"
  | "hover"
  | "hanging"
  | "hiding";
export type PetAnimationState = Exclude<LumiSpriteState, "resting">;
export type LumiMood = "waiting" | "focused" | "happy" | "recovering";
export type PetId = "planaria";
export type PetStageId = "stage-1";

export interface SpriteAnchor {
  type: "float" | "top-grip" | "peek-edge";
  x: number;
  y: number;
}

export interface SpriteAnimationAsset {
  id: string;
  petId?: PetId;
  stage?: PetStageId;
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  states: LumiSpriteState[];
  reducedMotionFrame: number;
  anchor: SpriteAnchor;
}

export type DesktopIconId =
  | "quest"
  | "runner"
  | "recovery"
  | "manager"
  | "profile"
  | "journal"
  | "trash"
  | "rewards"
  | "theme-settings"
  | "pixel-tv";

export interface DesktopIconAsset {
  id: DesktopIconId;
  idleSrc: string;
  hoverSrc: string;
  activeSrc: string;
  disabledSrc: string;
}

export interface ThemeAsset {
  id: string;
  name: string;
  unlockCondition: {
    type: "level" | "event_count" | "reward";
    value: number | string;
  };
  wallpaperSrc: string;
  previewSrc: string;
  windowSkin: {
    titlebarTop: string;
    titlebarBottom: string;
    border: string;
    surface: string;
    taskbar: string;
  };
}

export interface RewardAsset {
  id: string;
  type: "object" | "theme" | "accessory" | "memory_fragment" | "sound";
  src: string;
  unlockedBy: string;
  hoverFx?: string;
}

export interface FutureAssetSlot {
  id: string;
  feature: "pixel-tv" | "social-world" | "gestures" | "sound";
  promptDoc: string;
  status: "prompt-ready" | "manifest-slot-only";
  iconId?: DesktopIconId;
}

const planariaStage1Path = "/assets/lumi/planaria-stage-1";
const planariaFloatAnchor: SpriteAnchor = { type: "float", x: 32, y: 60 };

const planariaStage1Animation = (
  state: PetAnimationState,
  fps: number,
  anchor: SpriteAnchor = planariaFloatAnchor,
): SpriteAnimationAsset => ({
  id: `planaria-stage-1-${state}`,
  petId: "planaria",
  stage: "stage-1",
  src: `${planariaStage1Path}/planaria-stage-1-${state}-sheet.png`,
  sheetWidth: 256,
  sheetHeight: 64,
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 4,
  fps,
  loop: true,
  states: [state],
  reducedMotionFrame: 0,
  anchor,
});

export const petAnimationCatalog = {
  planaria: {
    "stage-1": {
      idle: planariaStage1Animation("idle", 4),
      focused: planariaStage1Animation("focused", 6),
      happy: planariaStage1Animation("happy", 6),
      recovering: planariaStage1Animation("recovering", 4),
      hover: planariaStage1Animation("hover", 7),
      hanging: planariaStage1Animation("hanging", 6, { type: "top-grip", x: 32, y: 5 }),
      hiding: planariaStage1Animation("hiding", 5, { type: "peek-edge", x: 53, y: 32 }),
    },
  },
} as const satisfies Record<PetId, Record<PetStageId, Record<PetAnimationState, SpriteAnimationAsset>>>;

export const lumiAnimations: Record<LumiSpriteState, SpriteAnimationAsset> = {
  idle: petAnimationCatalog.planaria["stage-1"].idle,
  focused: petAnimationCatalog.planaria["stage-1"].focused,
  happy: petAnimationCatalog.planaria["stage-1"].happy,
  recovering: petAnimationCatalog.planaria["stage-1"].recovering,
  resting: {
    ...petAnimationCatalog.planaria["stage-1"].idle,
    id: "planaria-stage-1-resting-fallback",
    fps: 3,
    states: ["resting"],
  },
  hover: petAnimationCatalog.planaria["stage-1"].hover,
  hanging: petAnimationCatalog.planaria["stage-1"].hanging,
  hiding: petAnimationCatalog.planaria["stage-1"].hiding,
};

const lumiSpritePath = "/assets/lumi";

export const legacyLumiAnimations: Record<LumiSpriteState, SpriteAnimationAsset> = {
  idle: {
    id: "lumi-idle",
    src: `${lumiSpritePath}/lumi-idle-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 4,
    loop: true,
    states: ["idle"],
    reducedMotionFrame: 0,
    anchor: planariaFloatAnchor,
  },
  focused: {
    id: "lumi-focused",
    src: `${lumiSpritePath}/lumi-focused-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
    loop: true,
    states: ["focused"],
    reducedMotionFrame: 0,
    anchor: planariaFloatAnchor,
  },
  happy: {
    id: "lumi-happy",
    src: `${lumiSpritePath}/lumi-happy-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
    loop: true,
    states: ["happy"],
    reducedMotionFrame: 1,
    anchor: planariaFloatAnchor,
  },
  recovering: {
    id: "lumi-recovering",
    src: `${lumiSpritePath}/lumi-recovering-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 4,
    loop: true,
    states: ["recovering"],
    reducedMotionFrame: 0,
    anchor: planariaFloatAnchor,
  },
  resting: {
    id: "lumi-resting",
    src: `${lumiSpritePath}/lumi-resting-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 3,
    loop: true,
    states: ["resting"],
    reducedMotionFrame: 0,
    anchor: planariaFloatAnchor,
  },
  hover: {
    id: "lumi-hover",
    src: `${lumiSpritePath}/lumi-hover-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 7,
    loop: true,
    states: ["hover"],
    reducedMotionFrame: 0,
    anchor: planariaFloatAnchor,
  },
  hanging: {
    id: "lumi-hanging",
    src: `${lumiSpritePath}/lumi-hanging-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
    loop: true,
    states: ["hanging"],
    reducedMotionFrame: 1,
    anchor: { type: "top-grip", x: 32, y: 5 },
  },
  hiding: {
    id: "lumi-hiding",
    src: `${lumiSpritePath}/lumi-hiding-sheet.png`,
    sheetWidth: 256,
    sheetHeight: 64,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 5,
    loop: true,
    states: ["hiding"],
    reducedMotionFrame: 1,
    anchor: { type: "peek-edge", x: 53, y: 32 },
  },
};

export const lumiGrowthAssets = [
  { id: "lumi-growth-01", src: `${lumiSpritePath}/lumi-growth-01.png`, minLevel: 1 },
  { id: "lumi-growth-02", src: `${lumiSpritePath}/lumi-growth-02.png`, minLevel: 3 },
  { id: "lumi-growth-03", src: `${lumiSpritePath}/lumi-growth-03.png`, minLevel: 5 },
] as const;

export const lumiMoodToSpriteState: Record<LumiMood, LumiSpriteState> = {
  waiting: "idle",
  focused: "focused",
  happy: "happy",
  recovering: "recovering",
};

const twoStateIcon = (id: DesktopIconId): DesktopIconAsset => ({
  id,
  idleSrc: `/assets/icons/${id}-idle-pixel-v2.png`,
  hoverSrc: `/assets/icons/${id}-hover-pixel-v2.png`,
  activeSrc: `/assets/icons/${id}-hover-pixel-v2.png`,
  disabledSrc: `/assets/icons/${id}-idle-pixel-v2.png`,
});

export const desktopIconAssets: Record<DesktopIconId, DesktopIconAsset> = {
  quest: twoStateIcon("quest"),
  runner: twoStateIcon("runner"),
  recovery: twoStateIcon("recovery"),
  manager: twoStateIcon("manager"),
  profile: twoStateIcon("profile"),
  journal: twoStateIcon("journal"),
  trash: twoStateIcon("trash"),
  rewards: twoStateIcon("rewards"),
  "theme-settings": twoStateIcon("theme-settings"),
  "pixel-tv": twoStateIcon("pixel-tv"),
};

export const themeAssets: ThemeAsset[] = [
  {
    id: "xp-meadow-default",
    name: "XP meadow default",
    unlockCondition: { type: "level", value: 1 },
    wallpaperSrc: "/assets/background/background.png",
    previewSrc: "/assets/themes/wallpapers/xp-meadow-default-preview.png",
    windowSkin: {
      titlebarTop: "#2a8bf2",
      titlebarBottom: "#0645a5",
      border: "#003c74",
      surface: "#ece9d8",
      taskbar: "#075ed8",
    },
  },
];

export const rewardAssets: RewardAsset[] = [
  {
    id: "reward-object-sheet",
    type: "object",
    src: "/assets/rewards/reward-object-sheet.png",
    unlockedBy: "quest_completed",
    hoverFx: "/assets/fx/quest-complete-sheet.png",
  },
  {
    id: "memory-fragment-sheet",
    type: "memory_fragment",
    src: "/assets/memory-fragments/memory-fragment-sheet.png",
    unlockedBy: "recovery_completed",
    hoverFx: "/assets/fx/recovery-success-sheet.png",
  },
];

export const futureAssetSlots: FutureAssetSlot[] = [
  {
    id: "pixel-tv-frame",
    feature: "pixel-tv",
    promptDoc: "docs/asset-prompts/06-pixel-tv/reality-pixel-tv.md",
    status: "prompt-ready",
    iconId: "pixel-tv",
  },
  {
    id: "public-quest-field",
    feature: "social-world",
    promptDoc: "docs/asset-prompts/05-social-world/flower-field.md",
    status: "manifest-slot-only",
  },
  {
    id: "hand-gesture-cursors",
    feature: "gestures",
    promptDoc: "docs/dynamic-asset-requirements.md",
    status: "manifest-slot-only",
  },
  {
    id: "muted-sound-set",
    feature: "sound",
    promptDoc: "docs/dynamic-asset-requirements.md",
    status: "manifest-slot-only",
  },
];

export function getLumiAnimationAsset(state: LumiSpriteState) {
  return lumiAnimations[state];
}

export function getPetAnimationAsset(petId: PetId, stage: PetStageId, state: PetAnimationState) {
  return petAnimationCatalog[petId][stage][state];
}

export function getDesktopIconAsset(id: DesktopIconId) {
  return desktopIconAssets[id];
}
