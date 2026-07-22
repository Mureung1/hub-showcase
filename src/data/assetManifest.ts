export type LumiSpriteState =
  | "idle"
  | "focused"
  | "happy"
  | "recovering"
  | "resting"
  | "hover"
  | "hanging"
  | "hiding";
export type PetMotionState =
  | "idle"
  | "focused"
  | "happy"
  | "recovering"
  | "hanging"
  | "hiding"
  | "run"
  | "jump"
  | "walk"
  | "climbing";
export type PetAnimationState = PetMotionState | "hover";
export type LumiMood = "waiting" | "focused" | "happy" | "recovering";
export type PetId =
  | "planaria"
  | "pink-manager"
  | "white-headed-long-tailed-tit"
  | "costasiella-kuroshimae"
  | "sea-bunny-slug"
  | "platypus"
  | "axolotl"
  | "glass-frog"
  | "fried-egg-jellyfish"
  | "yeti-crab";
export type PetStageId = "stage-1" | "stage-2" | "stage-3" | "stage-4";

export interface SpriteAnchor {
  type: "float" | "top-grip" | "peek-edge";
  x: number;
  y: number;
}

export interface SpritePlaybackFrame {
  frame: number;
  mirrorX?: boolean;
  hold?: number;
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
  states: (LumiSpriteState | PetMotionState)[];
  reducedMotionFrame: number;
  playbackFrames?: SpritePlaybackFrame[];
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

export interface SoundAsset {
  id: string;
  src: string;
  event:
    | "complete"
    | "recovery"
    | "level_up"
    | "hover"
    | "open_window"
    | "cyber_purr"
    | "blink_transition"
    | "climb"
    | "jump"
    | "window_escape";
  defaultVolume: number;
  mutedByDefault: boolean;
}

export interface InteractionObjectAsset {
  id: string;
  type: "ladder" | "platform" | "window_escape_edge";
  src: string;
  hoverSrc?: string;
  resizeAxis: "vertical" | "horizontal" | "none";
  anchorPoints: Array<"top" | "bottom" | "left" | "right" | "center">;
}

export interface ProjectionModeAsset {
  id: string;
  mode: "single_plane_pepper";
  iconId: DesktopIconId;
  connectedIconSrc: string;
  projectionRoot: string;
  defaultSpriteId: string;
  background: "#000000";
  glowStrength: "medium" | "high";
  reducedMotion: "fade" | "still";
}

export interface FutureAssetSlot {
  id: string;
  feature: "pixel-tv" | "projection" | "social-world" | "gestures" | "sound" | "interaction-object";
  promptDoc: string;
  status: "prompt-ready" | "manifest-slot-only";
  iconId?: DesktopIconId;
}

const planariaStage1Path = "/assets/lumi/planaria-stage-1";
const planariaFloatAnchor: SpriteAnchor = { type: "float", x: 32, y: 60 };
const stage1PetFloatAnchor: SpriteAnchor = { type: "float", x: 32, y: 58 };
const stage1PetHangingAnchor: SpriteAnchor = { type: "top-grip", x: 32, y: 5 };
const stage1PetHidingAnchor: SpriteAnchor = { type: "peek-edge", x: 53, y: 32 };
export const defaultLumiPetId = "pink-manager" as const satisfies PetId;
export const fallbackLumiStage = "stage-1" as const satisfies PetStageId;
export const petStageUnlockLevels: Record<PetStageId, number> = {
  "stage-1": 1,
  "stage-2": 3,
  "stage-3": 6,
  "stage-4": 10,
};

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

interface Stage1MotionSpec {
  state: PetMotionState;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchor: SpriteAnchor;
  playbackFrames?: SpritePlaybackFrame[];
}

const stage1PetMotionSpecs = [
  { state: "idle", frameCount: 4, fps: 4, loop: true, anchor: stage1PetFloatAnchor },
  { state: "focused", frameCount: 4, fps: 6, loop: true, anchor: stage1PetFloatAnchor },
  { state: "happy", frameCount: 6, fps: 8, loop: true, anchor: stage1PetFloatAnchor },
  { state: "recovering", frameCount: 4, fps: 4, loop: true, anchor: stage1PetFloatAnchor },
  { state: "hanging", frameCount: 6, fps: 6, loop: true, anchor: stage1PetHangingAnchor },
  { state: "hiding", frameCount: 6, fps: 5, loop: true, anchor: stage1PetHidingAnchor },
  {
    state: "run",
    frameCount: 6,
    fps: 10,
    loop: true,
    anchor: stage1PetFloatAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5 }, { frame: 2 }, { frame: 1 }],
  },
  {
    state: "jump",
    frameCount: 6,
    fps: 8,
    loop: false,
    anchor: stage1PetFloatAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2, hold: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5, hold: 2 }],
  },
  {
    state: "walk",
    frameCount: 6,
    fps: 7,
    loop: true,
    anchor: stage1PetFloatAnchor,
    playbackFrames: [
      { frame: 0 },
      { frame: 1 },
      { frame: 0 },
      { frame: 2 },
      { frame: 0, mirrorX: true },
      { frame: 3 },
      { frame: 0, mirrorX: true },
      { frame: 4 },
      { frame: 0 },
      { frame: 5 },
    ],
  },
  {
    state: "climbing",
    frameCount: 6,
    fps: 8,
    loop: true,
    anchor: stage1PetHangingAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5 }, { frame: 4 }, { frame: 3 }],
  },
] as const satisfies readonly Stage1MotionSpec[];

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
] as const;

const stage1PetAnimation = (petId: (typeof stage1PetIds)[number], spec: Stage1MotionSpec): SpriteAnimationAsset => ({
  id: `${petId}-stage-1-${spec.state}`,
  petId,
  stage: "stage-1",
  src: `/assets/lumi/${petId}-stage-1/${petId}-stage-1-${spec.state}-sheet.png`,
  sheetWidth: spec.frameCount * 64,
  sheetHeight: 64,
  frameWidth: 64,
  frameHeight: 64,
  frameCount: spec.frameCount,
  fps: spec.fps,
  loop: spec.loop,
  states: [spec.state],
  reducedMotionFrame: 0,
  playbackFrames: spec.playbackFrames ? [...spec.playbackFrames] : undefined,
  anchor: spec.anchor,
});

const stage1PetCatalog = Object.fromEntries(
  stage1PetIds.map((petId) => [
    petId,
    {
      "stage-1": Object.fromEntries(stage1PetMotionSpecs.map((spec) => [spec.state, stage1PetAnimation(petId, spec)])),
    },
  ]),
) as {
  [K in (typeof stage1PetIds)[number]]: {
    "stage-1": Record<PetMotionState, SpriteAnimationAsset>;
  };
};

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
  ...stage1PetCatalog,
} as const satisfies Record<PetId, Partial<Record<PetStageId, Partial<Record<PetAnimationState, SpriteAnimationAsset>>>>>;

function getAvailablePetStage(petId: PetId, stage: PetStageId): PetStageId {
  const catalog = petAnimationCatalog[petId] as Partial<Record<PetStageId, Partial<Record<PetAnimationState, SpriteAnimationAsset>>>>;
  return catalog[stage] ? stage : fallbackLumiStage;
}

export function resolvePetStageFromLevel(level: number): PetStageId {
  if (level >= petStageUnlockLevels["stage-4"]) return "stage-4";
  if (level >= petStageUnlockLevels["stage-3"]) return "stage-3";
  if (level >= petStageUnlockLevels["stage-2"]) return "stage-2";
  return "stage-1";
}

export function getUnlockedPetStages(level: number): PetStageId[] {
  return (Object.keys(petStageUnlockLevels) as PetStageId[]).filter((stage) => level >= petStageUnlockLevels[stage]);
}

export function getRenderablePetStage(petId: PetId, stage: PetStageId): PetStageId {
  return getAvailablePetStage(petId, stage);
}

export function getLumiAnimationAsset(state: LumiSpriteState, petId: PetId = defaultLumiPetId, stage: PetStageId = fallbackLumiStage) {
  const renderableStage = getAvailablePetStage(petId, stage);

  if (state === "resting") {
    const idle = getPetAnimationAsset(petId, renderableStage, "idle");
    return {
      ...idle,
      id: `${petId}-${stage}-resting-fallback`,
      fps: 3,
      states: ["resting"],
    } satisfies SpriteAnimationAsset;
  }

  if (state === "hover") {
    const happy = getPetAnimationAsset(petId, renderableStage, "happy");
    return {
      ...happy,
      id: `${petId}-${stage}-hover-fallback`,
      fps: 7,
      states: ["hover"],
    } satisfies SpriteAnimationAsset;
  }

  return getPetAnimationAsset(petId, renderableStage, state);
}

export const lumiAnimations: Record<LumiSpriteState, SpriteAnimationAsset> = {
  idle: getLumiAnimationAsset("idle"),
  focused: getLumiAnimationAsset("focused"),
  happy: getLumiAnimationAsset("happy"),
  recovering: getLumiAnimationAsset("recovering"),
  resting: getLumiAnimationAsset("resting"),
  hover: getLumiAnimationAsset("hover"),
  hanging: getLumiAnimationAsset("hanging"),
  hiding: getLumiAnimationAsset("hiding"),
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

export const soundAssets: SoundAsset[] = [
  {
    id: "cyber-purr-placeholder",
    src: "/assets/sounds/cyber-purr-placeholder.webm",
    event: "cyber_purr",
    defaultVolume: 0.35,
    mutedByDefault: true,
  },
];

export const interactionObjectAssets: InteractionObjectAsset[] = [
  {
    id: "ladder-object-placeholder",
    type: "ladder",
    src: "/assets/interaction-objects/ladder-placeholder.png",
    resizeAxis: "vertical",
    anchorPoints: ["top", "bottom", "center"],
  },
  {
    id: "platform-object-placeholder",
    type: "platform",
    src: "/assets/interaction-objects/platform-placeholder.png",
    resizeAxis: "horizontal",
    anchorPoints: ["left", "right", "center"],
  },
];

export const projectionModeAssets: ProjectionModeAsset[] = [
  {
    id: "pixel-tv-single-plane-pepper",
    mode: "single_plane_pepper",
    iconId: "pixel-tv",
    connectedIconSrc: "/assets/icons/pixel-tv-hover-pixel-v2.png",
    projectionRoot: "/assets/projection",
    defaultSpriteId: `${defaultLumiPetId}-${fallbackLumiStage}-idle`,
    background: "#000000",
    glowStrength: "high",
    reducedMotion: "fade",
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
    id: "pixel-tv-single-plane-pepper",
    feature: "projection",
    promptDoc: "docs/dynamic-asset-requirements.md",
    status: "manifest-slot-only",
    iconId: "pixel-tv",
  },
  {
    id: "ladder-platform-window-escape",
    feature: "interaction-object",
    promptDoc: "docs/dynamic-asset-requirements.md",
    status: "manifest-slot-only",
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

export function getPetAnimationAsset(petId: PetId, stage: PetStageId, state: PetAnimationState) {
  const petCatalog = petAnimationCatalog[petId] as Partial<Record<PetStageId, Partial<Record<PetAnimationState, SpriteAnimationAsset>>>>;
  const stageCatalog = petCatalog[stage];
  const animation = stageCatalog?.[state];
  if (!animation) {
    throw new Error(`Missing pet animation asset: ${petId}/${stage}/${state}`);
  }
  return animation;
}

export function getDesktopIconAsset(id: DesktopIconId) {
  return desktopIconAssets[id];
}
