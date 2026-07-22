import type {
  PetId,
  PetMotionState,
  PetStageId,
  SpriteAnimationAsset,
  SpriteAnchor,
  SpritePlaybackFrame,
} from "./assetManifest";

interface SpriteReviewSpec {
  state: PetMotionState;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchor: SpriteAnchor;
  playbackFrames?: SpritePlaybackFrame[];
  notes: string;
}

export interface SpriteReviewSet {
  id: string;
  label: string;
  description: string;
  petId: PetId;
  stage: PetStageId;
  path: string;
  fileForState: (state: PetMotionState) => string;
}

const pinkManagerCanonicalPath = "/assets/lumi/pink-manager-stage-1";
const pinkManagerCandidatePath = "/assets/lumi/pink-manager-stage-1-production-candidates";
const glassFrogCandidatePath = "/assets/lumi/glass-frog-stage-1-production-candidates";

const floatAnchor: SpriteAnchor = { type: "float", x: 32, y: 58 };
const topGripAnchor: SpriteAnchor = { type: "top-grip", x: 32, y: 5 };
const peekEdgeAnchor: SpriteAnchor = { type: "peek-edge", x: 4, y: 32 };

const specs: readonly SpriteReviewSpec[] = [
  {
    state: "idle",
    frameCount: 4,
    fps: 4,
    loop: true,
    anchor: floatAnchor,
    notes: "Check stable breathing/blink rhythm and whether frame 0 reads well as a reduced-motion fallback.",
  },
  {
    state: "focused",
    frameCount: 4,
    fps: 6,
    loop: true,
    anchor: floatAnchor,
    notes: "Check that focus reads through posture or eye detail without adding inconsistent accessories.",
  },
  {
    state: "happy",
    frameCount: 6,
    fps: 8,
    loop: true,
    anchor: floatAnchor,
    notes: "Check that the motion feels happy from frame 0 and still stays on-model across the loop.",
  },
  {
    state: "recovering",
    frameCount: 4,
    fps: 4,
    loop: true,
    anchor: floatAnchor,
    notes: "Check that recovery reads as soft tired/rebalancing motion, not as damage or injury.",
  },
  {
    state: "hanging",
    frameCount: 6,
    fps: 6,
    loop: true,
    anchor: topGripAnchor,
    notes: "Check top-grip stability and whether the body feels attached to a UI edge instead of floating.",
  },
  {
    state: "hiding",
    frameCount: 6,
    fps: 5,
    loop: true,
    anchor: peekEdgeAnchor,
    notes: "Check that the left peek edge is stable and reads as hiding beside a window.",
  },
  {
    state: "run",
    frameCount: 6,
    fps: 10,
    loop: true,
    anchor: floatAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5 }, { frame: 2 }, { frame: 1 }],
    notes: "Check one consistent right-facing direction and a faster gait than walk.",
  },
  {
    state: "jump",
    frameCount: 6,
    fps: 8,
    loop: false,
    anchor: floatAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2, hold: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5, hold: 2 }],
    notes: "Check right-facing or three-quarter-right continuity, baseline landing, and no squash distortion.",
  },
  {
    state: "walk",
    frameCount: 6,
    fps: 7,
    loop: true,
    anchor: floatAnchor,
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
    notes: "Check slow movement rhythm and whether mirrored/held frames feel natural.",
  },
  {
    state: "climbing",
    frameCount: 6,
    fps: 8,
    loop: true,
    anchor: topGripAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5 }, { frame: 4 }, { frame: 3 }],
    notes: "Check rear-view readability, alternating grip rhythm, and ladder-free UI compatibility.",
  },
];

export const spriteReviewSets = [
  {
    id: "pink-manager-stage-1-canonical",
    label: "Pink Manager Stage 1 - Canonical",
    description: "Main app runtime sheets in the stable canonical folder.",
    petId: "pink-manager",
    stage: "stage-1",
    path: pinkManagerCanonicalPath,
    fileForState: (state: PetMotionState) => `pink-manager-stage-1-${state}-sheet.png`,
  },
  {
    id: "pink-manager-stage-1-production-candidates",
    label: "Pink Manager Stage 1 - Production Candidates",
    description: "Final candidate sheets kept for comparison with the promoted canonical folder.",
    petId: "pink-manager",
    stage: "stage-1",
    path: pinkManagerCandidatePath,
    fileForState: (state: PetMotionState) => {
      if (state === "focused" || state === "jump") return `pink-manager-stage-1-${state}-sheet-v4.png`;
      return `pink-manager-stage-1-${state}-sheet-v3.png`;
    },
  },
  {
    id: "glass-frog-stage-1-production-candidates",
    label: "Glass Frog Stage 1 - Production Candidates",
    description:
      "Glass frog sheets generated from candidate-glass-frog-stage-1-4-v1-chromakey, using the small frog form as the motion base.",
    petId: "glass-frog",
    stage: "stage-1",
    path: glassFrogCandidatePath,
    fileForState: (state: PetMotionState) => `glass-frog-stage-1-${state}-sheet-v1.png`,
  },
] as const satisfies readonly SpriteReviewSet[];

export type SpriteReviewSetId = (typeof spriteReviewSets)[number]["id"];

export function getSpriteReviewSet(id: SpriteReviewSetId): SpriteReviewSet {
  return spriteReviewSets.find((set) => set.id === id) ?? spriteReviewSets[0];
}

export function getSpriteReviewAnimations(setId: SpriteReviewSetId) {
  const reviewSet = getSpriteReviewSet(setId);
  return specs.map((spec): SpriteAnimationAsset & { notes: string } => ({
    id: `${reviewSet.id}-${spec.state}-review`,
    petId: reviewSet.petId,
    stage: reviewSet.stage,
    src: `${reviewSet.path}/${reviewSet.fileForState(spec.state)}`,
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
    notes: spec.notes,
  }));
}

export const pinkManagerStage1ReviewAnimations = getSpriteReviewAnimations("pink-manager-stage-1-canonical");
