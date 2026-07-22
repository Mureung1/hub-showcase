import type { PetId, PetMotionState, PetStageId, SpriteAnimationAsset, SpriteAnchor, SpritePlaybackFrame } from "./assetManifest";

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
    notes: "대기 호흡과 blink가 안정적으로 보이는지 확인",
  },
  {
    state: "focused",
    frameCount: 4,
    fps: 6,
    loop: true,
    anchor: floatAnchor,
    notes: "집중으로 읽히되 화난 표정처럼 과하지 않은지 확인",
  },
  {
    state: "happy",
    frameCount: 6,
    fps: 8,
    loop: true,
    anchor: floatAnchor,
    notes: "frame 0부터 행복한지, 효과선 없이도 표정이 충분한지 확인",
  },
  {
    state: "recovering",
    frameCount: 4,
    fps: 4,
    loop: true,
    anchor: floatAnchor,
    notes: "실패 처벌처럼 보이지 않고 부드러운 회복으로 읽히는지 확인",
  },
  {
    state: "hanging",
    frameCount: 6,
    fps: 6,
    loop: true,
    anchor: topGripAnchor,
    notes: "현재 보류 후보. 양손 들기보다 창에 매달린 느낌인지 확인",
  },
  {
    state: "hiding",
    frameCount: 6,
    fps: 5,
    loop: true,
    anchor: peekEdgeAnchor,
    notes: "왼쪽 peek edge가 흔들리지 않고 창 뒤 숨기처럼 보이는지 확인",
  },
  {
    state: "run",
    frameCount: 6,
    fps: 10,
    loop: true,
    anchor: floatAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5 }, { frame: 2 }, { frame: 1 }],
    notes: "오른쪽 방향이 끝까지 유지되고 빠른 종종걸음으로 보이는지 확인",
  },
  {
    state: "jump",
    frameCount: 6,
    fps: 8,
    loop: false,
    anchor: floatAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2, hold: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5, hold: 2 }],
    notes: "v4 후보. 오른쪽 3/4 방향 유지와 착지 baseline을 확인",
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
    notes: "느린 이동 리듬에서 대칭 재생이 어색하지 않은지 확인",
  },
  {
    state: "climbing",
    frameCount: 6,
    fps: 8,
    loop: true,
    anchor: topGripAnchor,
    playbackFrames: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }, { frame: 4 }, { frame: 5 }, { frame: 4 }, { frame: 3 }],
    notes: "뒷모습 유지, 사다리 없이도 등반으로 읽히는지 확인",
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
    fileForState: (state) => `pink-manager-stage-1-${state}-sheet.png`,
  },
  {
    id: "pink-manager-stage-1-production-candidates",
    label: "Pink Manager Stage 1 - Production Candidates",
    description: "Final candidate sheets for promotion into the canonical runtime folder.",
    petId: "pink-manager",
    stage: "stage-1",
    path: pinkManagerCandidatePath,
    fileForState: (state) => {
      if (state === "focused" || state === "jump") return `pink-manager-stage-1-${state}-sheet-v4.png`;
      return `pink-manager-stage-1-${state}-sheet-v3.png`;
    },
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
