import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AnimationEvent, CSSProperties, FormEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { CanvasSpriteAnimator } from "./components/CanvasSpriteAnimator";
import {
  getDesktopIconAsset,
  getPetAnimationAsset,
  getLumiAnimationAsset,
  getRenderablePetStage,
  getUnlockedPetStages,
  projectionModeAssets,
  interactionObjectAssets,
  soundAssets,
  defaultLumiPetId,
  lumiMoodToSpriteState,
  resolvePetStageFromLevel,
  type DesktopIconId,
  type InteractionObjectAsset,
  type PetAnimationState,
  type LumiSpriteState,
  type PetId,
  type PetStageId,
} from "./data/assetManifest";
import { prependQuestLog, questLogMarks, questLogResultLabels } from "./data/questLogs";
import type { QuestLog } from "./data/questLogs";
import {
  readWindowPetPlacementDrafts,
  resolveWindowPetPosition,
  runtimeWindowPetSlots,
} from "./data/windowPetPlacements";
import { createQuestEventViaApi, fetchManagerContextViaApi, fetchQuestEventsViaApi } from "./layers/storage/questLogApi";
import type { CreateQuestEventRequest, ManagerContext } from "./layers/storage/questLogApi";
import { createQuestLogRepository } from "./layers/storage/questLogRepository";
import { getClimbPosition, type InteractionObject, type ResizeAxis } from "./domain/interactionObjects";
import { resolveManagerBehavior } from "./domain/managerBehaviorAdapter";
import type { ManagerBehaviorIntent } from "./domain/managerBehaviorIntent";
import { getPersonaLine, resolveManagerPersona, type ManagerPersona } from "./domain/managerPersonaPolicy";
import type { BehaviorContext, PetBehaviorMood, PetBehaviorRecentEvent, PetBehaviorStyle } from "./domain/petBehaviorStateMachine";
import { createRecoveryQuest, type Difficulty, type Quest, type QuestType } from "./domain/questLogic";
import { getRecoveryRewardCandidates } from "./domain/rewardProgression";
import { resolveSoundAssetId, type SoundEvent } from "./domain/soundPolicy";
import { createRuleFallbackStatEvaluation, type StatDelta, type StatKey } from "./domain/statGrowth";
import "./styles.css";

type AppScreen = "manager-select" | "wizard" | "manager-created" | "desktop";
type QuestStatus = "draft" | "active" | "success" | "failed" | "recovery";
type ManagerTone = "calm" | "friendly" | "firm";
type QuestSize = "tiny" | "balanced" | "challenge";
type WindowId = "quest" | "runner" | "failure" | "recovery" | "manager" | "profile" | "journal" | "trash" | "settings" | "pixelTvProperties" | "ladderObject" | "platformObject";
type QuestLogSyncStatus = "idle" | "loading" | "saving" | "success" | "error";
type BlinkFocusMode = "start_day" | "end_day" | "outside_transition";
type PixelTvMode = "default" | "projection";
type OutsidePetPhase = "inside" | "blink" | "peek_from_edge" | "walk_in" | "free_roam" | "returning";
type OutsidePetSide = "left" | "right";
type ManagerRuntimeLocation = "manager_window" | "window_edge" | "outside" | "transition";
type ManagerWindowInteractionState = "none" | "quest_hanging" | "recovery_hiding";

interface UserProfile {
  name: string;
  nickname: string;
  goal: string;
  category: "study" | "exercise" | "hobby" | "career" | "habit";
  goalPeriod: string;
  dailyMinutes: number;
  questSize: QuestSize;
  managerTone: ManagerTone;
  focusAnswer: string;
}

interface ManagerState {
  name: string;
  petId: PetId;
  level: number;
  exp: number;
  mood: "waiting" | "focused" | "happy" | "recovering";
  line: string;
  behaviorStyle: PetBehaviorStyle;
  unlockedStages: PetStageId[];
  selectedStage: PetStageId | null;
  soundEnabled: boolean;
}


interface WindowPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

interface WindowRect extends WindowPosition, WindowSize {}

interface InteractionSpritePosition {
  x: number;
  y: number;
}

interface QuestLogSyncState {
  status: QuestLogSyncStatus;
  message: string;
}

interface QuestOutcomeStreak {
  result: "success" | "failed" | null;
  count: number;
}

interface BlinkFocusState {
  id: number;
  mode: BlinkFocusMode;
}

interface DesktopContextMenuState {
  x: number;
  y: number;
}

interface OutsidePetState {
  phase: OutsidePetPhase;
  side: OutsidePetSide;
  position: InteractionSpritePosition;
  direction: 1 | -1;
  animation: PetAnimationState;
  roamTicks: number;
  attachedObjectId?: string;
}

interface ManagerRuntimeState {
  location: ManagerRuntimeLocation;
  mood: ManagerState["mood"];
  stage: PetStageId;
  animation: PetAnimationState | LumiSpriteState;
  windowInteraction: ManagerWindowInteractionState;
  outside: OutsidePetState;
  petAwayFromManagerWindow: boolean;
  showOutsidePet: boolean;
}

interface ManagerRuntimeStateInput {
  manager: ManagerState;
  displayStage: PetStageId;
  outsidePet: OutsidePetState;
  showQuestHangingPet: boolean;
  showRecoveryHidingPet: boolean;
  showOutsidePet: boolean;
}

interface StartMenuProps {
  questStatus: QuestStatus;
  onOpenWindow: (id: WindowId) => void;
  onExitService: () => void;
  onRestart: () => void;
}

interface DesktopContextMenuProps {
  x: number;
  y: number;
  onOpenProperties: () => void;
}

interface PixelTvPropertiesWindowProps {
  connected: boolean;
  onToggle: () => void;
}

interface BlinkFocusOverlayProps {
  effect: BlinkFocusState | null;
  onDone: () => void;
}

interface ManagerSelectWindowProps {
  selectedPetId: PetId;
  onSelect: (petId: PetId) => void;
  onContinue: () => void;
}

interface ProfileSetupWizardProps {
  draft: UserProfile;
  needsClarify: boolean;
  onChange: (profile: UserProfile) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

interface QuestWindowProps {
  quest: Quest;
  status: QuestStatus;
  previousQuestTitle: string;
  onQuestChange: (patch: Partial<Quest>) => void;
  onAccept: () => void;
  onOpenRunner: () => void;
  onRecommendNext: () => void;
}

interface QuestRunnerWindowProps {
  quest: Quest;
  remainingTime: string;
  onComplete: () => void;
  onFail: () => void;
}

interface FailureWindowProps {
  selectedFailureReason: string;
  onReasonChange: (reason: string) => void;
  onCreateRecovery: () => void;
}

interface RecoveryWindowProps {
  quest: Quest;
  onEdit: () => void;
  onAccept: () => void;
}

interface ManagerWindowProps {
  manager: ManagerState;
  petAway?: boolean;
}

interface SettingsWindowProps {
  manager: ManagerState;
  onSelectStage: (stage: PetStageId) => void;
  onToggleSound: () => void;
}

interface ProfileWindowProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

interface JournalWindowProps {
  logs: QuestLog[];
  sync: QuestLogSyncState;
}

interface XpWindowProps {
  id?: WindowId;
  title: string;
  titlebarIcon?: string;
  className: string;
  children: ReactNode;
  position?: WindowPosition;
  size?: WindowSize;
  resizeAxis?: ResizeAxis;
  zIndex?: number;
  isActive?: boolean;
  onFocus?: () => void;
  onMove?: (position: WindowPosition) => void;
  onResize?: (size: WindowSize) => void;
  onMeasure?: (rect: WindowRect) => void;
  onMinimize?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}

interface WindowIconMarkProps {
  id?: WindowId;
  fallback?: string;
  className: string;
}

interface DesktopIconProps {
  label: string;
  type: WindowId;
  onClick: () => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  assetId?: DesktopIconId;
  overrideIdleSrc?: string;
  overrideHoverSrc?: string;
  disabled?: boolean;
}

interface OutsidePetLayerProps {
  pet: OutsidePetState;
  petId: PetId;
  stage: PetStageId;
}

interface WindowPetInteractionProps {
  state: Extract<LumiSpriteState, "hanging" | "hiding">;
  petId: PetId;
  stage: PetStageId;
  placement: "below-quest" | "beside-recovery";
  position: WindowPosition;
  measuredRect?: WindowRect;
  zIndex: number;
}

interface DesktopPetProps {
  mood: ManagerState["mood"];
  petId: PetId;
  stage: PetStageId;
  large?: boolean;
}

const profileKey = "manager-xp.profile.v1";
const managerKey = "manager-xp.manager.v1";
const pixelTvModeKey = "manager-xp.pixel-tv-mode.v1";
const questLogRepository = createQuestLogRepository();

const initialWindowPositions: Record<WindowId, WindowPosition> = {
  quest: { x: 190, y: 118 },
  runner: { x: 285, y: 156 },
  failure: { x: 455, y: 180 },
  recovery: { x: 455, y: 180 },
  manager: { x: 850, y: 132 },
  profile: { x: 170, y: 104 },
  journal: { x: 285, y: 392 },
  trash: { x: 895, y: 405 },
  settings: { x: 610, y: 142 },
  pixelTvProperties: { x: 360, y: 185 },
  ladderObject: { x: 650, y: 294 },
  platformObject: { x: 735, y: 350 },
};

const initialWindowSizes: Partial<Record<WindowId, WindowSize>> = {
  ladderObject: { width: 86, height: 184 },
  platformObject: { width: 280, height: 124 },
};

const outsidePetFieldRect = { x: 190, y: 430, width: 780, height: 116 };
const outsidePetSpriteSize = 96;
const outsidePetInitialState: OutsidePetState = {
  phase: "inside",
  side: "left",
  position: { x: outsidePetFieldRect.x, y: outsidePetFieldRect.y },
  direction: 1,
  animation: "idle",
  roamTicks: 0,
};

const workflowWindowIds = new Set<WindowId>(["quest", "runner", "failure", "recovery", "manager", "journal"]);

function replaceWorkflowWindows(current: WindowId[], next: WindowId[]) {
  return [...current.filter((windowId) => !workflowWindowIds.has(windowId)), ...next];
}

const windowLabels: Record<WindowId, string> = {
  quest: "오늘의 퀘스트",
  runner: "QuestRunner.exe",
  failure: "실패 이유",
  recovery: "복구 퀘스트",
  manager: "Manager.exe",
  profile: "내 프로필",
  journal: "기록 노트",
  trash: "휴지통",
  settings: "설정",
  pixelTvProperties: "Pixel TV 속성",
  ladderObject: "사다리",
  platformObject: "평지",
};

const windowTitleIcons: Record<WindowId, string> = {
  quest: "Q",
  runner: ">",
  failure: "!",
  recovery: "+",
  manager: "◇",
  profile: "P",
  journal: "N",
  trash: "T",
  settings: "S",
  pixelTvProperties: "TV",
  ladderObject: "L",
  platformObject: "_",
};

const desktopIconAssetIds: Partial<Record<WindowId, DesktopIconId>> = {
  quest: "quest",
  manager: "manager",
  profile: "profile",
  journal: "journal",
  trash: "trash",
  settings: "theme-settings",
  pixelTvProperties: "pixel-tv",
};

const windowIconAssetIds: Partial<Record<WindowId, DesktopIconId>> = {
  quest: "quest",
  runner: "runner",
  recovery: "recovery",
  manager: "manager",
  profile: "profile",
  journal: "journal",
  trash: "trash",
  settings: "theme-settings",
};

const legacyWindowIconAssets: Partial<Record<WindowId, string>> = {
  failure: "/assets/icons/failure.svg",
};

const categoryLabels: Record<UserProfile["category"], string> = {
  study: "공부",
  exercise: "운동",
  hobby: "취미",
  career: "커리어",
  habit: "생활 습관",
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

const questTypeLabels: Record<QuestType, string> = {
  time: "시간형",
  quantity: "수량형",
  action: "행동형",
};

const statLabels: Record<StatKey, string> = {
  diligence: "성실성",
  persistence: "끈기",
  creativity: "창의성",
  knowledge: "지식",
  strength: "힘",
  agility: "민첩함",
  stamina: "체력",
  charm: "매력",
};

const rewardCandidateLabels: Record<string, string> = {
  character_animation: "동작",
  desktop_theme: "테마",
  sound: "사운드",
  memory_fragment: "기억 조각",
  gentle_recovery_tone: "복구 톤",
};

const stageLabels: Record<PetStageId, string> = {
  "stage-1": "Stage 1",
  "stage-2": "Stage 2",
  "stage-3": "Stage 3",
  "stage-4": "Stage 4",
};

const toneLines: Record<ManagerTone, string> = {
  calm: "기다리고 있었어. 오늘 할 분량은 네가 정해도 돼.",
  friendly: "좋아, 오늘은 우리 페이스로 하나만 해보자.",
  firm: "좋아. 지금 가능한 작은 걸 정하고 끝까지 가보자.",
};

const managerStatusLabels: Record<ManagerState["mood"], string> = {
  waiting: "기다리는 중",
  focused: "진행 중",
  happy: "함께 성장했어",
  recovering: "리밸런싱",
};

const managerStatusIcons: Record<ManagerState["mood"], string> = {
  waiting: "..",
  focused: "▶",
  happy: "★",
  recovering: "\u21BB",
};

const failureReasons = ["시간이 부족했다", "목표가 너무 컸다", "집중이 안 됐다", "컨디션이 좋지 않았다", "까먹었다"];


const defaultProfile: UserProfile = {
  name: "",
  nickname: "",
  goal: "정보처리기사 자격증 취득",
  category: "study",
  goalPeriod: "6주",
  dailyMinutes: 30,
  questSize: "balanced",
  managerTone: "calm",
  focusAnswer: "",
};

const defaultManager: ManagerState = {
  name: "루미",
  petId: defaultLumiPetId,
  level: 1,
  exp: 0,
  mood: "waiting",
  line: toneLines.calm,
  behaviorStyle: "balanced",
  unlockedStages: ["stage-1"],
  selectedStage: null,
  soundEnabled: false,
};

const selectableManagerPets: Array<{
  petId: PetId;
  name: string;
  title: string;
  description: string;
}> = [
  {
    petId: "pink-manager",
    name: "루미",
    title: "분홍 전자 매니저",
    description: "밝은 반응과 큰 동작이 잘 보이는 기본 매니저",
  },
  {
    petId: "glass-frog",
    name: "글라",
    title: "유리 개구리 매니저",
    description: "조용한 움직임과 점프 동작이 어울리는 매니저",
  },
  {
    petId: "planaria",
    name: "플라",
    title: "플라나리아 매니저",
    description: "작고 단순한 형태로 시작하는 샘플 매니저",
  },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeManager(manager: ManagerState): ManagerState {
  const unlockedStages = manager.unlockedStages?.length ? manager.unlockedStages : getUnlockedPetStages(manager.level);
  const selectedStage = manager.selectedStage && unlockedStages.includes(manager.selectedStage) ? manager.selectedStage : null;
  return {
    ...manager,
    petId: manager.petId ?? defaultLumiPetId,
    behaviorStyle: normalizeBehaviorStyle(manager.behaviorStyle),
    unlockedStages,
    selectedStage,
    soundEnabled: manager.soundEnabled === true,
  };
}

function normalizeBehaviorStyle(value: unknown): PetBehaviorStyle {
  if (value === "adventurous" || value === "shy" || value === "balanced") return value;
  return "balanced";
}

function getManagerPersona(manager: ManagerState, profile: UserProfile): ManagerPersona {
  return resolveManagerPersona({
    petId: manager.petId,
    tone: profile.managerTone,
    questStyle: profile.questSize,
  });
}

function createRuleFallbackManagerIntent(
  manager: ManagerState,
  tone: ManagerTone,
  streak: QuestOutcomeStreak,
): ManagerBehaviorIntent {
  const behaviorStyle = normalizeBehaviorStyle(manager.behaviorStyle);
  const persona = resolveManagerPersona({ petId: manager.petId, tone, questStyle: "balanced" });
  const line = manager.line || getPersonaLine("context_idle", persona);

  if (streak.result === "success" && streak.count >= 2) {
    return {
      behaviorStyle,
      tone,
      line,
      suggestedBehaviorBias: [
        { state: "jump_to_platform", weightDelta: 2, reason: "success_streak" },
        { state: "approach_ladder", weightDelta: 1, reason: "success_streak" },
      ],
    };
  }

  if (streak.result === "failed") {
    return {
      behaviorStyle: behaviorStyle === "adventurous" ? "balanced" : behaviorStyle,
      tone,
      line,
      suggestedBehaviorBias: [
        { state: "hide_behind_window", weightDelta: 2, reason: "recent_failure" },
        { state: "rest", weightDelta: 1, reason: "recent_failure" },
      ],
    };
  }

  return {
    behaviorStyle,
    tone,
    line,
    suggestedBehaviorBias: [],
  };
}

function isGoalAbstract(goal: string) {
  const normalized = goal.trim();
  const vagueWords = ["성장", "공부", "운동", "열심히", "잘하기", "자기계발"];
  return normalized.length < 8 || vagueWords.some((word) => normalized === word);
}

function getQuestUnit(type: QuestType) {
  if (type === "time") return "분";
  if (type === "quantity") return "개";
  return "회";
}

function getDifficultyFromSize(size: QuestSize): Difficulty {
  if (size === "tiny") return "easy";
  if (size === "challenge") return "hard";
  return "normal";
}

function getAmountFromProfile(profile: UserProfile) {
  if (profile.questSize === "tiny") return Math.max(5, Math.round(profile.dailyMinutes / 3));
  if (profile.questSize === "challenge") return Math.max(30, profile.dailyMinutes);
  return Math.max(15, Math.round(profile.dailyMinutes / 2));
}

function calculateReward(difficulty: Difficulty, amount: number, type: QuestType) {
  const base = difficulty === "easy" ? 6 : difficulty === "hard" ? 28 : 16;
  const amountBonus = type === "time" ? Math.floor(amount / 10) * 4 : Math.floor(amount / 5) * 3;
  return Math.max(5, Math.min(60, base + amountBonus));
}

function createQuest(profile: UserProfile): Quest {
  const amount = getAmountFromProfile(profile);
  const difficulty = getDifficultyFromSize(profile.questSize);
  const focus = profile.focusAnswer ? `${profile.focusAnswer} ` : "";
  const target = profile.goal.replace("자격증 취득", "").replace("완성", "").trim() || categoryLabels[profile.category];
  return { title: `${target} ${focus}핵심 정리 ${amount}분`, type: "time", amount, unit: "분", difficulty, deadline: "오늘 23:59", rewardExp: calculateReward(difficulty, amount, "time") };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}


function formatRemaining(now: Date) {
  const deadline = new Date(now);
  deadline.setHours(23, 59, 59, 999);
  const diff = Math.max(0, deadline.getTime() - now.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function addExp(manager: ManagerState, exp: number, line: string): ManagerState {
  const total = manager.exp + exp;
  const levelUps = Math.floor(total / 100);
  const nextLevel = manager.level + levelUps;
  return {
    ...manager,
    level: nextLevel,
    exp: total % 100,
    mood: "happy",
    line,
    unlockedStages: getUnlockedPetStages(nextLevel),
  };
}

function getManagerDisplayStage(manager: ManagerState): PetStageId {
  return manager.selectedStage ?? resolvePetStageFromLevel(manager.level);
}

function getNewlyUnlockedStages(previousStages: PetStageId[], nextStages: PetStageId[]) {
  return nextStages.filter((stage) => !previousStages.includes(stage));
}

function toDeadlineAt(deadline: string) {
  const match = deadline.match(/오늘\s+(\d{2}):(\d{2})/);
  if (!match) return null;

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toISOString();
}

function createQuestEventRequest(
  quest: Quest,
  result: NonNullable<CreateQuestEventRequest["result"]>,
  expDelta: number,
  managerMoodAfter: ManagerState["mood"],
  options: {
    failureReason?: string | null;
    previousQuestTitle?: string | null;
    managerLine?: string | null;
    managerBefore?: ManagerState;
    managerAfter?: ManagerState;
    soundEnabled?: boolean;
  } = {},
): CreateQuestEventRequest {
  const eventType = getQuestEventType(result);
  const growthQuestType = result === "recovery" ? "recovery" : quest.type;
  const growthEventType = result === "recovery" ? "recovery_completed" : result === "failed" ? "quest_failed" : "quest_completed";
  const statEvaluation = createRuleFallbackStatEvaluation({ questType: growthQuestType, eventType: growthEventType, difficulty: quest.difficulty });
  const statDeltas = statEvaluation.statDeltas;
  const rewardCandidates = getRewardCandidates(result);
  const recoveryRewardCandidates = getRecoveryRewardCandidates(growthEventType);
  const unlockedStagesAfter = options.managerAfter?.unlockedStages ?? options.managerBefore?.unlockedStages ?? [];
  const stageUnlocked = options.managerBefore && options.managerAfter ? getNewlyUnlockedStages(options.managerBefore.unlockedStages, options.managerAfter.unlockedStages) : [];
  const soundEvent = getSoundEventForResult(result, options.managerAfter);
  const soundAssetId = soundEvent ? getRuntimeSoundAssetId(soundEvent, options.soundEnabled === true) : null;

  return {
    type: eventType,
    quest: {
      title: quest.title,
      type: quest.type,
      amount: quest.amount,
      unit: quest.unit,
      difficulty: quest.difficulty,
      deadlineAt: toDeadlineAt(quest.deadline),
    },
    result,
    expDelta,
    failureReason: options.failureReason ?? null,
    previousQuestTitle: options.previousQuestTitle ?? null,
    managerMoodAfter,
    managerLine: options.managerLine ?? null,
    clientCreatedAt: new Date().toISOString(),
    metadata: {
      questType: quest.type,
      difficulty: quest.difficulty,
      statDeltas,
      statBudget: statEvaluation.statBudget,
      primaryStats: statEvaluation.primaryStats,
      statEvaluationReason: statEvaluation.reason,
      statEvaluationSource: "rule_fallback",
      rewardCandidates: [...new Set([...rewardCandidates, ...recoveryRewardCandidates])],
      unlockedStagesAfter,
      stageUnlocked,
      soundEvent,
      soundAssetId,
      futureContextTargets: ["personalized_manager", "web_day_flow", "reward_system"],
    },
  };
}

function getQuestEventType(result: NonNullable<CreateQuestEventRequest["result"]>): CreateQuestEventRequest["type"] {
  if (result === "failed") return "quest_failed";
  if (result === "recovery") return "recovery_completed";
  return "quest_completed";
}

function getRewardCandidates(result: NonNullable<CreateQuestEventRequest["result"]>) {
  if (result === "failed") return ["gentle_recovery_tone"];
  if (result === "recovery") return ["memory_fragment", "character_animation"];
  return ["character_animation", "desktop_theme", "sound"];
}

function getSoundEventForResult(result: NonNullable<CreateQuestEventRequest["result"]>, manager?: ManagerState): SoundEvent {
  if (manager && manager.exp === 0 && manager.level > 1) return "level_up";
  if (result === "recovery") return "recovery";
  return result === "success" ? "complete" : "cyber_purr";
}

function getRuntimeSoundAssetId(event: SoundEvent, soundEnabled: boolean) {
  const assetId = resolveSoundAssetId(soundAssets, event, soundEnabled);
  if (!assetId) return null;
  const asset = soundAssets.find((candidate) => candidate.id === assetId);
  if (!asset || asset.src.includes("placeholder")) return null;
  return asset.id;
}

function getQuestLogStatDeltas(log: QuestLog): StatDelta[] {
  const value = log.metadata?.statDeltas;
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const stat = item.stat;
    const amount = item.amount;
    if (!isStatKey(stat) || typeof amount !== "number") return [];
    return [{ stat, amount }];
  });
}

function getQuestLogRewardCandidates(log: QuestLog) {
  const value = log.metadata?.rewardCandidates;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getQuestLogStageUnlocks(log: QuestLog) {
  const value = log.metadata?.stageUnlocked;
  if (!Array.isArray(value)) return [];
  return value.filter(isPetStageId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatKey(value: unknown): value is StatKey {
  return typeof value === "string" && value in statLabels;
}

function isPetStageId(value: unknown): value is PetStageId {
  return typeof value === "string" && value in stageLabels;
}

function createManagerContextLine(context: ManagerContext, persona: ManagerPersona) {
  if (context.lastQuestResult === "failed") return getPersonaLine("context_failed", persona);
  if (context.lastQuestResult === "recovery") return getPersonaLine("context_recovery", persona);
  if (context.lastQuestResult === "success") return getPersonaLine("context_success", persona);
  return getPersonaLine("context_idle", persona);
}

function useWindowManager(
  initialOpenWindows: WindowId[],
  initialPositions: Record<WindowId, WindowPosition>,
  initialSizes: Partial<Record<WindowId, WindowSize>> = {},
) {
  const [openWindows, setOpenWindows] = useState<WindowId[]>(initialOpenWindows);
  const [windowPositions, setWindowPositions] = useState<Record<WindowId, WindowPosition>>(initialPositions);
  const [windowSizes, setWindowSizes] = useState<Partial<Record<WindowId, WindowSize>>>(initialSizes);
  const [windowRects, setWindowRects] = useState<Partial<Record<WindowId, WindowRect>>>({});
  const [minimizedWindows, setMinimizedWindows] = useState<WindowId[]>([]);
  const [focusedWindow, setFocusedWindow] = useState<WindowId | null>(initialOpenWindows[initialOpenWindows.length - 1] ?? null);
  const visibleWindows = openWindows.filter((windowId) => !minimizedWindows.includes(windowId));
  const activeWindow = focusedWindow && visibleWindows.includes(focusedWindow) ? focusedWindow : visibleWindows[visibleWindows.length - 1];

  function openWindow(id: WindowId) {
    setOpenWindows((current) => (current.includes(id) ? current : [...current, id]));
    setMinimizedWindows((current) => current.filter((windowId) => windowId !== id));
    setFocusedWindow(id);
  }

  function closeWindow(id: WindowId) {
    setOpenWindows((current) => {
      const nextWindows = current.filter((windowId) => windowId !== id);
      setFocusedWindow((currentFocused) => (currentFocused === id ? nextWindows[nextWindows.length - 1] ?? null : currentFocused));
      return nextWindows;
    });
    setMinimizedWindows((current) => current.filter((windowId) => windowId !== id));
  }

  function minimizeWindow(id: WindowId) {
    setMinimizedWindows((current) => (current.includes(id) ? current : [...current, id]));
    setFocusedWindow((currentFocused) => {
      if (currentFocused !== id) return currentFocused;
      const nextVisibleWindows = openWindows.filter((windowId) => windowId !== id && !minimizedWindows.includes(windowId));
      return nextVisibleWindows[nextVisibleWindows.length - 1] ?? null;
    });
  }

  function moveWindow(id: WindowId, position: WindowPosition) {
    setWindowPositions((current) => ({ ...current, [id]: position }));
  }

  function resizeWindow(id: WindowId, size: WindowSize) {
    setWindowSizes((current) => ({ ...current, [id]: size }));
  }

  function measureWindow(id: WindowId, rect: WindowRect) {
    setWindowRects((current) => {
      const previous = current[id];
      if (
        previous &&
        Math.abs(previous.x - rect.x) < 0.5 &&
        Math.abs(previous.y - rect.y) < 0.5 &&
        Math.abs(previous.width - rect.width) < 0.5 &&
        Math.abs(previous.height - rect.height) < 0.5
      ) {
        return current;
      }

      return { ...current, [id]: rect };
    });
  }

  function setWorkflowWindows(nextWindows: WindowId[]) {
    setOpenWindows((current) => {
      const nextOpenWindows = replaceWorkflowWindows(current, nextWindows);
      setMinimizedWindows((minimized) => minimized.filter((windowId) => nextOpenWindows.includes(windowId) && !nextWindows.includes(windowId)));
      return nextOpenWindows;
    });
    setFocusedWindow(nextWindows[nextWindows.length - 1] ?? null);
  }

  function resetOpenWindows(nextWindows: WindowId[]) {
    setOpenWindows(nextWindows);
    setMinimizedWindows([]);
    setFocusedWindow(nextWindows[nextWindows.length - 1] ?? null);
  }

  function resetWindowPositions() {
    setWindowPositions(initialPositions);
  }

  function windowChrome(id: WindowId) {
    return {
      id,
      position: windowPositions[id],
      size: windowSizes[id],
      zIndex: (activeWindow === id ? 40 : 10) + openWindows.indexOf(id),
      isActive: activeWindow === id,
      onFocus: () => openWindow(id),
      onMove: (position: WindowPosition) => moveWindow(id, position),
      onResize: (size: WindowSize) => resizeWindow(id, size),
      onMeasure: (rect: WindowRect) => measureWindow(id, rect),
      onMinimize: () => minimizeWindow(id),
      onClose: () => closeWindow(id),
    };
  }

  function isWindowVisible(id: WindowId) {
    return openWindows.includes(id) && !minimizedWindows.includes(id);
  }

  return {
    activeWindow,
    isWindowVisible,
    closeWindow,
    openWindow,
    openWindows,
    resetOpenWindows,
    resetWindowPositions,
    setWorkflowWindows,
    windowChrome,
    windowPositions,
    windowSizes,
    windowRects,
  };
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!("matchMedia" in window)) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}


export default function App() {
  const storedProfile = useMemo(() => readStorage<UserProfile | null>(profileKey, null), []);
  const [screen, setScreen] = useState<AppScreen>(storedProfile ? "desktop" : "manager-select");
  const [profile, setProfile] = useState<UserProfile>(storedProfile ?? defaultProfile);
  const [wizardDraft, setWizardDraft] = useState<UserProfile>(storedProfile ?? defaultProfile);
  const [manager, setManager] = useState<ManagerState>(() => normalizeManager(readStorage(managerKey, defaultManager)));
  const [selectedPetId, setSelectedPetId] = useState<PetId>(() => normalizeManager(readStorage(managerKey, defaultManager)).petId);
  const [logs, setLogs] = useState<QuestLog[]>(() => questLogRepository.get());
  const [quest, setQuest] = useState<Quest>(() => createQuest(storedProfile ?? defaultProfile));
  const [questStatus, setQuestStatus] = useState<QuestStatus>("draft");
  const {
    activeWindow,
    isWindowVisible,
    openWindow,
    openWindows,
    resetOpenWindows,
    resetWindowPositions,
    setWorkflowWindows,
    windowChrome,
    windowPositions,
    windowSizes,
    windowRects,
  } = useWindowManager(["quest", "manager", "ladderObject", "platformObject"], initialWindowPositions, initialWindowSizes);
  const [now, setNow] = useState(() => new Date());
  const [needsClarify, setNeedsClarify] = useState(false);
  const [selectedFailureReason, setSelectedFailureReason] = useState(failureReasons[0]);
  const [previousQuestTitle, setPreviousQuestTitle] = useState("");
  const [startOpen, setStartOpen] = useState(false);
  const [logSync, setLogSync] = useState<QuestLogSyncState>({ status: "idle", message: "" });
  const [questOutcomeStreak, setQuestOutcomeStreak] = useState<QuestOutcomeStreak>({ result: null, count: 0 });
  const [blinkFocus, setBlinkFocus] = useState<BlinkFocusState | null>(null);
  const [exitAfterBlink, setExitAfterBlink] = useState(false);
  const [pixelTvMode, setPixelTvMode] = useState<PixelTvMode>(() => readStorage<PixelTvMode>(pixelTvModeKey, "default"));
  const [pixelTvContextMenu, setPixelTvContextMenu] = useState<DesktopContextMenuState | null>(null);
  const [outsidePet, setOutsidePet] = useState<OutsidePetState>(outsidePetInitialState);
  const reducedMotion = usePrefersReducedMotion();
  const interactionObjects = useMemo(
    () => createInteractionObjectsFromWindows(windowPositions, windowSizes),
    [windowPositions, windowSizes],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { if (screen === "desktop" || screen === "manager-created") writeStorage(profileKey, profile); }, [profile, screen]);
  useEffect(() => { writeStorage(managerKey, manager); }, [manager]);
  useEffect(() => { questLogRepository.set(logs); }, [logs]);
  useEffect(() => { writeStorage(pixelTvModeKey, pixelTvMode); }, [pixelTvMode]);

  useEffect(() => {
    if (screen !== "desktop") return undefined;

    let cancelled = false;
    setLogSync({ status: "loading", message: "서버 기록을 불러오는 중이야." });
    Promise.all([fetchQuestEventsViaApi(), fetchManagerContextViaApi()])
      .then(([serverLogs, managerContext]) => {
        if (cancelled) return;
        setLogs(serverLogs);
        applyManagerContext(managerContext);
        setLogSync({ status: "success", message: "서버 기록을 불러왔어." });
      })
      .catch(() => {
        if (cancelled) return;
        setLogSync({ status: "error", message: "서버 기록을 불러오지 못했어. 로컬 화면 흐름은 계속 사용할 수 있어." });
      });

    return () => {
      cancelled = true;
    };
  }, [screen]);

  useEffect(() => {
    if (outsidePet.phase !== "peek_from_edge") return undefined;

    const timer = window.setTimeout(() => {
      setOutsidePet((current) => ({
        ...current,
        phase: "walk_in",
        animation: "walk",
        position: {
          x: current.side === "left" ? outsidePetFieldRect.x - 42 : outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize + 42,
          y: outsidePetFieldRect.y,
        },
      }));
    }, 820);

    return () => window.clearTimeout(timer);
  }, [outsidePet.phase]);

  useEffect(() => {
    if (outsidePet.phase !== "walk_in") return undefined;

    const targetX = outsidePet.side === "left" ? outsidePetFieldRect.x + 64 : outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize - 64;
    const timer = window.setInterval(() => {
      setOutsidePet((current) => {
        if (current.phase !== "walk_in") return current;

        const step = current.side === "left" ? 18 : -18;
        const nextX = current.position.x + step;
        const reachedTarget = current.side === "left" ? nextX >= targetX : nextX <= targetX;
        if (reachedTarget) {
          return {
            ...current,
            phase: "free_roam",
            animation: "idle",
            roamTicks: 0,
            attachedObjectId: undefined,
            position: { ...current.position, x: targetX },
          };
        }

        return { ...current, position: { ...current.position, x: nextX }, direction: step > 0 ? 1 : -1 };
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [outsidePet.phase, outsidePet.side]);

  useEffect(() => {
    if (outsidePet.phase !== "free_roam") return undefined;

    const timer = window.setInterval(() => {
      setOutsidePet((current) => {
        if (current.phase !== "free_roam") return current;

        const nextRoamTicks = current.roamTicks + 1;
        const petRect = { x: current.position.x, y: current.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };
        const attachedObject = current.attachedObjectId
          ? interactionObjects.find((object) => object.id === current.attachedObjectId)
          : undefined;
        const nextAnimation = getNextOutsidePetRoamAnimation(current, interactionObjects, manager, profile.managerTone, questOutcomeStreak, reducedMotion);
        const nextDirection = resolveOutsidePetDirection(current, interactionObjects);
        const speed = nextAnimation === "run" ? 42 : nextAnimation === "jump" ? 28 : nextAnimation === "climbing" ? 0 : 22;
        const rawX = current.position.x + speed * nextDirection;
        const minX = outsidePetFieldRect.x;
        const maxX = outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize;
        const clampedX = Math.min(Math.max(rawX, minX), maxX);
        const nextAttachedObject = nextAnimation === "climbing"
          ? attachedObject?.type === "ladder"
            ? attachedObject
            : getNearbyLadder(petRect, interactionObjects)
          : undefined;
        const nextPosition = nextAttachedObject
          ? resolveOutsidePetAttachmentPosition(nextAttachedObject, nextAnimation)
          : resolveOutsidePetRoamPosition(current, nextAnimation, { x: clampedX, y: nextAnimation === "jump" ? outsidePetFieldRect.y - 26 : outsidePetFieldRect.y }, interactionObjects);

        return {
          ...current,
          animation: nextAnimation,
          attachedObjectId: nextAttachedObject?.id,
          direction: clampedX === minX ? 1 : clampedX === maxX ? -1 : nextDirection,
          roamTicks: nextRoamTicks,
          position: nextPosition,
        };
      });
    }, 1100);

    return () => window.clearInterval(timer);
  }, [outsidePet.phase, interactionObjects, manager, profile.managerTone, questOutcomeStreak, reducedMotion]);

  useEffect(() => {
    if (outsidePet.phase !== "free_roam" || outsidePet.animation !== "climbing" || !outsidePet.attachedObjectId) return;

    const attachedObject = interactionObjects.find((object) => object.id === outsidePet.attachedObjectId);
    if (!attachedObject || attachedObject.type !== "ladder") return;

    const nextPosition = resolveOutsidePetAttachmentPosition(attachedObject, "climbing");
    setOutsidePet((current) => {
      if (current.phase !== "free_roam" || current.animation !== "climbing" || current.attachedObjectId !== attachedObject.id) return current;
      if (current.position.x === nextPosition.x && current.position.y === nextPosition.y) return current;
      return { ...current, position: nextPosition };
    });
  }, [interactionObjects, outsidePet.phase, outsidePet.animation, outsidePet.attachedObjectId]);

  useEffect(() => {
    if (outsidePet.phase !== "free_roam" || openWindows.includes("journal")) return;

    setOutsidePet((current) => {
      if (current.phase !== "free_roam") return current;

      const side = getNearestOutsidePetSide(current.position);
      return {
        ...current,
        phase: "returning",
        side,
        animation: "walk",
        attachedObjectId: undefined,
        direction: side === "left" ? -1 : 1,
        position: { ...current.position, y: outsidePetFieldRect.y },
      };
    });
  }, [openWindows, outsidePet.phase]);

  useEffect(() => {
    if (outsidePet.phase !== "returning") return undefined;

    const timer = window.setInterval(() => {
      setOutsidePet((current) => {
        if (current.phase !== "returning") return current;

        const step = current.side === "left" ? -22 : 22;
        const nextX = current.position.x + step;
        const reachedEdge = current.side === "left" ? nextX <= -outsidePetSpriteSize : nextX >= window.innerWidth;
        if (reachedEdge) return outsidePetInitialState;

        return {
          ...current,
          animation: nextX < 16 || nextX > window.innerWidth - outsidePetSpriteSize - 16 ? "hiding" : "walk",
          direction: step > 0 ? 1 : -1,
          position: { x: nextX, y: outsidePetFieldRect.y },
        };
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [outsidePet.phase]);

  const remainingTime = formatRemaining(now);
  const managerDisplayStage = getManagerDisplayStage(manager);
  const projectionModeAsset = projectionModeAssets.find((asset) => asset.mode === "single_plane_pepper");
  const pixelTvConnected = pixelTvMode === "projection";

  function triggerBlinkFocus(mode: BlinkFocusMode) { setBlinkFocus({ id: Date.now(), mode }); }
  function enterDesktop() {
    triggerBlinkFocus("start_day");
    setScreen("desktop");
  }
  function exitService() {
    setStartOpen(false);
    setExitAfterBlink(true);
    triggerBlinkFocus("end_day");
  }
  function continueWithSelectedManager() {
    const persona = resolveManagerPersona({ petId: selectedPetId, tone: defaultProfile.managerTone, questStyle: defaultProfile.questSize });
    const nextManager = normalizeManager({ ...defaultManager, petId: selectedPetId, behaviorStyle: persona.behaviorStyle, line: getPersonaLine("setup", persona) });
    setManager(nextManager);
    setWizardDraft(defaultProfile);
    setNeedsClarify(false);
    setScreen("wizard");
  }
  function restartService() {
    window.localStorage.removeItem(profileKey);
    window.localStorage.removeItem(managerKey);
    questLogRepository.set([]);
    setStartOpen(false);
    setScreen("manager-select");
    setProfile(defaultProfile);
    setWizardDraft(defaultProfile);
    setManager(defaultManager);
    setSelectedPetId(defaultLumiPetId);
    setLogs([]);
    setQuest(createQuest(defaultProfile));
    setQuestStatus("draft");
    setPreviousQuestTitle("");
    setSelectedFailureReason(failureReasons[0]);
    setQuestOutcomeStreak({ result: null, count: 0 });
    setOutsidePet(outsidePetInitialState);
    setBlinkFocus(null);
    setExitAfterBlink(false);
    resetOpenWindows(["quest", "manager", "ladderObject", "platformObject"]);
    resetWindowPositions();
  }
  function finishBlinkFocus() {
    setBlinkFocus(null);
    if (outsidePet.phase === "blink") {
      setOutsidePet((current) => ({
        ...current,
        phase: "peek_from_edge",
        animation: "hiding",
        position: {
          x: current.side === "left" ? -34 : window.innerWidth - 62,
          y: outsidePetFieldRect.y - 18,
        },
        direction: current.side === "left" ? 1 : -1,
      }));
      return;
    }

    if (!exitAfterBlink) return;
    setExitAfterBlink(false);
    resetOpenWindows(["quest", "manager"]);
    setScreen("manager-created");
  }
  function togglePixelTvMode() {
    setPixelTvMode((current) => (current === "projection" ? "default" : "projection"));
  }
  function openAppWindow(id: WindowId) {
    openWindow(id);
    if (id === "journal") triggerOutsidePetFromJournal();
  }
  function triggerOutsidePetFromJournal() {
    if (outsidePet.phase !== "inside") return;

    const side: OutsidePetSide = Date.now() % 2 === 0 ? "left" : "right";
    setOutsidePet({
      phase: "blink",
      side,
      position: {
        x: side === "left" ? -34 : window.innerWidth - 62,
        y: outsidePetFieldRect.y - 18,
      },
      direction: side === "left" ? 1 : -1,
      animation: "hiding",
      roamTicks: 0,
    });
    triggerBlinkFocus("outside_transition");
  }
  function openPixelTvContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPixelTvContextMenu({ x: event.clientX, y: event.clientY });
  }
  function openPixelTvProperties() {
    setPixelTvContextMenu(null);
    openWindow("pixelTvProperties");
  }
  function launchProjectionMode() {
    if (!pixelTvConnected) {
      openPixelTvProperties();
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("projection", "pepper");
    window.location.href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  }
  function recordQuestLog(log: QuestLog) { setLogs((current) => prependQuestLog(current, log)); }
  function recordOutcomeStreak(result: "success" | "failed") {
    setQuestOutcomeStreak((current) => ({
      result,
      count: current.result === result ? current.count + 1 : 1,
    }));
  }
  function applyManagerContext(context: ManagerContext) {
    setManager((current) => ({ ...current, mood: context.currentMood, line: createManagerContextLine(context, getManagerPersona(current, profile)) }));
  }

  async function saveQuestEvent(request: CreateQuestEventRequest) {
    setLogSync({ status: "saving", message: "퀘스트 이벤트를 서버에 저장하는 중이야." });

    try {
      const savedEvent = await createQuestEventViaApi(request);
      if (savedEvent.log) recordQuestLog(savedEvent.log);
      applyManagerContext(savedEvent.managerContext);
      setLogSync({ status: "success", message: "퀘스트 이벤트를 서버에 저장했어." });
    } catch {
      setLogSync({ status: "error", message: "기록 저장에 실패했어. 화면 흐름은 유지되고, 기록 노트에서 다시 확인할 수 있어." });
      setManager((current) => ({ ...current, line: getPersonaLine("api_error", getManagerPersona(current, profile)) }));
    }
  }

  function openTodayQuest() {
    if (questStatus === "success") {
      setQuest(createQuest(profile));
      setQuestStatus("draft");
      setPreviousQuestTitle("");
      setManager((current) => ({ ...current, mood: "waiting", line: getPersonaLine("quest_recommended", getManagerPersona(current, profile)) }));
      setWorkflowWindows(["quest", "manager"]);
      return;
    }

    if (questStatus === "active") {
      setWorkflowWindows(["runner", "manager"]);
      return;
    }

    if (questStatus === "failed") {
      setWorkflowWindows(["failure", "manager"]);
      return;
    }

    if (questStatus === "recovery") {
      setWorkflowWindows(["recovery", "manager"]);
      return;
    }

    openWindow("quest");
  }

  function submitWizard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGoalAbstract(wizardDraft.goal) && !wizardDraft.focusAnswer) { setNeedsClarify(true); return; }
    const savedProfile: UserProfile = { ...wizardDraft, name: wizardDraft.name.trim() || "사용자", nickname: wizardDraft.nickname.trim() || "루카스", goal: wizardDraft.goal.trim() || defaultProfile.goal };
    const selectedPet = selectableManagerPets.find((pet) => pet.petId === selectedPetId);
    const selectedPersona = resolveManagerPersona({ petId: selectedPetId, tone: savedProfile.managerTone, questStyle: savedProfile.questSize });
    setProfile(savedProfile);
    setQuest(createQuest(savedProfile));
    setQuestStatus("draft");
    setManager(normalizeManager({ ...defaultManager, petId: selectedPetId, name: selectedPet?.name ?? defaultManager.name, behaviorStyle: selectedPersona.behaviorStyle, line: getPersonaLine("quest_recommended", selectedPersona) }));
    setLogs([]);
    resetOpenWindows(["quest", "manager", "ladderObject", "platformObject"]);
    resetWindowPositions();
    setNeedsClarify(false);
    setScreen("manager-created");
  }

  function updateQuest(patch: Partial<Quest>) {
    setQuest((current) => {
      const nextType = patch.type ?? current.type;
      const nextAmount = patch.amount ?? current.amount;
      const nextDifficulty = patch.difficulty ?? current.difficulty;
      const nextUnit = patch.type && patch.type !== current.type ? getQuestUnit(patch.type) : patch.unit ?? current.unit;
      return { ...current, ...patch, type: nextType, amount: nextAmount, difficulty: nextDifficulty, unit: nextUnit, rewardExp: calculateReward(nextDifficulty, nextAmount, nextType) };
    });
  }

  function acceptQuest() {
    setQuestStatus("active");
    setWorkflowWindows(["runner", "manager"]);
    setManager((current) => ({ ...current, mood: "focused", line: getPersonaLine("quest_started", getManagerPersona(current, profile)) }));
  }

  function completeQuest() {
    const result = questStatus === "recovery" ? "recovery" : "success";
    recordOutcomeStreak("success");
    const eventLine = getPersonaLine("quest_completed", getManagerPersona(manager, profile));
    const nextManager = addExp(manager, quest.rewardExp, eventLine);
    setManager((current) => addExp(current, quest.rewardExp, getPersonaLine("quest_completed", getManagerPersona(current, profile))));
    void saveQuestEvent(createQuestEventRequest(quest, result, quest.rewardExp, "happy", { managerLine: eventLine, managerBefore: manager, managerAfter: nextManager, soundEnabled: manager.soundEnabled }));
    setQuestStatus("success");
    setWorkflowWindows(["manager"]);
  }

  function startFailureFlow() {
    setQuestStatus("failed");
    setManager((current) => ({ ...current, mood: "recovering", line: getPersonaLine("quest_failed", getManagerPersona(current, profile)) }));
    setWorkflowWindows(["failure", "manager"]);
  }

  function createRecovery() {
    recordOutcomeStreak("failed");
    setPreviousQuestTitle(quest.title);
    void saveQuestEvent(createQuestEventRequest(quest, "failed", 0, "recovering", { failureReason: selectedFailureReason, managerLine: getPersonaLine("quest_failed", getManagerPersona(manager, profile)), managerBefore: manager, managerAfter: manager, soundEnabled: manager.soundEnabled }));
    setQuest(createRecoveryQuest(quest));
    setQuestStatus("recovery");
    setWorkflowWindows(["recovery", "manager"]);
    setManager((current) => ({ ...current, mood: "recovering", line: getPersonaLine("recovery_created", getManagerPersona(current, profile)) }));
  }

  function editRecovery() {
    resetOpenWindows(["quest"]);
  }

  function saveProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
    setWizardDraft(nextProfile);
    if (questStatus === "draft") setQuest(createQuest(nextProfile));
  }

  function selectManagerStage(stage: PetStageId) {
    setManager((current) => {
      if (!current.unlockedStages.includes(stage)) return current;
      return { ...current, selectedStage: stage };
    });
  }

  function toggleManagerSound() {
    setManager((current) => ({ ...current, soundEnabled: !current.soundEnabled }));
  }

  const showRecoveryHidingPet = questStatus === "recovery" && isWindowVisible("recovery") && questOutcomeStreak.result === "failed" && questOutcomeStreak.count >= 2;
  const showQuestHangingPet = questStatus === "draft" && isWindowVisible("quest") && questOutcomeStreak.result === "success" && questOutcomeStreak.count >= 2;
  const showOutsidePet = outsidePet.phase !== "inside" && outsidePet.phase !== "blink";
  const renderedOutsidePet = useMemo(
    () => resolveRenderedOutsidePet(outsidePet, interactionObjects),
    [outsidePet, interactionObjects],
  );
  const managerRuntimeState = createManagerRuntimeState({
    manager,
    displayStage: managerDisplayStage,
    outsidePet: renderedOutsidePet,
    showQuestHangingPet,
    showRecoveryHidingPet,
    showOutsidePet,
  });

  if (screen === "manager-select") return <main className="xp-boot-screen"><ManagerSelectWindow selectedPetId={selectedPetId} onSelect={setSelectedPetId} onContinue={continueWithSelectedManager} /></main>;
  if (screen === "wizard") return <main className="xp-boot-screen"><ProfileSetupWizard draft={wizardDraft} needsClarify={needsClarify} onChange={setWizardDraft} onSubmit={submitWizard} /></main>;
  if (screen === "manager-created") return <main className="xp-boot-screen"><XpWindow className="created-window" title="Manager Created" titlebarIcon="◇" onClose={undefined}><p className="created-lead">매니저가 깨어났어요.</p><div className="created-card"><DesktopPet mood="happy" petId={manager.petId} stage={managerDisplayStage} large /><div><strong>◇ 루미 ◇</strong><span>전자 생물형 페이스메이커</span><br /><small>목표를 오늘의 퀘스트로 나누고 실패하면 다음 분량을 다시 맞춰요.</small></div></div><div className="window-actions"><button className="xp-button primary" type="button" onClick={enterDesktop}>데스크톱으로 이동</button></div></XpWindow></main>;

  return (
    <main className="xp-desktop" aria-label="Manager.exe desktop" onClick={() => setPixelTvContextMenu(null)}>
      <nav className="desktop-icons" aria-label="바탕화면 아이콘">
        <DesktopIcon label="오늘의 퀘스트" type="quest" onClick={openTodayQuest} />
        <DesktopIcon label="매니저" type="manager" onClick={() => openAppWindow("manager")} />
        <DesktopIcon label="내 프로필" type="profile" onClick={() => openAppWindow("profile")} />
        <DesktopIcon label="기록 노트" type="journal" onClick={() => openAppWindow("journal")} />
        <DesktopIcon
          label={pixelTvConnected ? "Projection TV" : "Pixel TV"}
          type="pixelTvProperties"
          assetId="pixel-tv"
          overrideIdleSrc={pixelTvConnected ? projectionModeAsset?.connectedIconSrc : undefined}
          overrideHoverSrc={pixelTvConnected ? projectionModeAsset?.connectedIconHoverSrc : undefined}
          onClick={launchProjectionMode}
          onContextMenu={openPixelTvContextMenu}
        />
        <DesktopIcon label="휴지통" type="trash" onClick={() => openAppWindow("trash")} />
      </nav>

      {pixelTvContextMenu && (
        <DesktopContextMenu x={pixelTvContextMenu.x} y={pixelTvContextMenu.y} onOpenProperties={openPixelTvProperties} />
      )}

      {managerRuntimeState.showOutsidePet && (
        <OutsidePetLayer
          pet={managerRuntimeState.outside}
          petId={manager.petId}
          stage={managerRuntimeState.stage}
        />
      )}

      {isWindowVisible("quest") && <XpWindow className="quest-window" title={questStatus === "recovery" ? "복구 퀘스트" : "오늘의 퀘스트"} {...windowChrome("quest")}><QuestWindow quest={quest} status={questStatus} previousQuestTitle={previousQuestTitle} onQuestChange={updateQuest} onAccept={acceptQuest} onOpenRunner={() => openWindow("runner")} onRecommendNext={openTodayQuest} /></XpWindow>}
      {managerRuntimeState.windowInteraction === "quest_hanging" && <WindowPetInteraction state="hanging" petId={manager.petId} stage={managerRuntimeState.stage} placement="below-quest" position={windowPositions.quest} measuredRect={windowRects.quest} zIndex={10 + openWindows.indexOf("quest")} />}
      {isWindowVisible("runner") && <XpWindow className="runner-window" title="QuestRunner.exe" {...windowChrome("runner")}><QuestRunnerWindow quest={quest} remainingTime={remainingTime} onComplete={completeQuest} onFail={startFailureFlow} /></XpWindow>}
      {isWindowVisible("failure") && <XpWindow className="failure-window" title="퀘스트가 소멸했어" {...windowChrome("failure")}><FailureWindow selectedFailureReason={selectedFailureReason} onReasonChange={setSelectedFailureReason} onCreateRecovery={createRecovery} /></XpWindow>}
      {isWindowVisible("recovery") && <XpWindow className="recovery-window" title="복구 퀘스트" {...windowChrome("recovery")}><RecoveryWindow quest={quest} onEdit={editRecovery} onAccept={acceptQuest} /></XpWindow>}
      {managerRuntimeState.windowInteraction === "recovery_hiding" && <WindowPetInteraction state="hiding" petId={manager.petId} stage={managerRuntimeState.stage} placement="beside-recovery" position={windowPositions.recovery} measuredRect={windowRects.recovery} zIndex={10 + openWindows.indexOf("recovery")} />}
      {isWindowVisible("manager") && <XpWindow className="manager-window" title="매니저" {...windowChrome("manager")}><ManagerWindow manager={manager} petAway={managerRuntimeState.petAwayFromManagerWindow} /></XpWindow>}
      {isWindowVisible("profile") && <XpWindow className="profile-window" title="내 프로필" {...windowChrome("profile")}><ProfileWindow profile={profile} onSave={saveProfile} /></XpWindow>}
      {isWindowVisible("journal") && <XpWindow className="journal-window" title="기록 노트" {...windowChrome("journal")}><JournalWindow logs={logs} sync={logSync} /></XpWindow>}
      {isWindowVisible("trash") && <XpWindow className="trash-window" title="휴지통" {...windowChrome("trash")}><div className="empty-trash">비어 있음</div></XpWindow>}
      {isWindowVisible("settings") && <XpWindow className="settings-window" title="설정" {...windowChrome("settings")}><SettingsWindow manager={manager} onSelectStage={selectManagerStage} onToggleSound={toggleManagerSound} /></XpWindow>}
      {isWindowVisible("pixelTvProperties") && (
        <XpWindow className="pixel-tv-properties-window" title="Pixel TV 속성" {...windowChrome("pixelTvProperties")}>
          <PixelTvPropertiesWindow connected={pixelTvConnected} onToggle={togglePixelTvMode} />
        </XpWindow>
      )}
      {isWindowVisible("ladderObject") && (
        <XpWindow className="interaction-object-window ladder-object-window" title="사다리" resizeAxis="vertical" {...windowChrome("ladderObject")}>
          <LadderObjectWindow />
        </XpWindow>
      )}
      {isWindowVisible("platformObject") && (
        <XpWindow className="interaction-object-window platform-object-window" title="평지" resizeAxis="horizontal" {...windowChrome("platformObject")}>
          <PlatformObjectWindow />
        </XpWindow>
      )}

      <BlinkFocusOverlay effect={blinkFocus} onDone={finishBlinkFocus} />
      <footer className="taskbar">
        <button className="start-button" type="button" onClick={() => setStartOpen((value) => !value)}><span className="start-mark" />시작</button>
        {startOpen && <StartMenu questStatus={questStatus} onOpenWindow={openAppWindow} onExitService={exitService} onRestart={restartService} />}
        <div className="taskbar-items">
          {openWindows.map((windowId) => (
            <button className={activeWindow === windowId ? "active" : ""} key={windowId} type="button" onClick={() => openWindow(windowId)}>
              <WindowIconMark id={windowId} className="taskbar-icon" />
              <span className="taskbar-label">{windowLabels[windowId]}</span>
            </button>
          ))}
        </div>
        <div className="system-tray"><span>Lv.{manager.level}</span><span>{formatTime(now)}</span></div>
      </footer>
    </main>
  );
}

function StartMenu({ questStatus, onOpenWindow, onExitService, onRestart }: StartMenuProps) {
  return (
    <div className="start-menu">
      <strong>Manager.exe</strong>
      {questStatus === "active" && (
        <button type="button" onClick={() => onOpenWindow("runner")}>
          <WindowIconMark id="runner" className="menu-icon" />
          <span>QuestRunner.exe</span>
        </button>
      )}
      <button type="button" onClick={() => onOpenWindow("settings")}>
        <WindowIconMark id="settings" className="menu-icon" />
        <span>설정</span>
      </button>
      <button type="button" onClick={onRestart}>
        <span className="menu-icon text-icon" aria-hidden="true">RS</span>
        <span>다시 시작</span>
      </button>
      <button type="button" onClick={onExitService}>
        <span className="menu-icon text-icon" aria-hidden="true">IO</span>
        <span>서비스 종료</span>
      </button>
    </div>
  );
}

function ManagerSelectWindow({ selectedPetId, onSelect, onContinue }: ManagerSelectWindowProps) {
  return (
    <XpWindow className="manager-select-window" title="Manager.exe 선택" titlebarIcon="◇" onClose={undefined}>
      <section className="manager-select-panel">
        <p className="wizard-lead">함께 지낼 전자 매니저를 선택해 주세요</p>
        <div className="manager-select-grid">
          {selectableManagerPets.map((pet) => {
            const selected = selectedPetId === pet.petId;
            return (
              <button
                className={`manager-select-card ${selected ? "selected" : ""}`}
                key={pet.petId}
                type="button"
                onClick={() => onSelect(pet.petId)}
              >
                <DesktopPet mood={selected ? "happy" : "waiting"} petId={pet.petId} stage="stage-2" />
                <strong>{pet.title}</strong>
                <span>{pet.description}</span>
              </button>
            );
          })}
        </div>
        <div className="window-actions">
          <button className="xp-button primary" type="button" onClick={onContinue}>선택 완료</button>
        </div>
      </section>
    </XpWindow>
  );
}

function DesktopContextMenu({ x, y, onOpenProperties }: DesktopContextMenuProps) {
  const style = { "--menu-x": `${x}px`, "--menu-y": `${y}px` } as CSSProperties & Record<"--menu-x" | "--menu-y", string>;
  return (
    <div className="desktop-context-menu" style={style} role="menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" role="menuitem" onClick={onOpenProperties}>속성</button>
    </div>
  );
}

function PixelTvPropertiesWindow({ connected, onToggle }: PixelTvPropertiesWindowProps) {
  return (
    <section className="pixel-tv-properties-panel">
      <div className="property-summary">
        <WindowIconMark id="pixelTvProperties" className="property-icon" />
        <div>
          <strong>Pixel TV</strong>
          <span>{connected ? "Projection 앱 연결됨" : "기본 TV 아이콘"}</span>
        </div>
      </div>
      <div className="property-field">
        <span>연결 상태</span>
        <strong>{connected ? "Projection mode" : "Pixel TV"}</strong>
      </div>
      <div className="window-actions">
        <button className="xp-button primary" type="button" onClick={onToggle}>{connected ? "원래대로" : "변환"}</button>
      </div>
    </section>
  );
}

function BlinkFocusOverlay({ effect, onDone }: BlinkFocusOverlayProps) {
  if (!effect) return null;

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.currentTarget === event.target) onDone();
  }

  return (
    <div
      key={effect.id}
      className={`blink-focus-overlay ${effect.mode}`}
      aria-hidden="true"
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="blink-lid top" />
      <span className="blink-lid bottom" />
      <span className="blink-focus-glow" />
    </div>
  );
}

function ProfileSetupWizard({ draft, needsClarify, onChange, onSubmit }: ProfileSetupWizardProps) {
  return <XpWindow className="setup-window" title="Manager.exe 설치 마법사" onClose={undefined}><form className="setup-form" onSubmit={onSubmit}><p className="wizard-lead">전자 생물 매니저를 깨울 준비를 할게요</p><div className="wizard-grid"><label htmlFor="profile-name">이름</label><input id="profile-name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="김동민" /><label htmlFor="profile-nickname">닉네임</label><input id="profile-nickname" value={draft.nickname} onChange={(event) => onChange({ ...draft, nickname: event.target.value })} placeholder="루카스" /><label htmlFor="profile-goal">함께 키울 목표</label><textarea id="profile-goal" value={draft.goal} onChange={(event) => onChange({ ...draft, goal: event.target.value })} /><label htmlFor="daily-minutes">하루 가능 시간</label><select id="daily-minutes" value={draft.dailyMinutes} onChange={(event) => onChange({ ...draft, dailyMinutes: Number(event.target.value) })}><option value={15}>15분</option><option value={30}>30분</option><option value={45}>45분</option><option value={60}>60분</option></select><span>퀘스트 크기</span><div className="segmented-control">{(["tiny", "balanced", "challenge"] as QuestSize[]).map((size) => <button className={draft.questSize === size ? "selected" : ""} key={size} type="button" onClick={() => onChange({ ...draft, questSize: size })}>{size === "tiny" ? "아주 작게" : size === "balanced" ? "보통" : "도전적"}</button>)}</div><span>매니저 말투</span><div className="segmented-control">{(["calm", "friendly", "firm"] as ManagerTone[]).map((tone) => <button className={draft.managerTone === tone ? "selected" : ""} key={tone} type="button" onClick={() => onChange({ ...draft, managerTone: tone })}>{tone === "calm" ? "차분함" : tone === "friendly" ? "친구 같음" : "단호함"}</button>)}</div></div>{needsClarify && <div className="clarify-box"><strong>목표를 조금 더 구체화해볼게</strong><span>먼저 어떤 부분부터 시작할까?</span><div className="clarify-options">{["개념 읽기", "기출 문제", "오답 정리", "아직 모르겠음"].map((answer) => <label key={answer}><input type="radio" name="focus" checked={draft.focusAnswer === answer} onChange={() => onChange({ ...draft, focusAnswer: answer })} />{answer}</label>)}</div></div>}<div className="window-actions"><button className="xp-button" type="button" disabled>이전</button><button className="xp-button primary" type="submit">매니저 깨우기</button></div></form></XpWindow>;
}

function QuestWindow({ quest, status, previousQuestTitle, onQuestChange, onAccept, onOpenRunner, onRecommendNext }: QuestWindowProps) {
  if (status === "active") return <section className="quest-program-link"><div className="program-icon" aria-hidden="true">EXE</div><h2>퀘스트가 실행 중이야</h2><p>완료, 실패, 복구 흐름은 QuestRunner.exe 창에서 처리해.</p><strong>{quest.title}</strong><div className="window-actions"><button className="xp-button primary" type="button" onClick={onOpenRunner}>실행창 앞으로</button></div></section>;
  if (status === "success") return <section className="quest-program-link"><div className="program-icon" aria-hidden="true">OK</div><h2>오늘의 퀘스트를 완료했어</h2><p>기록은 저장됐고, 다음 오늘의 퀘스트를 추천할 수 있어.</p><strong>{quest.title}</strong><div className="window-actions"><button className="xp-button primary" type="button" onClick={onRecommendNext}>새 퀘스트 추천</button></div></section>;
  if (status === "failed") return <section className="quest-program-link"><div className="program-icon" aria-hidden="true">!</div><h2>복구가 필요한 퀘스트야</h2><p>실패 이유를 기록하고 더 작은 복구 퀘스트로 이어갈 수 있어.</p><strong>{quest.title}</strong></section>;
  return <section className="quest-draft">{status === "recovery" ? <div className="recovery-summary"><strong>다시 시작할 수 있는 작은 퀘스트로 줄였어</strong><span>기존: {previousQuestTitle}</span><span>복구: {quest.title}</span></div> : <div className="quest-summary"><span>오늘 수행할 퀘스트 초안</span><strong>3 / 4 완료</strong></div>}<form className="quest-form"><label htmlFor="quest-title">제목</label><input className="xp-input" id="quest-title" value={quest.title} onChange={(event) => onQuestChange({ title: event.target.value })} /><label htmlFor="quest-type">유형</label><select className="xp-select" id="quest-type" value={quest.type} onChange={(event) => onQuestChange({ type: event.target.value as QuestType })}><option value="time">시간형</option><option value="quantity">수량형</option><option value="action">행동형</option></select><label htmlFor="quest-amount">분량</label><div className="form-pair"><input className="xp-input" id="quest-amount" type="number" min={1} value={quest.amount} onChange={(event) => onQuestChange({ amount: Number(event.target.value) })} /><select className="xp-select" aria-label="분량 단위" value={quest.unit} onChange={(event) => onQuestChange({ unit: event.target.value })}><option>분</option><option>개</option><option>회</option><option>페이지</option></select></div><span>난이도</span><div className="difficulty" aria-label="난이도 선택">{(["easy", "normal", "hard"] as Difficulty[]).map((difficulty) => { const inputId = `difficulty-${difficulty}`; return <span className="choice-field" key={difficulty}><input id={inputId} name="difficulty" type="radio" checked={quest.difficulty === difficulty} onChange={() => onQuestChange({ difficulty })} /><label htmlFor={inputId}>{difficultyLabels[difficulty]}</label></span>; })}</div><label htmlFor="quest-deadline">제한 시간</label><select className="xp-select" id="quest-deadline" value={quest.deadline} onChange={(event) => onQuestChange({ deadline: event.target.value })}><option>오늘 23:59</option><option>오늘 18:00</option><option>오늘 21:00</option></select></form><div className="quest-footer"><span className="reward">예상 보상: EXP {quest.rewardExp}</span><button className="xp-button primary" type="button" onClick={onAccept}>수락</button></div></section>;
}

function QuestRunnerWindow({ quest, remainingTime, onComplete, onFail }: QuestRunnerWindowProps) {
  return (
    <section className="runner-program">
      <div className="runner-menubar">
        <span>File</span>
        <span>Quest</span>
        <span>Help</span>
      </div>
      <div className="runner-banner">
        <span className="run-badge">[RUN]</span>
        <span>{quest.title}</span>
      </div>
      <dl className="runner-grid">
        <div>
          <dt>남은 시간</dt>
          <dd>{remainingTime}</dd>
        </div>
        <div>
          <dt>종료 조건</dt>
          <dd>{quest.amount}{quest.unit} 달성</dd>
        </div>
        <div>
          <dt>보상</dt>
          <dd className="reward">EXP {quest.rewardExp}</dd>
        </div>
      </dl>
      <div className="progress-pixels" aria-label="QuestRunner progress">
        {Array.from({ length: 12 }, (_, index) => <span key={index} />)}
      </div>
      <div className="window-actions">
        <button className="xp-button primary" type="button" onClick={onComplete}>완료했어</button>
        <button className="xp-button" type="button" onClick={onFail}>실패 처리</button>
      </div>
    </section>
  );
}

function FailureWindow({ selectedFailureReason, onReasonChange, onCreateRecovery }: FailureWindowProps) {
  return (
    <section className="failure-panel">
      <div className="failure-list">
        {failureReasons.map((reason, index) => {
          const inputId = `failure-reason-${index}`;
          return (
            <span className="choice-field" key={reason}>
              <input
                id={inputId}
                type="radio"
                name="failureReason"
                checked={selectedFailureReason === reason}
                onChange={() => onReasonChange(reason)}
              />
              <label htmlFor={inputId}>{reason}</label>
            </span>
          );
        })}
      </div>
      <div className="window-actions">
        <button className="xp-button primary" type="button" onClick={onCreateRecovery}>복구 퀘스트 받기</button>
      </div>
    </section>
  );
}

function RecoveryWindow({ quest, onEdit, onAccept }: RecoveryWindowProps) {
  return (
    <section className="recovery-panel">
      <p className="recovery-title">{quest.title}</p>
      <dl className="runner-grid">
        <div>
          <dt>유형</dt>
          <dd>{questTypeLabels[quest.type]}</dd>
        </div>
        <div>
          <dt>분량</dt>
          <dd>{quest.amount}{quest.unit}</dd>
        </div>
        <div>
          <dt>보상</dt>
          <dd className="reward">EXP {quest.rewardExp}</dd>
        </div>
      </dl>
      <div className="window-actions">
        <button className="xp-button" type="button" onClick={onEdit}>수정</button>
        <button className="xp-button primary" type="button" onClick={onAccept}>수락하기</button>
      </div>
    </section>
  );
}

function ManagerWindow({ manager, petAway }: ManagerWindowProps) {
  const displayStage = getManagerDisplayStage(manager);
  return (
    <section className="manager-panel">
      <div className="manager-stage">
        <strong className="manager-name">◇ {manager.name} ◇</strong>
        <div className={`manager-visual ${petAway ? "pet-away" : ""}`}>
          <div className="reaction-bubble" aria-hidden="true" />
          {!petAway && <DesktopPet mood={manager.mood} petId={manager.petId} stage={displayStage} large />}
        </div>
        <div className="manager-progress">
          <span className="level">Lv.{manager.level}</span>
          <div
            className="exp-bar"
            role="progressbar"
            aria-label="루미 경험치"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={manager.exp}
          >
            <i style={{ width: `${manager.exp}%` }} />
          </div>
          <span className="exp-value">{manager.exp} / 100 EXP</span>
        </div>
        <div className="manager-status">
          <span className={`status-pixel ${manager.mood}`}>{managerStatusIcons[manager.mood]}</span>
          <span>{managerStatusLabels[manager.mood]}</span>
        </div>
      </div>
      <p className="dialogue-panel">{manager.line}</p>
    </section>
  );
}

function SettingsWindow({ manager, onSelectStage, onToggleSound }: SettingsWindowProps) {
  const displayStage = getManagerDisplayStage(manager);
  return (
    <section className="settings-panel">
      <div className="settings-group">
        <strong>외형</strong>
        <span>해금된 모습 중 하나를 선택할 수 있어.</span>
        <div className="stage-switcher" aria-label="해금 외형 선택">
          {manager.unlockedStages.map((stage) => (
            <button className={displayStage === stage ? "selected" : ""} key={stage} type="button" onClick={() => onSelectStage(stage)}>
              {stageLabels[stage]}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-group">
        <strong>사운드</strong>
        <span>효과음과 매니저 소리를 켜거나 끌 수 있어.</span>
        <button className={`sound-toggle ${manager.soundEnabled ? "enabled" : ""}`} type="button" onClick={onToggleSound}>
          {manager.soundEnabled ? "사운드 켜짐" : "사운드 꺼짐"}
        </button>
      </div>
    </section>
  );
}

function ProfileWindow({ profile, onSave }: ProfileWindowProps) {
  const [draft, setDraft] = useState(profile);
  return <form className="profile-edit" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><div className="profile-form"><label htmlFor="profile-edit-name">이름</label><input className="xp-input" id="profile-edit-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><label htmlFor="profile-edit-nickname">닉네임</label><input className="xp-input" id="profile-edit-nickname" value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} /><label htmlFor="profile-edit-goal">주요 목표</label><textarea className="xp-textarea" id="profile-edit-goal" value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /><label htmlFor="profile-edit-minutes">가능 시간</label><select className="xp-select" id="profile-edit-minutes" value={draft.dailyMinutes} onChange={(event) => setDraft({ ...draft, dailyMinutes: Number(event.target.value) })}><option value={15}>15분</option><option value={30}>30분</option><option value={45}>45분</option><option value={60}>60분</option></select></div><div className="window-actions"><button className="xp-button primary" type="submit">저장</button></div></form>;
}

function JournalWindow({ logs, sync }: JournalWindowProps) {
  return (
    <section className="journal-panel">
      {sync.message && <p className={`sync-notice ${sync.status}`}>{sync.message}</p>}
      {logs.length === 0 ? (
        <div className="journal-empty">
          <strong>아직 기록이 없어.</strong>
          <p>퀘스트를 완료하거나 복구하면 이곳에 기록돼.</p>
        </div>
      ) : (
        <div className="notes-list">
          {logs.map((log) => {
            const statDeltas = getQuestLogStatDeltas(log);
            const rewards = getQuestLogRewardCandidates(log);
            const stageUnlocks = getQuestLogStageUnlocks(log);
            return (
              <div className="note-row" key={log.id}>
                <span className={`log-mark ${log.result}`}>{questLogMarks[log.result]}</span>
                <span>
                  {log.title} <small>{log.reason ?? questLogResultLabels[log.result]}</small>
                  {(statDeltas.length > 0 || rewards.length > 0 || stageUnlocks.length > 0) && (
                    <span className="log-chips">
                      {statDeltas.map((delta) => (
                        <span className="log-chip stat" key={`${log.id}-${delta.stat}`}>
                          {statLabels[delta.stat]} +{delta.amount}
                        </span>
                      ))}
                      {stageUnlocks.map((stage) => (
                        <span className="log-chip reward" key={`${log.id}-${stage}`}>
                          {stageLabels[stage]} 해금
                        </span>
                      ))}
                      {rewards.map((reward) => (
                        <span className="log-chip reward" key={`${log.id}-${reward}`}>
                          {rewardCandidateLabels[reward] ?? reward}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <strong>EXP +{log.exp}</strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function XpWindow({ id, title, titlebarIcon, className, children, position, size, resizeAxis = "none", zIndex, isActive, onFocus, onMove, onResize, onMeasure, onMinimize, onClose }: XpWindowProps) {
  const windowRef = useRef<HTMLElement | null>(null);
  const [dragOffset, setDragOffset] = useState<WindowPosition | null>(null);
  const [resizeStart, setResizeStart] = useState<{ pointerX: number; pointerY: number; size: WindowSize } | null>(null);
  const windowStyle = position
    ? ({
        "--window-x": `${position.x}px`,
        "--window-y": `${position.y}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: "auto",
        width: size ? `${size.width}px` : undefined,
        height: size ? `${size.height}px` : undefined,
        zIndex,
      } as CSSProperties & Record<"--window-x" | "--window-y", string>)
    : undefined;
  const icon = titlebarIcon ?? (id ? windowTitleIcons[id] : "M");

  useLayoutEffect(() => {
    if (!onMeasure) return undefined;

    const windowElement = windowRef.current;
    if (!windowElement) return undefined;

    const measure = () => {
      const rect = windowElement.getBoundingClientRect();
      onMeasure({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    measure();
    window.addEventListener("resize", measure);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", measure);
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(windowElement);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [position?.x, position?.y, size?.height, size?.width]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!id || !position || !onMove) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const windowElement = event.currentTarget.closest(".xp-window");
    if (!windowElement) return;

    const rect = windowElement.getBoundingClientRect();
    setDragOffset({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    onFocus?.();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragWindow(event: PointerEvent<HTMLDivElement>) {
    if (!dragOffset || !onMove) return;

    const maxX = Math.max(0, window.innerWidth - 180);
    const maxY = Math.max(0, window.innerHeight - 78);
    onMove({
      x: Math.min(Math.max(event.clientX - dragOffset.x, 0), maxX),
      y: Math.min(Math.max(event.clientY - dragOffset.y, 0), maxY),
    });
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragOffset) return;

    setDragOffset(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (!size || resizeAxis === "none" || !onResize) return;

    setResizeStart({ pointerX: event.clientX, pointerY: event.clientY, size });
    onFocus?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function resizeWindow(event: PointerEvent<HTMLButtonElement>) {
    if (!resizeStart || resizeAxis === "none" || !onResize) return;

    const nextWidth = resizeAxis === "horizontal"
      ? Math.max(112, Math.min(360, resizeStart.size.width + event.clientX - resizeStart.pointerX))
      : resizeStart.size.width;
    const nextHeight = resizeAxis === "vertical"
      ? Math.max(112, Math.min(300, resizeStart.size.height + event.clientY - resizeStart.pointerY))
      : resizeStart.size.height;
    onResize({ width: nextWidth, height: nextHeight });
  }

  function stopResize(event: PointerEvent<HTMLButtonElement>) {
    if (!resizeStart) return;

    setResizeStart(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section
      ref={windowRef}
      className={`xp-window ${position ? "positioned" : ""} ${isActive ? "active" : ""} ${className}`}
      onPointerDown={onFocus}
      style={windowStyle}
    >
      <div
        className="xp-titlebar"
        onPointerDown={startDrag}
        onPointerMove={dragWindow}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <WindowIconMark id={id} fallback={icon} className="titlebar-icon" />
        <span className="titlebar-name">{title}</span>
        <div className="window-buttons">
          <button type="button" aria-label="minimize" onClick={onMinimize} disabled={!onMinimize} />
          <button type="button" aria-label="maximize" disabled />
          <button type="button" aria-label="close" onClick={onClose} disabled={!onClose} />
        </div>
      </div>
      <div className="xp-window-body">{children}</div>
      {resizeAxis !== "none" && (
        <button
          className={`xp-window-resize-handle ${resizeAxis}`}
          type="button"
          aria-label={resizeAxis === "vertical" ? "창 높이 조절" : "창 너비 조절"}
          onPointerDown={startResize}
          onPointerMove={resizeWindow}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
        />
      )}
    </section>
  );
}

function WindowIconMark({ id, fallback, className }: WindowIconMarkProps) {
  const manifestId = id ? windowIconAssetIds[id] : undefined;
  const asset = manifestId ? getDesktopIconAsset(manifestId).idleSrc : id ? legacyWindowIconAssets[id] : undefined;
  return (
    <span className={className} aria-hidden="true">
      {asset ? <img src={asset} alt="" /> : fallback ?? (id ? windowTitleIcons[id] : "M")}
    </span>
  );
}

function DesktopIcon({
  label,
  type,
  onClick,
  onContextMenu,
  assetId,
  overrideIdleSrc,
  overrideHoverSrc,
  disabled = false,
}: DesktopIconProps) {
  const [iconState, setIconState] = useState<"idle" | "hover" | "active">("idle");
  const manifestId = assetId ?? desktopIconAssetIds[type];
  const asset = manifestId ? getDesktopIconAsset(manifestId) : undefined;
  const idleSrc = overrideIdleSrc ?? asset?.idleSrc;
  const hoverSrc = overrideHoverSrc ?? asset?.hoverSrc;
  const activeSrc = overrideHoverSrc ?? asset?.activeSrc;
  const iconSrc = disabled ? asset?.disabledSrc : iconState === "active" ? activeSrc : iconState === "hover" ? hoverSrc : idleSrc;
  return (
    <button
      className={`desktop-icon ${type} ${iconState}`}
      type="button"
      onBlur={() => setIconState("idle")}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerCancel={() => setIconState("idle")}
      onPointerDown={() => setIconState("active")}
      onPointerEnter={() => setIconState("hover")}
      onPointerLeave={() => setIconState("idle")}
      onPointerUp={() => setIconState("hover")}
      disabled={disabled}
    >
      <span className="desktop-icon-graphic" aria-hidden="true">{iconSrc && <img src={iconSrc} alt="" />}</span>
      <strong>{label}</strong>
    </button>
  );
}

function LadderObjectWindow() {
  const asset = getInteractionObjectAsset("ladder");

  return (
    <section className="object-window-content ladder-object-content" aria-label="사다리 오브젝트">
      <div className="ladder-tile-stack" aria-hidden="true">
        <img className="ladder-tile-cap" src={asset.tiles?.top ?? asset.src} alt="" draggable={false} />
        <span className="ladder-tile-repeat" style={{ backgroundImage: `url(${asset.tiles?.middleRepeat ?? asset.src})` }} />
        <img className="ladder-tile-cap" src={asset.tiles?.bottom ?? asset.src} alt="" draggable={false} />
      </div>
    </section>
  );
}

function PlatformObjectWindow() {
  const asset = getInteractionObjectAsset("platform");

  return (
    <section className="object-window-content platform-object-content" aria-label="평지 오브젝트">
      <div className="platform-tile-strip" aria-hidden="true">
        <img className="platform-tile-cap" src={asset.tiles?.left ?? asset.src} alt="" draggable={false} />
        <span className="platform-tile-repeat" style={{ backgroundImage: `url(${asset.tiles?.centerRepeat ?? asset.src})` }} />
        <img className="platform-tile-cap" src={asset.tiles?.right ?? asset.src} alt="" draggable={false} />
      </div>
    </section>
  );
}

function OutsidePetLayer({ pet, petId, stage }: OutsidePetLayerProps) {
  const renderableStage = getRenderablePetStage(petId, stage);
  const animation = getInteractionPrototypeAnimation(petId, renderableStage, pet.animation);
  const petStyle = {
    left: `${pet.position.x}px`,
    top: `${pet.position.y}px`,
  } as CSSProperties;

  return (
    <div className={`outside-pet-layer ${pet.phase} ${pet.animation}`} data-pet-stage={renderableStage} style={petStyle} aria-hidden="true">
      <CanvasSpriteAnimator
        animation={animation}
        ariaLabel={`${pet.animation} 핑크 매니저`}
        forceMotion={pet.phase !== "peek_from_edge"}
        mirrorX={shouldMirrorOutsidePet(pet)}
      />
    </div>
  );
}

function WindowPetInteraction({ state, petId, stage, placement, position, measuredRect, zIndex }: WindowPetInteractionProps) {
  const animation = getLumiAnimationAsset(state, petId, stage);
  const renderableStage = getRenderablePetStage(petId, stage);
  const placementDrafts = readWindowPetPlacementDrafts((key) => window.localStorage.getItem(key));
  const runtimeSlot = runtimeWindowPetSlots[placement];
  const selectedPlacement = placementDrafts[runtimeSlot.motion][runtimeSlot.edge];
  const targetPosition = measuredRect ? { x: measuredRect.x, y: measuredRect.y } : position;
  const targetSize = measuredRect ? { width: measuredRect.width, height: measuredRect.height } : runtimeSlot.windowSize;
  const resolvedPosition = resolveWindowPetPosition({
    placement: selectedPlacement,
    windowPosition: targetPosition,
    windowSize: targetSize,
    frameWidth: animation.frameWidth,
    anchor: animation.anchor,
    baseSpriteSize: 96,
  });
  const interactionStyle = {
    left: `${resolvedPosition.left}px`,
    top: `${resolvedPosition.top}px`,
    width: `${resolvedPosition.size}px`,
    height: `${resolvedPosition.size}px`,
    zIndex: resolvedPosition.layer === "behind-window" ? Math.max(1, zIndex - 1) : zIndex + 1,
  } as CSSProperties;

  return (
    <div className={`window-pet-interaction ${placement} ${state} ${resolvedPosition.layer}`} data-pet-stage={renderableStage} style={interactionStyle} aria-hidden="true">
      <CanvasSpriteAnimator animation={animation} ariaLabel={`${state} 핑크 매니저`} mirrorX={selectedPlacement.mirrorX} />
    </div>
  );
}

function getInteractionPrototypeAnimation(petId: PetId, stage: PetStageId, state: PetAnimationState) {
  try {
    return getPetAnimationAsset(petId, stage, state);
  } catch {
    return getPetAnimationAsset(defaultLumiPetId, "stage-2", state);
  }
}

function getInteractionObjectAsset(type: InteractionObjectAsset["type"]): InteractionObjectAsset {
  return interactionObjectAssets.find((asset) => asset.type === type) ?? interactionObjectAssets[0];
}

function createManagerRuntimeState(input: ManagerRuntimeStateInput): ManagerRuntimeState {
  if (input.showOutsidePet) {
    return {
      location: "outside",
      mood: input.manager.mood,
      stage: input.displayStage,
      animation: input.outsidePet.animation,
      windowInteraction: "none",
      outside: input.outsidePet,
      petAwayFromManagerWindow: true,
      showOutsidePet: true,
    };
  }

  if (input.outsidePet.phase === "blink") {
    return {
      location: "transition",
      mood: input.manager.mood,
      stage: input.displayStage,
      animation: "hiding",
      windowInteraction: "none",
      outside: input.outsidePet,
      petAwayFromManagerWindow: true,
      showOutsidePet: false,
    };
  }

  if (input.showQuestHangingPet) {
    return {
      location: "window_edge",
      mood: input.manager.mood,
      stage: input.displayStage,
      animation: "hanging",
      windowInteraction: "quest_hanging",
      outside: input.outsidePet,
      petAwayFromManagerWindow: true,
      showOutsidePet: false,
    };
  }

  if (input.showRecoveryHidingPet) {
    return {
      location: "window_edge",
      mood: input.manager.mood,
      stage: input.displayStage,
      animation: "hiding",
      windowInteraction: "recovery_hiding",
      outside: input.outsidePet,
      petAwayFromManagerWindow: true,
      showOutsidePet: false,
    };
  }

  return {
    location: "manager_window",
    mood: input.manager.mood,
    stage: input.displayStage,
    animation: lumiMoodToSpriteState[input.manager.mood],
    windowInteraction: "none",
    outside: input.outsidePet,
    petAwayFromManagerWindow: false,
    showOutsidePet: false,
  };
}

function createInteractionObjectsFromWindows(
  positions: Record<WindowId, WindowPosition>,
  sizes: Partial<Record<WindowId, WindowSize>>,
): InteractionObject[] {
  const ladderPosition = positions.ladderObject;
  const ladderSize = sizes.ladderObject ?? initialWindowSizes.ladderObject ?? { width: 86, height: 184 };
  const platformPosition = positions.platformObject;
  const platformSize = sizes.platformObject ?? initialWindowSizes.platformObject ?? { width: 280, height: 124 };

  return [
    {
      id: "ladder-1",
      type: "ladder",
      resizeAxis: "vertical",
      rect: {
        x: ladderPosition.x + ladderSize.width / 2 - 18,
        y: ladderPosition.y + 32,
        width: 36,
        height: Math.max(72, ladderSize.height - 46),
      },
    },
    {
      id: "platform-1",
      type: "platform",
      resizeAxis: "horizontal",
      rect: {
        x: platformPosition.x + 18,
        y: platformPosition.y + Math.max(48, platformSize.height - 53),
        width: Math.max(96, platformSize.width - 36),
        height: 22,
      },
    },
    {
      id: "escape-edge-1",
      type: "window_escape_edge",
      resizeAxis: "none",
      rect: { x: window.innerWidth - 18, y: outsidePetFieldRect.y - 48, width: 10, height: 150 },
    },
  ];
}

function getNextOutsidePetRoamAnimation(
  pet: OutsidePetState,
  objects: InteractionObject[],
  manager: ManagerState,
  tone: ManagerTone,
  streak: QuestOutcomeStreak,
  reducedMotion: boolean,
): PetAnimationState {
  const petRect = { x: pet.position.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };
  const context: BehaviorContext = {
    pet: petRect,
    objects,
    mood: getBehaviorMoodFromManagerMood(manager.mood),
    recentEvent: getRecentBehaviorEvent(streak),
    reducedMotion,
  };
  const resolvedBehavior = resolveManagerBehavior({
    rawIntent: createRuleFallbackManagerIntent(manager, tone, streak),
    context,
    randomValue: (Date.now() / 1000) % 1,
  });
  const mappedAnimation = resolvedBehavior.animation;

  if (mappedAnimation === "hanging" || mappedAnimation === "hiding") return "idle";
  return mappedAnimation;
}

function getNearestOutsidePetSide(position: InteractionSpritePosition): OutsidePetSide {
  const fieldCenter = outsidePetFieldRect.x + outsidePetFieldRect.width / 2;
  return position.x < fieldCenter ? "left" : "right";
}

function getBehaviorMoodFromManagerMood(mood: ManagerState["mood"]): PetBehaviorMood {
  return mood;
}

function getRecentBehaviorEvent(streak: QuestOutcomeStreak): PetBehaviorRecentEvent {
  if (streak.result === "success") return "quest_completed";
  if (streak.result === "failed") return "quest_failed";
  return null;
}

function resolveOutsidePetRoamPosition(
  pet: OutsidePetState,
  animation: PetAnimationState,
  fallbackPosition: InteractionSpritePosition,
  objects: InteractionObject[],
): InteractionSpritePosition {
  const petRect = { x: pet.position.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize };

  if (animation === "climbing") {
    const ladder = getNearbyLadder(petRect, objects);
    if (ladder) return resolveOutsidePetAttachmentPosition(ladder, animation);
  }

  if (animation === "jump") {
    const platform = getNearbyPlatform(petRect, objects);
    if (platform) return { x: platform.rect.x + platform.rect.width / 2 - outsidePetSpriteSize / 2, y: platform.rect.y - outsidePetSpriteSize + 12 };
  }

  const standingPlatform = getStandingPlatform({ x: fallbackPosition.x, y: pet.position.y, width: outsidePetSpriteSize, height: outsidePetSpriteSize }, objects);
  if (standingPlatform) return { x: fallbackPosition.x, y: standingPlatform.rect.y - outsidePetSpriteSize + 12 };

  return { x: fallbackPosition.x, y: outsidePetFieldRect.y };
}

function resolveOutsidePetAttachmentPosition(object: InteractionObject, animation: PetAnimationState): InteractionSpritePosition {
  if (animation === "climbing" && object.type === "ladder") {
    const climbPosition = getClimbPosition(object.rect, 0.48);
    return { x: climbPosition.x - outsidePetSpriteSize / 2, y: climbPosition.y - outsidePetSpriteSize / 2 };
  }

  return { x: object.rect.x + object.rect.width / 2 - outsidePetSpriteSize / 2, y: outsidePetFieldRect.y };
}

function resolveRenderedOutsidePet(pet: OutsidePetState, objects: InteractionObject[]): OutsidePetState {
  if (pet.phase !== "free_roam" || pet.animation !== "climbing" || !pet.attachedObjectId) return pet;

  const attachedObject = objects.find((object) => object.id === pet.attachedObjectId);
  if (!attachedObject || attachedObject.type !== "ladder") return pet;

  return {
    ...pet,
    position: resolveOutsidePetAttachmentPosition(attachedObject, "climbing"),
  };
}

function resolveOutsidePetDirection(pet: OutsidePetState, objects: InteractionObject[]): 1 | -1 {
  const minX = outsidePetFieldRect.x;
  const maxX = outsidePetFieldRect.x + outsidePetFieldRect.width - outsidePetSpriteSize;
  if (pet.position.x <= minX + 12) return 1;
  if (pet.position.x >= maxX - 12) return -1;

  const targetDirection = getInteractionObjectApproachDirection(pet, objects);
  if (targetDirection) return targetDirection;

  const shouldTurn = pet.roamTicks > 0 && pet.roamTicks % 7 === 0;
  if (shouldTurn) return pet.direction === 1 ? -1 : 1;
  return pet.direction;
}

function getInteractionObjectApproachDirection(pet: OutsidePetState, objects: InteractionObject[]): 1 | -1 | null {
  const objectTargets = objects
    .filter((object) => object.type === "ladder" || object.type === "platform")
    .map((object) => ({ object, distance: Math.abs(getRectCenterX(object.rect) - (pet.position.x + outsidePetSpriteSize / 2)) }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = objectTargets[0];
  if (!nearest || nearest.distance < 36 || nearest.distance > 340) return null;
  return getRectCenterX(nearest.object.rect) > pet.position.x + outsidePetSpriteSize / 2 ? 1 : -1;
}

function shouldMirrorOutsidePet(pet: OutsidePetState): boolean {
  return pet.direction < 0;
}

function getNearbyLadder(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => object.type === "ladder" && isNearObject(petRect, object.rect, 96));
}

function getNearbyPlatform(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => {
    if (object.type !== "platform") return false;

    const petFootX = petRect.x + petRect.width / 2;
    const petFootY = petRect.y + petRect.height;
    const horizontalReach = petFootX >= object.rect.x - 72 && petFootX <= object.rect.x + object.rect.width + 72;
    const verticalReach = Math.abs(petFootY - object.rect.y) <= 150;
    return horizontalReach && verticalReach;
  });
}

function getStandingPlatform(petRect: { x: number; y: number; width: number; height: number }, objects: InteractionObject[]): InteractionObject | undefined {
  return objects.find((object) => {
    if (object.type !== "platform") return false;

    const petFootX = petRect.x + petRect.width / 2;
    const petFootY = petRect.y + petRect.height;
    const insidePlatform = petFootX >= object.rect.x && petFootX <= object.rect.x + object.rect.width;
    const closeToTop = Math.abs(petFootY - object.rect.y) <= 28;
    return insidePlatform && closeToTop;
  });
}

function getRectCenterX(rect: { x: number; width: number }): number {
  return rect.x + rect.width / 2;
}

function isNearObject(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, threshold: number): boolean {
  return (
    a.x < b.x + b.width + threshold &&
    a.x + a.width > b.x - threshold &&
    a.y < b.y + b.height + threshold &&
    a.y + a.height > b.y - threshold
  );
}

function DesktopPet({ mood, petId, stage, large = false }: DesktopPetProps) {
  const [hovered, setHovered] = useState(false);
  const spriteState = hovered ? "hover" : lumiMoodToSpriteState[mood];
  const animation = getLumiAnimationAsset(spriteState, petId, stage);
  const renderableStage = getRenderablePetStage(petId, stage);

  return (
    <span
      className={`desktop-pet-sprite ${mood} ${spriteState} ${large ? "large" : ""}`}
      data-pet-stage={renderableStage}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <CanvasSpriteAnimator animation={animation} ariaLabel="핑크 매니저" />
    </span>
  );
}
