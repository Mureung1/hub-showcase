import { useState, useEffect, useRef, useCallback } from "react";
import TaskCard from "./TaskCard";
import EmptyState from "./EmptyState";
import FocusMode from "./FocusMode";
import NudgeModal from "./NudgeModal";
import { apiFetch, ApiError } from "../lib/api";
import { ACTIVATION_POLL_MS, getDemoNudgeDelayMs } from "../lib/nudgeConfig";
import { pickCheckpointLevel } from "../lib/reasonCheckpoint";
import {
  createFocusSession,
  getRestorableFocusSession,
  removeFocusSession,
  saveFocusSession,
} from "../lib/focusSession";
import "./HomePage.css";

// content-as-data: 칩 하나 = 라벨 + 계산 방식
const STAT_DEFS = [
  {
    key: "active",
    label: "진행 중",
    calc: (tasks) =>
      tasks.filter((t) => t.status === "waiting" || t.status === "active")
        .length,
  },
  {
    key: "done",
    label: "완료",
    calc: (tasks) => tasks.filter((t) => t.status === "done").length,
  },
  {
    key: "streak",
    label: "스트릭",
    calc: (_tasks, streak) => streak,
    format: (value) => `🔥 ${value}`,
  },
];

function normalizeReasonText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : null;
}

function didReasonChange(previousTask, savedReason) {
  if (!previousTask || typeof previousTask.reason !== "string") return null;
  if (previousTask.reason !== savedReason.reason) return true;
  if (savedReason.reason !== "custom") return false;
  return (
    normalizeReasonText(previousTask.customReasonText) !==
    normalizeReasonText(savedReason.customReasonText)
  );
}

function StatsRow({ tasks, streak }) {
  return (
    <div className="stats-row">
      {STAT_DEFS.map((def) => {
        const value = def.calc(tasks, streak);
        return (
          <div className="stat-chip" key={def.key}>
            {def.label}
            <strong>{def.format ? def.format(value) : value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function HomePage() {
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null); // 포커스 중인 task(= modalLocked)
  const [focusSession, setFocusSession] = useState(null); // 시작 방식과 개입 action을 보존하는 Focus 세션 v2
  const [modalTaskId, setModalTaskId] = useState(null); // 자동으로 뜬 넛지 모달 대상
  const [modalCheckpointLevel, setModalCheckpointLevel] = useState(null); // 이번 모달에 회피이유 재확인을 띄울 레벨(1|3|null)

  // 인터벌/폴링 콜백은 stale closure를 잡으므로, 항상 최신 값은 ref로 읽는다.
  const stateRef = useRef({ tasks: [], selectedTaskId: null });
  stateRef.current = { tasks, selectedTaskId };

  const timersRef = useRef(new Map()); // taskId -> timeoutId (active task별 무응답 tick, 레벨/긴급도별 가변 간격 #44)
  const activatingRef = useRef(new Set()); // 활성화 요청 in-flight 중복 방지
  const tickingRef = useRef(new Set()); // tick 요청 in-flight 중복 방지
  const notificationInFlightRef = useRef(false);
  const runTickRef = useRef(null);
  const isMountedRef = useRef(true);
  const modalOpenRef = useRef(null); // 자동 팝업 경합 방지용 동기 소스(다른 task가 덮어쓰지 못하게)
  // taskId -> 이미 회피이유 재확인을 띄운 레벨 Set. 레벨 1·3 각각 1회만 노출(=최대 2회).
  // 멈추기로 레벨이 내려갔다가 같은 레벨을 재진입해도 다시 뜨지 않게 막는다.
  const reasonCheckedRef = useRef(new Map());
  // Task별로 실제 Lv2 모달에 표시해 확정한 행동과 Lv3 이유 변경 여부를 보존한다.
  // 서버/DB 스키마를 늘리지 않는 현재 MVP의 같은 HomePage 세션 전용 스냅샷이다.
  const lv2ActionByTaskRef = useRef(new Map());
  const lv3ReasonChangedByTaskRef = useRef(new Map());

  const loadTasks = useCallback(({ restoreFocus = false } = {}) => {
    return apiFetch("/api/tasks").then(({ data, streak: nextStreak }) => {
      if (restoreFocus) {
        const restored = getRestorableFocusSession(data);
        if (restored) {
          setFocusSession(restored.session);
          setSelectedTaskId(restored.task.id);
        }
      }
      setTasks(data);
      setStreak(nextStreak ?? 0);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadTasks({ restoreFocus: true });
  }, [loadTasks]);

  // 넛지 모달 열기/닫기 — 렌더용 state와 경합방지용 ref를 항상 함께 갱신한다.
  const clearAllTaskTimers = useCallback(() => {
    for (const timeoutId of timersRef.current.values()) {
      clearTimeout(timeoutId);
    }
    timersRef.current.clear();
  }, []);

  const scheduleTaskTimer = useCallback((task) => {
    if (
      !isMountedRef.current ||
      !task ||
      task.status !== "active" ||
      task.id === stateRef.current.selectedTaskId ||
      modalOpenRef.current !== null ||
      timersRef.current.has(task.id)
    ) {
      return;
    }

    const delayMs = getDemoNudgeDelayMs(task.level, task.deadline);
    const timeoutId = setTimeout(() => {
      timersRef.current.delete(task.id);
      runTickRef.current?.(task.id);
    }, delayMs);
    timersRef.current.set(task.id, timeoutId);
  }, []);

  const scheduleActiveTaskTimers = useCallback(
    (excludedTaskId = null) => {
      if (modalOpenRef.current !== null) return;
      const { tasks: currentTasks, selectedTaskId: focusedTaskId } =
        stateRef.current;
      currentTasks
        .filter(
          (task) =>
            task.status === "active" &&
            task.id !== focusedTaskId &&
            task.id !== excludedTaskId,
        )
        .forEach(scheduleTaskTimer);
    },
    [scheduleTaskTimer],
  );

  const openModal = useCallback(
    (id, checkpointLevel = null) => {
      clearAllTaskTimers();
      modalOpenRef.current = id;
      setModalTaskId(id);
      setModalCheckpointLevel(checkpointLevel);
    },
    [clearAllTaskTimers],
  );

  const closeModalWithoutReschedule = useCallback(() => {
    clearAllTaskTimers();
    modalOpenRef.current = null;
    setModalTaskId(null);
    setModalCheckpointLevel(null);
  }, [clearAllTaskTimers]);

  const closeModal = useCallback(() => {
    closeModalWithoutReschedule();
    scheduleActiveTaskTimers();
  }, [closeModalWithoutReschedule, scheduleActiveTaskTimers]);

  // 무응답 1회 처리: 서버에 반영하고, 레벨이 올랐으면 자동으로 모달을 띄운다.
  // 무응답 이벤트를 서버에 반영한다. 모달이 열리면 추가 타이머를 중단하고, 모달이 열리지 않은 경우에만 다음 타이머를 예약한다.
  // setInterval로는 레벨마다 다른 간격을 줄 수 없어(이미 붙은 interval은 주기를
  // 바꿀 수 없음) 자기재귀 setTimeout으로 바꿨다.
  const runTick = useCallback(
    async (id) => {
      if (modalOpenRef.current !== null) return;
      const { tasks: cur, selectedTaskId: sel } = stateRef.current;
      const before = cur.find((t) => t.id === id);
      // 완료/삭제/포커스 진입 등으로 더 이상 대상이 아니면 skip(재예약도 하지 않음)
      if (!before || before.status !== "active" || id === sel) return;
      if (tickingRef.current.has(id)) return;
      if (notificationInFlightRef.current) return;
      tickingRef.current.add(id);
      notificationInFlightRef.current = true;
      let taskForNextSchedule = before;
      let shouldRescheduleTask = false;
      try {
        const { data: updated } = await apiFetch(`/api/tasks/${id}/events`, {
          method: "POST",
          body: JSON.stringify({ eventType: "notification_sent" }),
        });
        taskForNextSchedule = updated;
        shouldRescheduleTask = true;
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

        const leveledUp = updated.level > before.level;
        const isLv4 = updated.level === 4; // Lv4는 더 오를 곳이 없어도 계속 재개입
        // 자동 팝업: 포커스 중이 아니고, 다른 task의 모달이 이미 떠 있지 않을 때만.
        // (modalOpenRef 동기 체크로 두 번째 task가 첫 모달을 덮어쓰지 못하게 막는다.)
        if (
          !stateRef.current.selectedTaskId &&
          modalOpenRef.current === null &&
          (leveledUp || isLv4)
        ) {
          // 레벨이 1/3으로 "처음" 오른 순간이고 그 레벨을 아직 이 task에서 재확인한
          // 적 없으면, 회피 이유 재확인 체크포인트를 함께 띄운다(레벨별 1회 = 최대 2회).
          const checked = reasonCheckedRef.current.get(id) ?? new Set();
          const checkpointLevel = pickCheckpointLevel(
            checked,
            leveledUp,
            updated.level,
          );
          if (checkpointLevel === 1) {
            checked.add(checkpointLevel);
            reasonCheckedRef.current.set(id, checked);
          }
          openModal(id, checkpointLevel);
        }
      } catch (err) {
        // 삭제와 경합해 이미 지워진 task에 보낸 tick은 404가 정상 — 조용히 무시하고
        // 재예약하지 않는다(체인이 여기서 자연스럽게 멈춘다).
        if (!(err instanceof ApiError && err.code === "not_found")) {
          console.error(err);
        }
      } finally {
        tickingRef.current.delete(id);
        notificationInFlightRef.current = false;
        if (modalOpenRef.current === null) {
          if (shouldRescheduleTask) {
            scheduleTaskTimer(taskForNextSchedule);
          }
          scheduleActiveTaskTimers(id);
        }
      }
    },
    [openModal, scheduleActiveTaskTimers, scheduleTaskTimer],
  );
  runTickRef.current = runTick;

  // 폴링 대상(active + 포커스 중 아님) 목록에 맞춰 task별 타이머를 붙였다 뗐다 한다.
  // 이미 붙어있는 타이머는 runTick이 스스로 재예약하므로 여기서는 "새로 대상이 된
  // task"의 최초 1회 예약과, "대상에서 빠진 task"의 정리만 담당한다.
  useEffect(() => {
    const pollable = new Set(
      tasks
        .filter((t) => t.status === "active" && t.id !== selectedTaskId)
        .map((t) => t.id),
    );
    // 새 대상: 최초 1회 예약(레벨 0 → Lv1은 대기 없이 즉시, #44)
    if (modalOpenRef.current === null) {
      for (const id of pollable) {
        const task = tasks.find((t) => t.id === id);
        scheduleTaskTimer(task);
      }
    }
    // 대상에서 빠진 task(완료/삭제/포커스 진입): 타이머 정리
    for (const [id, timeoutId] of timersRef.current) {
      if (!pollable.has(id)) {
        clearTimeout(timeoutId);
        timersRef.current.delete(id);
      }
    }
  }, [tasks, selectedTaskId, scheduleTaskTimer]);

  // 언마운트 시 모든 tick 타이머 정리
  useEffect(() => {
    const timers = timersRef.current;
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      for (const timeoutId of timers.values()) clearTimeout(timeoutId);
      timers.clear();
    };
  }, []);

  // 시작 예정 시각이 지난 waiting task를 active로 전환(서버 반영). 지나기 전엔 대기중 유지.
  useEffect(() => {
    const pollId = setInterval(() => {
      const { tasks: cur } = stateRef.current;
      const now = Date.now();
      cur.forEach((t) => {
        if (t.status !== "waiting") return;
        if (new Date(t.startTime).getTime() > now) return;
        if (activatingRef.current.has(t.id)) return;
        activatingRef.current.add(t.id);
        apiFetch(`/api/tasks/${t.id}/events`, {
          method: "POST",
          body: JSON.stringify({ eventType: "activated" }),
        })
          .then(({ data }) =>
            setTasks((prev) => prev.map((x) => (x.id === t.id ? data : x))),
          )
          .catch((err) => {
            // tick과 동일하게, 삭제와 경합한 404는 조용히 무시.
            if (!(err instanceof ApiError && err.code === "not_found")) {
              console.error(err);
            }
          })
          .finally(() => activatingRef.current.delete(t.id));
      });
    }, ACTIVATION_POLL_MS);
    return () => clearInterval(pollId);
  }, []);

  // 모달 대상이 완료/삭제되면 자동으로 닫는다.
  useEffect(() => {
    if (modalTaskId === null) return;
    const t = tasks.find((x) => x.id === modalTaskId);
    if (!t || t.status !== "active") closeModal();
  }, [tasks, modalTaskId, closeModal]);

  // FocusMode 종료(완료/멈추기 공통): 저장 세션과 오버레이를 닫고 목록 최신화
  function closeFocusAndRefresh() {
    removeFocusSession();
    setSelectedTaskId(null);
    setFocusSession(null);
    loadTasks();
  }

  function startFocus(task, overrides = {}) {
    const existing = getRestorableFocusSession(stateRef.current.tasks);
    if (existing) {
      if (modalOpenRef.current !== null) closeModalWithoutReschedule();
      setFocusSession(existing.session);
      setSelectedTaskId(existing.task.id);
      return;
    }

    const session = createFocusSession({
      taskId: task.id,
      entryMode: overrides.entryMode ?? "direct",
      entryLevel: overrides.entryLevel ?? null,
      journeyLevel: overrides.journeyLevel ?? task.level,
      microTask: overrides.microTask ?? null,
      generationSource: overrides.generationSource ?? "none",
      memoryEvidence: overrides.memoryEvidence ?? null,
    });
    saveFocusSession(session);
    if (modalOpenRef.current !== null) closeModalWithoutReschedule();
    setFocusSession(session);
    setSelectedTaskId(task.id);
  }

  // 넛지 모달에서 "지금 시작하기" → 화면에 실제 표시된 action과 출처를
  // 공통 세션 생성 함수에 그대로 넘긴 뒤 포커스에 진입한다.
  function handleStartFromModal(session) {
    const task = tasks.find((candidate) => candidate.id === modalTaskId);
    if (!task) return;
    startFocus(task, {
      entryMode: session?.entryMode ?? "intervention",
      entryLevel: session?.entryLevel ?? null,
      journeyLevel: session?.journeyLevel ?? task.level,
      microTask: session?.microTask ?? null,
      generationSource: session?.generationSource ?? "none",
      memoryEvidence: session?.memoryEvidence ?? null,
    });
  }

  const handleLv2ActionResolved = useCallback((taskId, microTask) => {
    if (
      typeof taskId !== "string" ||
      typeof microTask !== "string" ||
      microTask.trim().length === 0
    ) {
      return;
    }
    lv2ActionByTaskRef.current.set(taskId, microTask.trim());
  }, []);

  // 회피 이유 재확인에서 이유를 고른 경우, avoidance_reasons에 새 행으로 저장한다.
  // Lv3 생성은 이 함수가 돌려준 서버 저장 결과만 사용한다. 실패 시 null을 반환해
  // 체크포인트를 유지하고 생성 요청도 시작하지 않는다.
  async function handleReconfirmReason(reason, customText) {
    const id = modalTaskId;
    const level = modalCheckpointLevel;
    const previousTask = stateRef.current.tasks.find((task) => task.id === id);
    try {
      const { data } = await apiFetch(`/api/tasks/${id}/avoidance-reasons`, {
        method: "POST",
        body: JSON.stringify({ level, reason, customText }),
      });
      const savedReason = {
        reason: data.reason,
        customReasonText: data.customText ?? null,
      };
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, ...savedReason } : task,
        ),
      );
      if (level === 3) {
        const reasonChanged = didReasonChange(previousTask, savedReason);
        lv3ReasonChangedByTaskRef.current.set(id, reasonChanged);
        const checked = reasonCheckedRef.current.get(id) ?? new Set();
        checked.add(3);
        reasonCheckedRef.current.set(id, checked);
        return { ...savedReason, reasonChanged };
      }
      return savedReason;
    } catch (err) {
      console.error(err);
      window.alert("회피 이유를 저장하지 못했어요. 다시 시도해주세요.");
      return null;
    }
  }

  // 삭제: 목록에서 로컬 필터링만 하면 tasks가 바뀌어 타이머 정리 effect(154행)와
  // 모달 자동 닫힘 effect(177행)가 그대로 반응한다 — 별도 cleanup 코드 불필요.
  async function handleDeleteTask(id) {
    try {
      await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      lv2ActionByTaskRef.current.delete(id);
      lv3ReasonChangedByTaskRef.current.delete(id);
      reasonCheckedRef.current.delete(id);
      if (selectedTaskId === id) setSelectedTaskId(null);
    } catch (err) {
      console.error(err);
      window.alert("삭제에 실패했어요. 다시 시도해주세요.");
    }
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const modalTask = tasks.find(
    (t) => t.id === modalTaskId && t.status === "active",
  );
  // Lv3 기억 기반 개입이 참조할 세션 내 완료 이력(같은 회피 이유로 성공한 사례 탐색용).
  const completedTasks = tasks.filter((t) => t.status === "done");

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">홈</h1>
        </div>
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">홈</h1>
          <p className="page-sub">
            등록된 할일이 여기 모여요. 미룰수록 압력 게이지가 차오릅니다.
          </p>
        </div>
        <EmptyState
          message="아직 등록된 할일이 없어요."
          actionLabel="할일 등록하러 가기"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">홈</h1>
        <p className="page-sub">등록된 할일과 지금 상태예요.</p>
      </div>
      <StatsRow tasks={tasks} streak={streak} />
      <div className="task-grid">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => startFocus(task)}
            onDelete={() => handleDeleteTask(task.id)}
          />
        ))}
      </div>
      {selectedTask && (
        <div className="focus-overlay">
          <FocusMode
            taskId={selectedTask.id}
            title={selectedTask.title}
            startedAt={focusSession?.startedAt}
            entryMode={focusSession?.entryMode}
            microTask={focusSession?.microTask ?? null}
            entryLevel={focusSession?.entryLevel ?? null}
            journeyLevel={focusSession?.journeyLevel}
            generationSource={focusSession?.generationSource}
            memoryEvidence={focusSession?.memoryEvidence ?? null}
            onSessionCompleted={removeFocusSession}
            onComplete={closeFocusAndRefresh}
            onStop={closeFocusAndRefresh}
          />
        </div>
      )}
      {/* 포커스 중(modalLocked)에는 넛지 모달을 띄우지 않는다 */}
      {!selectedTask && modalTask && (
        <NudgeModal
          key={modalTask.id}
          task={modalTask}
          checkpointLevel={modalCheckpointLevel}
          onReconfirmReason={handleReconfirmReason}
          onLv2ActionResolved={handleLv2ActionResolved}
          lv2MicroTask={lv2ActionByTaskRef.current.get(modalTask.id) ?? null}
          lv3ReasonChanged={
            lv3ReasonChangedByTaskRef.current.get(modalTask.id) ?? null
          }
          onStart={handleStartFromModal}
          onClose={closeModal}
          completedTasks={completedTasks}
        />
      )}
    </div>
  );
}

export default HomePage;
