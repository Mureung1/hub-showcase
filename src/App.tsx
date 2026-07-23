import { useEffect, useMemo, useState } from "react";
import type { AnimationEvent, CSSProperties, FormEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { CanvasSpriteAnimator } from "./components/CanvasSpriteAnimator";
import {
  getDesktopIconAsset,
  getLumiAnimationAsset,
  getRenderablePetStage,
  getUnlockedPetStages,
  projectionModeAssets,
  defaultLumiPetId,
  lumiMoodToSpriteState,
  resolvePetStageFromLevel,
  type DesktopIconId,
  type LumiSpriteState,
  type PetId,
  type PetStageId,
} from "./data/assetManifest";
import { prependQuestLog, questLogMarks, questLogResultLabels } from "./data/questLogs";
import type { QuestLog } from "./data/questLogs";
import { createQuestEventViaApi, fetchManagerContextViaApi, fetchQuestEventsViaApi } from "./layers/storage/questLogApi";
import type { CreateQuestEventRequest, ManagerContext } from "./layers/storage/questLogApi";
import { createQuestLogRepository } from "./layers/storage/questLogRepository";
import { createRecoveryQuest, type Difficulty, type Quest, type QuestType } from "./domain/questLogic";
import "./styles.css";

type AppScreen = "wizard" | "manager-created" | "desktop";
type QuestStatus = "draft" | "active" | "success" | "failed" | "recovery";
type ManagerTone = "calm" | "friendly" | "firm";
type QuestSize = "tiny" | "balanced" | "challenge";
type WindowId = "quest" | "runner" | "failure" | "recovery" | "manager" | "profile" | "journal" | "trash" | "pixelTvProperties";
type QuestLogSyncStatus = "idle" | "loading" | "saving" | "success" | "error";
type BlinkFocusMode = "start_day" | "end_day";
type PixelTvMode = "default" | "projection";

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
  unlockedStages: PetStageId[];
  selectedStage: PetStageId | null;
}


interface WindowPosition {
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

interface StartMenuProps {
  questStatus: QuestStatus;
  onOpenWindow: (id: WindowId) => void;
  onOpenQuest: () => void;
  onExitService: () => void;
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
  zIndex?: number;
  isActive?: boolean;
  onFocus?: () => void;
  onMove?: (position: WindowPosition) => void;
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

interface WindowPetInteractionProps {
  state: Extract<LumiSpriteState, "hanging" | "hiding">;
  petId: PetId;
  stage: PetStageId;
  placement: "below-quest" | "beside-recovery";
  position: WindowPosition;
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
  pixelTvProperties: { x: 360, y: 185 },
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
  pixelTvProperties: "Pixel TV 속성",
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
  pixelTvProperties: "TV",
};

const desktopIconAssetIds: Partial<Record<WindowId, DesktopIconId>> = {
  quest: "quest",
  manager: "manager",
  profile: "profile",
  journal: "journal",
  trash: "trash",
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
  unlockedStages: ["stage-1"],
  selectedStage: null,
};

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
  return { ...manager, petId: manager.petId ?? defaultLumiPetId, unlockedStages, selectedStage };
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

function addExp(manager: ManagerState, exp: number): ManagerState {
  const total = manager.exp + exp;
  const levelUps = Math.floor(total / 100);
  const nextLevel = manager.level + levelUps;
  return {
    ...manager,
    level: nextLevel,
    exp: total % 100,
    mood: "happy",
    line: "오늘 기록이 쌓였어. 다음에도 작은 걸로 이어가자.",
    unlockedStages: getUnlockedPetStages(nextLevel),
  };
}

function getManagerDisplayStage(manager: ManagerState): PetStageId {
  return manager.selectedStage ?? resolvePetStageFromLevel(manager.level);
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
  options: { failureReason?: string | null; previousQuestTitle?: string | null; managerLine?: string | null } = {},
): CreateQuestEventRequest {
  return {
    type: getQuestEventType(result),
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
      rewardCandidates: getRewardCandidates(result),
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

function createManagerContextLine(context: ManagerContext) {
  if (context.lastQuestResult === "failed") return "실패 이유를 기억해뒀어. 다음 퀘스트는 더 작게 맞춰볼게.";
  if (context.lastQuestResult === "recovery") return "복구 흐름까지 기억했어. 다시 이어간 기록이 남았어.";
  if (context.lastQuestResult === "success") return "완료 기록을 기억으로 정리했어. 다음 추천에 반영할게.";
  return "오늘 흐름을 조용히 정리하고 있어.";
}


export default function App() {
  const storedProfile = useMemo(() => readStorage<UserProfile | null>(profileKey, null), []);
  const [screen, setScreen] = useState<AppScreen>(storedProfile ? "desktop" : "wizard");
  const [profile, setProfile] = useState<UserProfile>(storedProfile ?? defaultProfile);
  const [wizardDraft, setWizardDraft] = useState<UserProfile>(storedProfile ?? defaultProfile);
  const [manager, setManager] = useState<ManagerState>(() => normalizeManager(readStorage(managerKey, defaultManager)));
  const [logs, setLogs] = useState<QuestLog[]>(() => questLogRepository.get());
  const [quest, setQuest] = useState<Quest>(() => createQuest(storedProfile ?? defaultProfile));
  const [questStatus, setQuestStatus] = useState<QuestStatus>("draft");
  const [openWindows, setOpenWindows] = useState<WindowId[]>(["quest", "manager"]);
  const [windowPositions, setWindowPositions] = useState<Record<WindowId, WindowPosition>>(initialWindowPositions);
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { if (screen !== "wizard") writeStorage(profileKey, profile); }, [profile, screen]);
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

  const activeWindow = openWindows[openWindows.length - 1];
  const remainingTime = formatRemaining(now);
  const managerDisplayStage = getManagerDisplayStage(manager);
  const projectionModeAsset = projectionModeAssets.find((asset) => asset.mode === "single_plane_pepper");
  const pixelTvConnected = pixelTvMode === "projection";

  function triggerBlinkFocus(mode: BlinkFocusMode) { setBlinkFocus({ id: Date.now(), mode }); }
  function openWindow(id: WindowId) {
    setOpenWindows((current) => [...current.filter((windowId) => windowId !== id), id]);
  }
  function closeWindow(id: WindowId) {
    setOpenWindows((current) => current.filter((windowId) => windowId !== id));
  }
  function enterDesktop() {
    triggerBlinkFocus("start_day");
    setScreen("desktop");
  }
  function exitService() {
    setStartOpen(false);
    setExitAfterBlink(true);
    triggerBlinkFocus("end_day");
  }
  function finishBlinkFocus() {
    setBlinkFocus(null);
    if (!exitAfterBlink) return;
    setExitAfterBlink(false);
    setOpenWindows(["quest", "manager"]);
    setScreen("manager-created");
  }
  function togglePixelTvMode() {
    setPixelTvMode((current) => (current === "projection" ? "default" : "projection"));
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
  function moveWindow(id: WindowId, position: WindowPosition) { setWindowPositions((current) => ({ ...current, [id]: position })); }
  function recordQuestLog(log: QuestLog) { setLogs((current) => prependQuestLog(current, log)); }
  function recordOutcomeStreak(result: "success" | "failed") {
    setQuestOutcomeStreak((current) => ({
      result,
      count: current.result === result ? current.count + 1 : 1,
    }));
  }
  function applyManagerContext(context: ManagerContext) {
    setManager((current) => ({ ...current, mood: context.currentMood, line: createManagerContextLine(context) }));
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
      setManager((current) => ({ ...current, line: "기록 저장이 잠시 실패했어. 그래도 오늘의 흐름은 이어갈 수 있어." }));
    }
  }

  function openTodayQuest() {
    if (questStatus === "success") {
      setQuest(createQuest(profile));
      setQuestStatus("draft");
      setPreviousQuestTitle("");
      setManager((current) => ({ ...current, mood: "waiting", line: "새 오늘의 퀘스트 초안을 준비했어. 이번에도 작은 분량부터 가보자." }));
      setOpenWindows((current) => replaceWorkflowWindows(current, ["quest", "manager"]));
      return;
    }

    if (questStatus === "active") {
      setOpenWindows((current) => replaceWorkflowWindows(current, ["runner", "manager"]));
      return;
    }

    if (questStatus === "failed") {
      setOpenWindows((current) => replaceWorkflowWindows(current, ["failure", "manager"]));
      return;
    }

    if (questStatus === "recovery") {
      setOpenWindows((current) => replaceWorkflowWindows(current, ["recovery", "manager"]));
      return;
    }

    openWindow("quest");
  }

  function submitWizard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGoalAbstract(wizardDraft.goal) && !wizardDraft.focusAnswer) { setNeedsClarify(true); return; }
    const savedProfile: UserProfile = { ...wizardDraft, name: wizardDraft.name.trim() || "사용자", nickname: wizardDraft.nickname.trim() || "루카스", goal: wizardDraft.goal.trim() || defaultProfile.goal };
    setProfile(savedProfile);
    setQuest(createQuest(savedProfile));
    setQuestStatus("draft");
    setManager({ ...defaultManager, line: toneLines[savedProfile.managerTone] });
    setLogs([]);
    setOpenWindows(["quest", "manager"]);
    setWindowPositions(initialWindowPositions);
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
    setOpenWindows((current) => replaceWorkflowWindows(current, ["runner", "manager"]));
    setManager((current) => ({ ...current, mood: "focused", line: "끝까지 기다릴게. 네 속도로 진행하면 돼." }));
  }

  function completeQuest() {
    const result = questStatus === "recovery" ? "recovery" : "success";
    recordOutcomeStreak("success");
    setManager((current) => addExp(current, quest.rewardExp));
    void saveQuestEvent(createQuestEventRequest(quest, result, quest.rewardExp, "happy", { managerLine: "완료 기록을 기억으로 정리했어." }));
    setQuestStatus("success");
    setOpenWindows((current) => replaceWorkflowWindows(current, ["manager"]));
  }

  function startFailureFlow() {
    setQuestStatus("failed");
    setManager((current) => ({ ...current, mood: "recovering", line: "이번 기록을 보고 다음 분량을 다시 맞춰볼게." }));
    setOpenWindows((current) => replaceWorkflowWindows(current, ["failure", "manager"]));
  }

  function createRecovery() {
    recordOutcomeStreak("failed");
    setPreviousQuestTitle(quest.title);
    void saveQuestEvent(createQuestEventRequest(quest, "failed", 0, "recovering", { failureReason: selectedFailureReason, managerLine: "실패 이유를 기억하고 복구 분량을 다시 맞췄어." }));
    setQuest(createRecoveryQuest(quest));
    setQuestStatus("recovery");
    setOpenWindows((current) => replaceWorkflowWindows(current, ["recovery", "manager"]));
    setManager((current) => ({ ...current, mood: "recovering", line: "다시 시작할 수 있는 작은 분량으로 준비했어." }));
  }

  function editRecovery() {
    setOpenWindows(["quest"]);
  }

  function saveProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
    setWizardDraft(nextProfile);
    if (questStatus === "draft") setQuest(createQuest(nextProfile));
  }

  function windowChrome(id: WindowId) {
    return { id, position: windowPositions[id], zIndex: 10 + openWindows.indexOf(id), isActive: activeWindow === id, onFocus: () => openWindow(id), onMove: (position: WindowPosition) => moveWindow(id, position), onClose: () => closeWindow(id) };
  }

  const showRecoveryHidingPet = questStatus === "recovery" && openWindows.includes("recovery") && questOutcomeStreak.result === "failed" && questOutcomeStreak.count >= 2;
  const showQuestHangingPet = questStatus === "draft" && openWindows.includes("quest") && questOutcomeStreak.result === "success" && questOutcomeStreak.count >= 2;

  if (screen === "wizard") return <main className="xp-boot-screen"><ProfileSetupWizard draft={wizardDraft} needsClarify={needsClarify} onChange={setWizardDraft} onSubmit={submitWizard} /></main>;
  if (screen === "manager-created") return <main className="xp-boot-screen"><XpWindow className="created-window" title="Manager Created" titlebarIcon="◇" onClose={undefined}><p className="created-lead">매니저가 깨어났어요.</p><div className="created-card"><DesktopPet mood="happy" petId={manager.petId} stage={managerDisplayStage} large /><div><strong>◇ 루미 ◇</strong><span>전자 생물형 페이스메이커</span><br /><small>목표를 오늘의 퀘스트로 나누고 실패하면 다음 분량을 다시 맞춰요.</small></div></div><div className="window-actions"><button className="xp-button primary" type="button" onClick={enterDesktop}>데스크톱으로 이동</button></div></XpWindow></main>;

  return (
    <main className="xp-desktop" aria-label="Manager.exe desktop" onClick={() => setPixelTvContextMenu(null)}>
      <nav className="desktop-icons" aria-label="바탕화면 아이콘">
        <DesktopIcon label="오늘의 퀘스트" type="quest" onClick={openTodayQuest} />
        <DesktopIcon label="매니저" type="manager" onClick={() => openWindow("manager")} />
        <DesktopIcon label="내 프로필" type="profile" onClick={() => openWindow("profile")} />
        <DesktopIcon label="기록 노트" type="journal" onClick={() => openWindow("journal")} />
        <DesktopIcon
          label={pixelTvConnected ? "Projection TV" : "Pixel TV"}
          type="pixelTvProperties"
          assetId="pixel-tv"
          overrideIdleSrc={pixelTvConnected ? projectionModeAsset?.connectedIconSrc : undefined}
          overrideHoverSrc={pixelTvConnected ? projectionModeAsset?.connectedIconHoverSrc : undefined}
          onClick={launchProjectionMode}
          onContextMenu={openPixelTvContextMenu}
        />
        <DesktopIcon label="휴지통" type="trash" onClick={() => openWindow("trash")} />
      </nav>

      {pixelTvContextMenu && (
        <DesktopContextMenu x={pixelTvContextMenu.x} y={pixelTvContextMenu.y} onOpenProperties={openPixelTvProperties} />
      )}

      {openWindows.includes("quest") && <XpWindow className="quest-window" title={questStatus === "recovery" ? "복구 퀘스트" : "오늘의 퀘스트"} {...windowChrome("quest")}><QuestWindow quest={quest} status={questStatus} previousQuestTitle={previousQuestTitle} onQuestChange={updateQuest} onAccept={acceptQuest} onOpenRunner={() => openWindow("runner")} onRecommendNext={openTodayQuest} /></XpWindow>}
      {showQuestHangingPet && <WindowPetInteraction state="hanging" petId={manager.petId} stage={managerDisplayStage} placement="below-quest" position={windowPositions.quest} zIndex={11 + openWindows.indexOf("quest")} />}
      {openWindows.includes("runner") && <XpWindow className="runner-window" title="QuestRunner.exe" {...windowChrome("runner")}><QuestRunnerWindow quest={quest} remainingTime={remainingTime} onComplete={completeQuest} onFail={startFailureFlow} /></XpWindow>}
      {openWindows.includes("failure") && <XpWindow className="failure-window" title="퀘스트가 소멸했어" {...windowChrome("failure")}><FailureWindow selectedFailureReason={selectedFailureReason} onReasonChange={setSelectedFailureReason} onCreateRecovery={createRecovery} /></XpWindow>}
      {openWindows.includes("recovery") && <XpWindow className="recovery-window" title="복구 퀘스트" {...windowChrome("recovery")}><RecoveryWindow quest={quest} onEdit={editRecovery} onAccept={acceptQuest} /></XpWindow>}
      {showRecoveryHidingPet && <WindowPetInteraction state="hiding" petId={manager.petId} stage={managerDisplayStage} placement="beside-recovery" position={windowPositions.recovery} zIndex={9 + openWindows.indexOf("recovery")} />}
      {openWindows.includes("manager") && <XpWindow className="manager-window" title="매니저" {...windowChrome("manager")}><ManagerWindow manager={manager} petAway={showQuestHangingPet || showRecoveryHidingPet} /></XpWindow>}
      {openWindows.includes("profile") && <XpWindow className="profile-window" title="내 프로필" {...windowChrome("profile")}><ProfileWindow profile={profile} onSave={saveProfile} /></XpWindow>}
      {openWindows.includes("journal") && <XpWindow className="journal-window" title="기록 노트" {...windowChrome("journal")}><JournalWindow logs={logs} sync={logSync} /></XpWindow>}
      {openWindows.includes("trash") && <XpWindow className="trash-window" title="휴지통" {...windowChrome("trash")}><div className="empty-trash">비어 있음</div></XpWindow>}
      {openWindows.includes("pixelTvProperties") && (
        <XpWindow className="pixel-tv-properties-window" title="Pixel TV 속성" {...windowChrome("pixelTvProperties")}>
          <PixelTvPropertiesWindow connected={pixelTvConnected} onToggle={togglePixelTvMode} />
        </XpWindow>
      )}

      <BlinkFocusOverlay effect={blinkFocus} onDone={finishBlinkFocus} />
      <footer className="taskbar">
        <button className="start-button" type="button" onClick={() => setStartOpen((value) => !value)}><span className="start-mark" />시작</button>
        {startOpen && <StartMenu questStatus={questStatus} onOpenWindow={openWindow} onOpenQuest={openTodayQuest} onExitService={exitService} />}
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

function StartMenu({ questStatus, onOpenWindow, onOpenQuest, onExitService }: StartMenuProps) {
  return (
    <div className="start-menu">
      <strong>Manager.exe</strong>
      <button type="button" onClick={onOpenQuest}>
        <WindowIconMark id="quest" className="menu-icon" />
        <span>오늘의 퀘스트</span>
      </button>
      {questStatus === "active" && (
        <button type="button" onClick={() => onOpenWindow("runner")}>
          <WindowIconMark id="runner" className="menu-icon" />
          <span>QuestRunner.exe</span>
        </button>
      )}
      <button type="button" onClick={() => onOpenWindow("manager")}>
        <WindowIconMark id="manager" className="menu-icon" />
        <span>매니저</span>
      </button>
      <button type="button" onClick={() => onOpenWindow("profile")}>
        <WindowIconMark id="profile" className="menu-icon" />
        <span>내 프로필</span>
      </button>
      <button type="button" onClick={() => onOpenWindow("journal")}>
        <WindowIconMark id="journal" className="menu-icon" />
        <span>기록 노트</span>
      </button>
      <button type="button" onClick={onExitService}>
        <span className="menu-icon text-icon" aria-hidden="true">IO</span>
        <span>서비스 종료</span>
      </button>
    </div>
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

function ProfileWindow({ profile, onSave }: ProfileWindowProps) {
  const [draft, setDraft] = useState(profile);
  return <form className="profile-edit" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><div className="profile-form"><label htmlFor="profile-edit-name">이름</label><input className="xp-input" id="profile-edit-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><label htmlFor="profile-edit-nickname">닉네임</label><input className="xp-input" id="profile-edit-nickname" value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} /><label htmlFor="profile-edit-goal">주요 목표</label><textarea className="xp-textarea" id="profile-edit-goal" value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /><label htmlFor="profile-edit-minutes">가능 시간</label><select className="xp-select" id="profile-edit-minutes" value={draft.dailyMinutes} onChange={(event) => setDraft({ ...draft, dailyMinutes: Number(event.target.value) })}><option value={15}>15분</option><option value={30}>30분</option><option value={45}>45분</option><option value={60}>60분</option></select></div><div className="window-actions"><button className="xp-button primary" type="submit">저장</button></div></form>;
}

function JournalWindow({ logs, sync }: JournalWindowProps) {
  return <section className="journal-panel">{sync.message && <p className={`sync-notice ${sync.status}`}>{sync.message}</p>}{logs.length === 0 ? <div className="journal-empty"><strong>아직 기록이 없어.</strong><p>퀘스트를 완료하거나 복구하면 이곳에 기록돼.</p></div> : <div className="notes-list">{logs.map((log) => <div className="note-row" key={log.id}><span className={`log-mark ${log.result}`}>{questLogMarks[log.result]}</span><span>{log.title} <small>{log.reason ?? questLogResultLabels[log.result]}</small></span><strong>EXP +{log.exp}</strong></div>)}</div>}</section>;
}

function XpWindow({ id, title, titlebarIcon, className, children, position, zIndex, isActive, onFocus, onMove, onClose }: XpWindowProps) {
  const [dragOffset, setDragOffset] = useState<WindowPosition | null>(null);
  const windowStyle = position ? ({ "--window-x": `${position.x}px`, "--window-y": `${position.y}px`, zIndex } as CSSProperties & Record<"--window-x" | "--window-y", string>) : undefined;
  const icon = titlebarIcon ?? (id ? windowTitleIcons[id] : "M");

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

  return (
    <section
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
          <button type="button" aria-label="minimize" disabled />
          <button type="button" aria-label="maximize" disabled />
          <button type="button" aria-label="close" onClick={onClose} disabled={!onClose} />
        </div>
      </div>
      <div className="xp-window-body">{children}</div>
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

function WindowPetInteraction({ state, petId, stage, placement, position, zIndex }: WindowPetInteractionProps) {
  const animation = getLumiAnimationAsset(state, petId, stage);
  const renderableStage = getRenderablePetStage(petId, stage);
  const interactionStyle = {
    "--window-x": `${position.x}px`,
    "--window-y": `${position.y}px`,
    zIndex,
  } as CSSProperties & Record<"--window-x" | "--window-y", string>;

  return (
    <div className={`window-pet-interaction ${placement} ${state}`} data-pet-stage={renderableStage} style={interactionStyle} aria-hidden="true">
      <CanvasSpriteAnimator animation={animation} ariaLabel={`${state} 핑크 매니저`} />
    </div>
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
