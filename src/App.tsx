import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, PointerEvent, ReactNode } from "react";
import "./styles.css";

type AppScreen = "wizard" | "manager-created" | "desktop";
type QuestStatus = "draft" | "active" | "success" | "failed" | "recovery";
type QuestType = "time" | "quantity" | "action";
type Difficulty = "easy" | "normal" | "hard";
type ManagerTone = "calm" | "friendly" | "firm";
type QuestSize = "tiny" | "balanced" | "challenge";
type WindowId = "quest" | "runner" | "manager" | "profile" | "journal" | "trash";

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

interface Quest {
  title: string;
  type: QuestType;
  amount: number;
  unit: string;
  difficulty: Difficulty;
  deadline: string;
  rewardExp: number;
}

interface ManagerState {
  name: string;
  level: number;
  exp: number;
  mood: "waiting" | "focused" | "happy" | "plateau";
  line: string;
}

interface QuestLog {
  id: string;
  title: string;
  result: "완료" | "실패" | "복구 완료";
  exp: number;
  reason?: string;
  createdAt: string;
}

interface WindowPosition {
  x: number;
  y: number;
}

const profileKey = "manager-xp.profile.v1";
const managerKey = "manager-xp.manager.v1";
const logsKey = "manager-xp.logs.v1";

const initialWindowPositions: Record<WindowId, WindowPosition> = {
  quest: { x: 190, y: 118 },
  runner: { x: 285, y: 156 },
  manager: { x: 850, y: 132 },
  profile: { x: 170, y: 104 },
  journal: { x: 285, y: 392 },
  trash: { x: 895, y: 405 },
};

const windowLabels: Record<WindowId, string> = {
  quest: "오늘의 퀘스트",
  runner: "QuestRunner.exe",
  manager: "매니저",
  profile: "내 프로필",
  journal: "기록 노트",
  trash: "휴지통",
};

const categoryLabels: Record<UserProfile["category"], string> = {
  study: "공부",
  exercise: "운동",
  hobby: "취미",
  career: "커리어",
  habit: "생활습관",
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

const toneLines: Record<ManagerTone, string> = {
  calm: "기다리고 있었어. 오늘 크기는 네가 정해도 돼.",
  friendly: "왔구나. 오늘도 우리 페이스로 하나만 해보자.",
  firm: "좋아. 할 수 있는 크기로 줄이고, 끝까지 가보자.",
};

const failureReasons = [
  "시간이 부족했다",
  "목표가 너무 컸다",
  "집중이 안 됐다",
  "컨디션이 좋지 않았다",
  "까먹었다",
];

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
  level: 1,
  exp: 0,
  mood: "waiting",
  line: "기다리고 있었어. 오늘 크기는 네가 정해도 돼.",
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

function isGoalAbstract(goal: string) {
  const normalized = goal.trim();
  const vagueWords = ["성장", "잘", "멋진", "갓생", "열심히", "꾸준히", "공부"];
  return normalized.length < 8 || vagueWords.some((word) => normalized === word || normalized.includes(`${word}하고`));
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
  const shortGoal = profile.goal.replace("자격증 취득", "").replace("완성", "").trim();
  const target = shortGoal.length > 0 ? shortGoal : categoryLabels[profile.category];

  return {
    title: `${target} ${focus}핵심 정리 ${amount}분`,
    type: "time",
    amount,
    unit: "분",
    difficulty,
    deadline: "오늘 23:59",
    rewardExp: calculateReward(difficulty, amount, "time"),
  };
}

function createRecoveryQuest(previousQuest: Quest): Quest {
  const recoveryAmount = Math.max(5, Math.floor(previousQuest.amount / 3));
  return {
    ...previousQuest,
    title: previousQuest.title.replace(`${previousQuest.amount}${previousQuest.unit}`, `${recoveryAmount}${previousQuest.unit}`).replace("핵심 정리", "핵심 개념 읽기"),
    amount: recoveryAmount,
    difficulty: "easy",
    rewardExp: 5,
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
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
  return {
    ...manager,
    level: manager.level + levelUps,
    exp: total % 100,
    mood: "happy",
    line: "오늘의 작은 성공이 쌓였어.",
  };
}

function createLog(title: string, result: QuestLog["result"], exp: number, reason?: string): QuestLog {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    result,
    exp,
    reason,
    createdAt: formatDate(new Date()),
  };
}

export default function App() {
  const storedProfile = useMemo(() => readStorage<UserProfile | null>(profileKey, null), []);
  const [screen, setScreen] = useState<AppScreen>(storedProfile ? "desktop" : "wizard");
  const [profile, setProfile] = useState<UserProfile>(storedProfile ?? defaultProfile);
  const [wizardDraft, setWizardDraft] = useState<UserProfile>(storedProfile ?? defaultProfile);
  const [manager, setManager] = useState<ManagerState>(() => readStorage(managerKey, defaultManager));
  const [logs, setLogs] = useState<QuestLog[]>(() => readStorage<QuestLog[]>(logsKey, []));
  const [quest, setQuest] = useState<Quest>(() => createQuest(storedProfile ?? defaultProfile));
  const [questStatus, setQuestStatus] = useState<QuestStatus>("draft");
  const [openWindows, setOpenWindows] = useState<WindowId[]>(["quest", "manager"]);
  const [windowPositions, setWindowPositions] = useState<Record<WindowId, WindowPosition>>(initialWindowPositions);
  const [now, setNow] = useState(() => new Date());
  const [needsClarify, setNeedsClarify] = useState(false);
  const [selectedFailureReason, setSelectedFailureReason] = useState(failureReasons[0]);
  const [previousQuestTitle, setPreviousQuestTitle] = useState("");
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screen !== "wizard") writeStorage(profileKey, profile);
  }, [profile, screen]);

  useEffect(() => {
    writeStorage(managerKey, manager);
  }, [manager]);

  useEffect(() => {
    writeStorage(logsKey, logs);
  }, [logs]);

  const xpDate = formatDate(now);
  const xpTime = formatTime(now);
  const remainingTime = formatRemaining(now);

  function openWindow(id: WindowId) {
    setOpenWindows((current) => [...current.filter((windowId) => windowId !== id), id]);
  }

  function closeWindow(id: WindowId) {
    setOpenWindows((current) => current.filter((windowId) => windowId !== id));
  }

  function moveWindow(id: WindowId, position: WindowPosition) {
    setWindowPositions((current) => ({
      ...current,
      [id]: position,
    }));
  }

  function showQuestRunner() {
    setOpenWindows((current) => [...current.filter((windowId) => windowId !== "runner"), "runner"]);
  }

  function submitWizard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGoalAbstract(wizardDraft.goal) && !wizardDraft.focusAnswer) {
      setNeedsClarify(true);
      return;
    }

    const savedProfile = {
      ...wizardDraft,
      name: wizardDraft.name.trim() || "사용자",
      nickname: wizardDraft.nickname.trim() || "루카스",
      goal: wizardDraft.goal.trim() || "정보처리기사 자격증 취득",
    };
    const firstQuest = createQuest(savedProfile);
    const awakenedManager = {
      ...defaultManager,
      line: toneLines[savedProfile.managerTone],
    };

    setProfile(savedProfile);
    setQuest(firstQuest);
    setQuestStatus("draft");
    setManager(awakenedManager);
    setLogs([]);
    setOpenWindows(["quest", "manager"]);
    setWindowPositions(initialWindowPositions);
    setNeedsClarify(false);
    setScreen("manager-created");
  }

  function enterDesktop() {
    setScreen("desktop");
  }

  function updateQuest(patch: Partial<Quest>) {
    setQuest((current) => {
      const nextType = patch.type ?? current.type;
      const nextAmount = patch.amount ?? current.amount;
      const nextDifficulty = patch.difficulty ?? current.difficulty;
      const nextUnit = patch.type && patch.type !== current.type ? getQuestUnit(patch.type) : patch.unit ?? current.unit;
      return {
        ...current,
        ...patch,
        type: nextType,
        amount: nextAmount,
        difficulty: nextDifficulty,
        unit: nextUnit,
        rewardExp: calculateReward(nextDifficulty, nextAmount, nextType),
      };
    });
  }

  function resetQuestDraft() {
    setQuest(createQuest(profile));
    setQuestStatus("draft");
    setPreviousQuestTitle("");
    setOpenWindows((current) => [...current.filter((windowId) => windowId !== "runner" && windowId !== "quest"), "quest"]);
    setManager((current) => ({
      ...current,
      mood: "waiting",
      line: toneLines[profile.managerTone],
    }));
  }

  function acceptQuest() {
    setQuestStatus("active");
    setOpenWindows((current) => [...current.filter((windowId) => windowId !== "quest" && windowId !== "runner"), "runner"]);
    setManager((current) => ({
      ...current,
      mood: "focused",
      line: "끝까지 기다릴게. 네 속도로 해.",
    }));
  }

  function completeQuest() {
    const resultLabel = questStatus === "recovery" ? "복구 완료" : "완료";
    setManager((current) => addExp(current, quest.rewardExp));
    setLogs((current) => [createLog(quest.title, resultLabel, quest.rewardExp), ...current].slice(0, 8));
    setQuestStatus("success");
  }

  function startFailureFlow() {
    setQuestStatus("failed");
    setManager((current) => ({
      ...current,
      mood: "plateau",
      line: "이번 기록으로 크기를 다시 맞춰볼게.",
    }));
  }

  function createRecovery() {
    const recoveryQuest = createRecoveryQuest(quest);
    setPreviousQuestTitle(quest.title);
    setLogs((current) => [createLog(quest.title, "실패", 0, selectedFailureReason), ...current].slice(0, 8));
    setQuest(recoveryQuest);
    setQuestStatus("recovery");
    setOpenWindows((current) => [...current.filter((windowId) => windowId !== "runner" && windowId !== "quest"), "quest"]);
    setManager((current) => ({
      ...current,
      mood: "waiting",
      line: "다시 시작할 수 있는 크기로 줄였어.",
    }));
  }

  function saveProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
    setWizardDraft(nextProfile);
    if (questStatus === "draft") setQuest(createQuest(nextProfile));
  }

  const activeWindow = openWindows[openWindows.length - 1];

  function windowChrome(id: WindowId) {
    return {
      id,
      position: windowPositions[id],
      zIndex: 10 + openWindows.indexOf(id),
      isActive: activeWindow === id,
      onFocus: () => openWindow(id),
      onMove: (position: WindowPosition) => moveWindow(id, position),
      onClose: () => closeWindow(id),
    };
  }

  if (screen === "wizard") {
    return (
      <main className="xp-boot-screen">
        <ProfileSetupWizard
          draft={wizardDraft}
          needsClarify={needsClarify}
          onChange={setWizardDraft}
          onSubmit={submitWizard}
        />
      </main>
    );
  }

  if (screen === "manager-created") {
    return (
      <main className="xp-boot-screen">
        <XpWindow className="created-window" title="Manager.exe 설치 완료" onClose={undefined}>
          <div className="created-manager">
            <DesktopPet mood="happy" large />
            <div>
              <h1>전자 생물 매니저가 깨어났어</h1>
              <p>루미는 목표를 오늘 할 수 있는 크기로 나누고, 네가 돌아올 때까지 기다리는 페이스메이커야.</p>
              <div className="created-stats">
                <span>Lv.1</span>
                <span>EXP 0 / 100</span>
                <span>{categoryLabels[profile.category]}</span>
              </div>
              <button className="xp-button primary" type="button" onClick={enterDesktop}>
                XP 데스크톱으로 이동
              </button>
            </div>
          </div>
        </XpWindow>
      </main>
    );
  }

  return (
    <main className="xp-desktop" aria-label="Manager.exe desktop">
      <div className="xp-sky">
        <span className="cloud cloud-a" />
        <span className="cloud cloud-b" />
        <span className="cloud cloud-c" />
      </div>
      <div className="xp-hills" />

      <nav className="desktop-icons" aria-label="바탕화면 아이콘">
        <DesktopIcon label="오늘의 퀘스트" type="quest" onClick={() => openWindow("quest")} />
        <DesktopIcon label="매니저" type="manager" onClick={() => openWindow("manager")} />
        <DesktopIcon label="내 프로필" type="profile" onClick={() => openWindow("profile")} />
        <DesktopIcon label="기록 노트" type="journal" onClick={() => openWindow("journal")} />
        <DesktopIcon label="휴지통" type="trash" onClick={() => openWindow("trash")} />
      </nav>

      <div className="desktop-pet">
        <DesktopPet mood={manager.mood} />
      </div>

      {openWindows.includes("quest") && (
        <XpWindow className="quest-window" title={questStatus === "recovery" ? "복구 퀘스트" : "오늘의 퀘스트"} {...windowChrome("quest")}>
          <QuestWindow
            quest={quest}
            status={questStatus}
            previousQuestTitle={previousQuestTitle}
            onQuestChange={updateQuest}
            onAccept={acceptQuest}
            onReset={resetQuestDraft}
            onOpenRunner={showQuestRunner}
          />
        </XpWindow>
      )}

      {openWindows.includes("runner") && (
        <XpWindow className="runner-window" title="QuestRunner.exe" {...windowChrome("runner")}>
          <QuestRunnerWindow
            quest={quest}
            status={questStatus}
            remainingTime={remainingTime}
            selectedFailureReason={selectedFailureReason}
            onComplete={completeQuest}
            onFail={startFailureFlow}
            onReset={resetQuestDraft}
            onReasonChange={setSelectedFailureReason}
            onCreateRecovery={createRecovery}
          />
        </XpWindow>
      )}

      {openWindows.includes("manager") && (
        <XpWindow className="manager-window" title="매니저" {...windowChrome("manager")}>
          <ManagerWindow manager={manager} profile={profile} />
        </XpWindow>
      )}

      {openWindows.includes("profile") && (
        <XpWindow className="profile-window" title="내 프로필" {...windowChrome("profile")}>
          <ProfileWindow profile={profile} onSave={saveProfile} />
        </XpWindow>
      )}

      {openWindows.includes("journal") && (
        <XpWindow className="journal-window" title="기록 노트" {...windowChrome("journal")}>
          <JournalWindow logs={logs} />
        </XpWindow>
      )}

      {openWindows.includes("trash") && (
        <XpWindow className="trash-window" title="휴지통" {...windowChrome("trash")}>
          <div className="empty-trash">
            <strong>휴지통이 비어 있어.</strong>
            <p>소멸한 퀘스트도 기록 노트에는 리밸런싱 데이터로 남아.</p>
          </div>
        </XpWindow>
      )}

      <footer className="taskbar">
        <button className="start-button" type="button" onClick={() => setStartOpen((value) => !value)}>
          <span className="start-mark" />
          시작
        </button>
        {startOpen && (
          <div className="start-menu">
            <strong>Manager.exe</strong>
            <button type="button" onClick={() => openWindow("quest")}>오늘의 퀘스트</button>
            {(questStatus === "active" || questStatus === "failed" || questStatus === "success") && (
              <button type="button" onClick={() => openWindow("runner")}>QuestRunner.exe</button>
            )}
            <button type="button" onClick={() => openWindow("manager")}>매니저</button>
            <button type="button" onClick={() => openWindow("profile")}>내 프로필</button>
            <button type="button" onClick={() => openWindow("journal")}>기록 노트</button>
          </div>
        )}
        <div className="taskbar-items">
          {openWindows.map((windowId) => (
            <button
              className={activeWindow === windowId ? "active" : ""}
              key={windowId}
              type="button"
              onClick={() => openWindow(windowId)}
            >
              {windowLabels[windowId]}
            </button>
          ))}
        </div>
        <div className="system-tray">
          <span>Lv.{manager.level}</span>
          <span>{xpTime}</span>
        </div>
      </footer>
    </main>
  );
}

function ProfileSetupWizard({
  draft,
  needsClarify,
  onChange,
  onSubmit,
}: {
  draft: UserProfile;
  needsClarify: boolean;
  onChange: (profile: UserProfile) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <XpWindow className="setup-window" title="Manager.exe 설치 마법사" onClose={undefined}>
      <form className="setup-form" onSubmit={onSubmit}>
        <aside className="setup-rail">
          <DesktopPet mood="waiting" large />
          <strong>루미 준비 중</strong>
          <span>Profile Setup</span>
        </aside>
        <section className="setup-fields">
          <h1>전자 생물 매니저를 깨울 준비를 할게요</h1>
          <p>먼저 네 목표를 오늘 할 수 있는 크기로 나눌 단서를 알려줘.</p>

          <div className="form-grid">
            <label>
              이름
              <input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="김동민" />
            </label>
            <label>
              닉네임
              <input value={draft.nickname} onChange={(event) => onChange({ ...draft, nickname: event.target.value })} placeholder="루카스" />
            </label>
            <label className="wide">
              함께 키울 목표
              <input value={draft.goal} onChange={(event) => onChange({ ...draft, goal: event.target.value })} />
            </label>
            <label>
              카테고리
              <select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value as UserProfile["category"] })}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              목표 기간
              <input value={draft.goalPeriod} onChange={(event) => onChange({ ...draft, goalPeriod: event.target.value })} />
            </label>
            <label>
              하루 가능 시간
              <select value={draft.dailyMinutes} onChange={(event) => onChange({ ...draft, dailyMinutes: Number(event.target.value) })}>
                <option value={15}>15분</option>
                <option value={30}>30분</option>
                <option value={45}>45분</option>
                <option value={60}>60분</option>
              </select>
            </label>
            <label>
              퀘스트 크기
              <select value={draft.questSize} onChange={(event) => onChange({ ...draft, questSize: event.target.value as QuestSize })}>
                <option value="tiny">아주 작게</option>
                <option value="balanced">보통</option>
                <option value="challenge">도전적</option>
              </select>
            </label>
            <label className="wide">
              매니저 말투
              <select value={draft.managerTone} onChange={(event) => onChange({ ...draft, managerTone: event.target.value as ManagerTone })}>
                <option value="calm">차분함</option>
                <option value="friendly">친구 같음</option>
                <option value="firm">단호한 페이스메이커</option>
              </select>
            </label>
          </div>

          {needsClarify && (
            <div className="clarify-box">
              <strong>목표를 조금 더 구체화해볼게</strong>
              <span>먼저 어떤 부분부터 시작할까?</span>
              <div className="clarify-options">
                {["필기 이론", "기출 문제", "실기 준비", "아직 모르겠음"].map((answer) => (
                  <label key={answer}>
                    <input
                      type="radio"
                      name="focus"
                      checked={draft.focusAnswer === answer}
                      onChange={() => onChange({ ...draft, focusAnswer: answer })}
                    />
                    {answer}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="wizard-actions">
            <button className="xp-button" type="button" disabled>이전</button>
            <button className="xp-button primary" type="submit">매니저 깨우기</button>
          </div>
        </section>
      </form>
    </XpWindow>
  );
}

function QuestWindow({
  quest,
  status,
  previousQuestTitle,
  onQuestChange,
  onAccept,
  onReset,
  onOpenRunner,
}: {
  quest: Quest;
  status: QuestStatus;
  previousQuestTitle: string;
  onQuestChange: (patch: Partial<Quest>) => void;
  onAccept: () => void;
  onReset: () => void;
  onOpenRunner: () => void;
}) {
  if (status === "active" || status === "success" || status === "failed") {
    return (
      <section className="quest-program-link">
        <div className="program-icon" aria-hidden="true">EXE</div>
        <h2>진행 중인 퀘스트가 실행 중이야</h2>
        <p>`QuestRunner.exe` 창에서 완료, 실패, 복구 흐름을 처리할 수 있어.</p>
        <strong>{quest.title}</strong>
        <div className="window-actions">
          <button className="xp-button primary" type="button" onClick={onOpenRunner}>실행창 앞으로</button>
        </div>
      </section>
    );
  }

  return (
    <section className="quest-draft">
      {status === "recovery" ? (
        <div className="recovery-summary">
          <strong>다시 시작할 수 있는 크기로 줄였어</strong>
          <span>기존: {previousQuestTitle}</span>
          <span>복구: {quest.title}</span>
        </div>
      ) : (
        <p className="draft-lead">오늘 수행할 퀘스트 초안</p>
      )}

      <label>
        제목
        <input value={quest.title} onChange={(event) => onQuestChange({ title: event.target.value })} />
      </label>
      <div className="quest-edit-grid">
        <label>
          유형
          <select value={quest.type} onChange={(event) => onQuestChange({ type: event.target.value as QuestType })}>
            <option value="time">시간형</option>
            <option value="quantity">양적형</option>
            <option value="action">행동형</option>
          </select>
        </label>
        <label>
          분량
          <input type="number" min={1} value={quest.amount} onChange={(event) => onQuestChange({ amount: Number(event.target.value) })} />
        </label>
        <label>
          단위
          <input value={quest.unit} onChange={(event) => onQuestChange({ unit: event.target.value })} />
        </label>
        <label>
          제한 시간
          <select value={quest.deadline} onChange={(event) => onQuestChange({ deadline: event.target.value })}>
            <option>오늘 23:59</option>
            <option>오늘 18:00</option>
            <option>오늘 21:00</option>
          </select>
        </label>
      </div>
      <div className="difficulty-row" aria-label="난이도 선택">
        {(["easy", "normal", "hard"] as Difficulty[]).map((difficulty) => (
          <button
            className={quest.difficulty === difficulty ? "selected" : ""}
            key={difficulty}
            type="button"
            onClick={() => onQuestChange({ difficulty })}
          >
            {difficultyLabels[difficulty]}
          </button>
        ))}
      </div>
      <div className="reward-line">예상 보상: EXP {quest.rewardExp}</div>
      <div className="window-actions">
        <button className="xp-button" type="button" onClick={onReset}>초기화</button>
        <button className="xp-button primary" type="button" onClick={onAccept}>수락</button>
      </div>
    </section>
  );
}

function QuestRunnerWindow({
  quest,
  status,
  remainingTime,
  selectedFailureReason,
  onComplete,
  onFail,
  onReset,
  onReasonChange,
  onCreateRecovery,
}: {
  quest: Quest;
  status: QuestStatus;
  remainingTime: string;
  selectedFailureReason: string;
  onComplete: () => void;
  onFail: () => void;
  onReset: () => void;
  onReasonChange: (reason: string) => void;
  onCreateRecovery: () => void;
}) {
  if (status === "success") {
    return (
      <section className="runner-program success">
        <div className="runner-menubar"><span>File</span><span>Quest</span><span>Help</span></div>
        <div className="runner-hero">
          <span className="runner-app-icon">OK</span>
          <div>
            <h2>Process Complete</h2>
            <p>{quest.title}</p>
          </div>
        </div>
        <div className="runner-console">
          <span>reward.exp +{quest.rewardExp}</span>
          <span>manager.memory saved</span>
          <span>journal.log appended</span>
        </div>
        <p className="manager-quote">루미: "오늘의 작은 성공이 쌓였어."</p>
        <div className="window-actions">
          <button className="xp-button primary" type="button" onClick={onReset}>다음 퀘스트 보기</button>
        </div>
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className="runner-program failed">
        <div className="runner-menubar"><span>File</span><span>Quest</span><span>Help</span></div>
        <div className="runner-hero">
          <span className="runner-app-icon">!</span>
          <div>
            <h2>Quest Expired</h2>
            <p>퀘스트가 소멸했어. 실패 이유를 알려줘.</p>
          </div>
        </div>
        <div className="reason-list">
          {failureReasons.map((reason) => (
            <label key={reason}>
              <input type="radio" name="failureReason" checked={selectedFailureReason === reason} onChange={() => onReasonChange(reason)} />
              {reason}
            </label>
          ))}
        </div>
        <p className="manager-quote">루미: "이번 기록으로 크기를 다시 맞춰볼게."</p>
        <div className="window-actions">
          <button className="xp-button primary" type="button" onClick={onCreateRecovery}>복구 퀘스트 받기</button>
        </div>
      </section>
    );
  }

  return (
    <section className="runner-program active">
      <div className="runner-menubar"><span>File</span><span>Quest</span><span>Help</span></div>
      <div className="runner-hero">
        <span className="runner-app-icon">RUN</span>
        <div>
          <h2>{quest.title}</h2>
          <p>QuestRunner.exe가 오늘의 퀘스트를 실행 중이야.</p>
        </div>
      </div>
      <dl className="quest-details runner-details">
        <div><dt>남은 시간</dt><dd>{remainingTime}</dd></div>
        <div><dt>진행 상태</dt><dd>Waiting for user check</dd></div>
        <div><dt>보상</dt><dd>EXP {quest.rewardExp}</dd></div>
        <div><dt>유형</dt><dd>{quest.type === "time" ? "시간형" : quest.type === "quantity" ? "양적형" : "행동형"}</dd></div>
      </dl>
      <div className="runner-progress" aria-label="QuestRunner progress">
        <i />
      </div>
      <p className="manager-quote">루미: "끝까지 기다릴게. 네 속도로 해."</p>
      <div className="window-actions">
        <button className="xp-button primary" type="button" onClick={onComplete}>완료했어</button>
        <button className="xp-button danger" type="button" onClick={onFail}>실패 처리</button>
      </div>
    </section>
  );
}

function ManagerWindow({ manager, profile }: { manager: ManagerState; profile: UserProfile }) {
  return (
    <section className="manager-panel">
      <DesktopPet mood={manager.mood} large />
      <strong className="manager-name">◇ {manager.name} ◇</strong>
      <span className="manager-role">전자 생물형 페이스메이커</span>
      <div className="manager-exp">
        <span>Lv.{manager.level}</span>
        <div className="xp-meter"><i style={{ width: `${manager.exp}%` }} /></div>
        <small>EXP {manager.exp} / 100</small>
      </div>
      <dl className="manager-profile">
        <div><dt>상태</dt><dd>{manager.mood === "happy" ? "작은 성공을 저장하는 중" : manager.mood === "focused" ? "퀘스트를 기다리는 중" : manager.mood === "plateau" ? "성장 정체" : "오늘의 퀘스트를 기다리는 중"}</dd></div>
        <div><dt>목표</dt><dd>{profile.goal}</dd></div>
      </dl>
      <p className="manager-quote">"{manager.line}"</p>
    </section>
  );
}

function ProfileWindow({ profile, onSave }: { profile: UserProfile; onSave: (profile: UserProfile) => void }) {
  const [draft, setDraft] = useState(profile);

  return (
    <form className="profile-edit" onSubmit={(event) => {
      event.preventDefault();
      onSave(draft);
    }}>
      <label>
        이름
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <label>
        닉네임
        <input value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} />
      </label>
      <label>
        목표
        <input value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} />
      </label>
      <label>
        하루 가능 시간
        <select value={draft.dailyMinutes} onChange={(event) => setDraft({ ...draft, dailyMinutes: Number(event.target.value) })}>
          <option value={15}>15분</option>
          <option value={30}>30분</option>
          <option value={45}>45분</option>
          <option value={60}>60분</option>
        </select>
      </label>
      <div className="window-actions">
        <button className="xp-button primary" type="submit">저장</button>
      </div>
    </form>
  );
}

function JournalWindow({ logs }: { logs: QuestLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="journal-empty">
        <strong>아직 기록이 없어.</strong>
        <p>첫 퀘스트를 완료하거나 복구하면 이곳에 남겨둘게.</p>
      </div>
    );
  }

  return (
    <ul className="journal-list">
      {logs.map((log) => (
        <li key={log.id}>
          <span className={`log-mark ${log.result === "완료" ? "success" : log.result === "복구 완료" ? "recovery" : "fail"}`}>
            {log.result === "완료" ? "✓" : log.result === "복구 완료" ? "↺" : "×"}
          </span>
          <strong>{log.title}</strong>
          <small>EXP +{log.exp}</small>
          <em>{log.reason ?? log.result}</em>
        </li>
      ))}
    </ul>
  );
}

function XpWindow({
  id,
  title,
  className,
  children,
  position,
  zIndex,
  isActive,
  onFocus,
  onMove,
  onClose,
}: {
  id?: WindowId;
  title: string;
  className: string;
  children: ReactNode;
  position?: WindowPosition;
  zIndex?: number;
  isActive?: boolean;
  onFocus?: () => void;
  onMove?: (position: WindowPosition) => void;
  onClose?: (() => void) | undefined;
}) {
  const [dragOffset, setDragOffset] = useState<WindowPosition | null>(null);
  const windowStyle = position
    ? ({
        "--window-x": `${position.x}px`,
        "--window-y": `${position.y}px`,
        zIndex,
      } as CSSProperties & Record<"--window-x" | "--window-y", string>)
    : undefined;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!id || !position || !onMove) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const windowElement = event.currentTarget.closest(".xp-window");
    if (!windowElement) return;

    const rect = windowElement.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
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
        <span>{title}</span>
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

function DesktopIcon({ label, type, onClick }: { label: string; type: WindowId; onClick: () => void }) {
  return (
    <button className={`desktop-icon ${type}`} type="button" onClick={onClick}>
      <span />
      <strong>{label}</strong>
    </button>
  );
}

function DesktopPet({ mood, large = false }: { mood: ManagerState["mood"]; large?: boolean }) {
  return (
    <div className={`desktop-pet-sprite ${mood} ${large ? "large" : ""}`} aria-label="전자 생물 매니저">
      <span className="pet-antenna" />
      <span className="pet-face">
        <i />
        <i />
      </span>
      <span className="pet-glow" />
    </div>
  );
}
