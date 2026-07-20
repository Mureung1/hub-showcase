export type LumiSpriteState =
  | "idle"
  | "focused"
  | "happy"
  | "recovering"
  | "resting"
  | "hover"
  | "hanging"
  | "hiding";
export type LumiMood = "waiting" | "focused" | "happy" | "recovering";

export interface SpriteAnimationAsset {
  id: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  states: LumiSpriteState[];
  reducedMotionFrame: number;
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

const lumiSpritePath = "/assets/lumi";

export const lumiAnimations: Record<LumiSpriteState, SpriteAnimationAsset> = {
  idle: {
    id: "lumi-idle",
    src: `${lumiSpritePath}/lumi-idle-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 4,
    loop: true,
    states: ["idle"],
    reducedMotionFrame: 0,
  },
  focused: {
    id: "lumi-focused",
    src: `${lumiSpritePath}/lumi-focused-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
    loop: true,
    states: ["focused"],
    reducedMotionFrame: 0,
  },
  happy: {
    id: "lumi-happy",
    src: `${lumiSpritePath}/lumi-happy-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
    loop: true,
    states: ["happy"],
    reducedMotionFrame: 1,
  },
  recovering: {
    id: "lumi-recovering",
    src: `${lumiSpritePath}/lumi-recovering-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 4,
    loop: true,
    states: ["recovering"],
    reducedMotionFrame: 0,
  },
  resting: {
    id: "lumi-resting",
    src: `${lumiSpritePath}/lumi-resting-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 3,
    loop: true,
    states: ["resting"],
    reducedMotionFrame: 0,
  },
  hover: {
    id: "lumi-hover",
    src: `${lumiSpritePath}/lumi-hover-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 7,
    loop: true,
    states: ["hover"],
    reducedMotionFrame: 0,
  },
  hanging: {
    id: "lumi-hanging",
    src: `${lumiSpritePath}/lumi-hanging-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
    loop: true,
    states: ["hanging"],
    reducedMotionFrame: 1,
  },
  hiding: {
    id: "lumi-hiding",
    src: `${lumiSpritePath}/lumi-hiding-sheet.png`,
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 5,
    loop: true,
    states: ["hiding"],
    reducedMotionFrame: 1,
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

export function getDesktopIconAsset(id: DesktopIconId) {
  return desktopIconAssets[id];
}
