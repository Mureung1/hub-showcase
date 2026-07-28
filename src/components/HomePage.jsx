import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import TaskCard from "./TaskCard";
import EmptyState from "./EmptyState";
import JourneyHero from "./JourneyHero";
import FocusMode from "./FocusMode";
import NudgeModal from "./NudgeModal";
import { apiFetch, ApiError } from "../lib/api";
import { ACTIVATION_POLL_MS, getNudgeDelayMs } from "../lib/nudgeConfig";
import { pickCheckpointLevel } from "../lib/reasonCheckpoint";
import { calculateHomeStats } from "../lib/homeStats";
import {
  createFocusSession,
  getRestorableFocusSession,
  removeFocusSession,
  saveFocusSession,
} from "../lib/focusSession";
import "./HomePage.css";

const TASK_STATUSES = new Set(["waiting", "active", "done"]);
const DEFAULT_DONE_TASK_COUNT = 3;

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

function StatsRow({ stats, historyStatus }) {
  const cards = [
    { key: "active", label: "진행 중", value: `${stats.activeCount}개` },
    {
      key: "urgent",
      label: "마감 임박",
      value: `${stats.urgentCount}개`,
      note: "기한 초과 포함",
    },
    {
      key: "today",
      label: "오늘 완료",
      value:
        historyStatus === "ready"
          ? `${stats.todayCompletedCount}개`
          : "—",
    },
    { key: "streak", label: "연속 완료", value: `${stats.streak}일` },
  ];

  return (
    <div className="stats-row">
      {cards.map((card) => (
        <div
          className={
            card.key === "urgent" && stats.urgentCount > 0
              ? "stat-chip stat-chip-urgent"
              : "stat-chip"
          }
          key={card.key}
        >
          <span className="stat-label">{card.label}</span>
          <strong>{card.value}</strong>
          {card.note ? <span className="stat-note">{card.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

function TaskSection({
  id,
  title,
  tasks,
  count = tasks.length,
  emptyMessage,
  onStart,
  onDelete,
  now,
  action = null,
  modalTaskId = null,
  focusedTaskId = null,
  nextNudgeAtByTaskId = null,
}) {
  const headingId = `${id}-heading`;

  return (
    <section className="task-section" aria-labelledby={headingId}>
      <div className="task-section-header">
        <div className="task-section-title-row">
          <h2 className="task-section-title" id={headingId}>
            {title}
          </h2>
          <span className="task-section-count" aria-label={`${title} ${count}개`}>
            {count}
          </span>
        </div>
        {action}
      </div>
      <div className="task-section-divider" aria-hidden="true" />
      {tasks.length > 0 ? (
        <div className="task-grid" id={`${id}-list`}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onStart(task)}
              onDelete={() => onDelete(task.id)}
              now={now}
              isNudgeModalOpen={modalTaskId !== null}
              isThisTaskModalTarget={task.id === modalTaskId}
              isFocused={task.id === focusedTaskId}
              nextNudgeAt={nextNudgeAtByTaskId?.get(task.id) ?? null}
            />
          ))}
        </div>
      ) : (
        <p className="task-section-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

function HomePage() {
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [historyStatus, setHistoryStatus] = useState("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null); // 포커스 중인 task(= modalLocked)
  const [focusSession, setFocusSession] = useState(null); // 시작 방식과 개입 action을 보존하는 Focus 세션 v2
  const [modalTaskId, setModalTaskId] = useState(null); // 자동으로 뜬 넛지 모달 대상
  const [modalCheckpointLevel, setModalCheckpointLevel] = useState(null); // 이번 모달에 회피이유 재확인을 띄울 레벨(1|3|null)
  // Lv2에서 실제 표시된 행동을 Hero에 반영하기 위한 현재 HomePage 수명 전용 상태.
  // 저장소에는 기록하지 않으며 새로고침하면 비워지는 참고 정보다.
  const [heroActionsByTask, setHeroActionsByTask] = useState(() => new Map());
  const [showAllDoneTasks, setShowAllDoneTasks] = useState(false);

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
  // taskId -> 다음 알림 예정 시각(ms epoch). 서버에는 없는 클라이언트 전용 추정값 —
  // scheduleTaskTimer가 setTimeout을 걸 때 "그 순간 + delayMs"로만 기록한다(새로고침
  // 시 복구되지 않고, 레벨/마감 기준으로 항상 새로 계산됨 — 남은 구조적 한계로 보고).
  const [nextNudgeAtByTaskId, setNextNudgeAtByTaskId] = useState(() => new Map());

  const setNextNudgeAt = useCallback((taskId, timestamp) => {
    setNextNudgeAtByTaskId((prev) => {
      const next = new Map(prev);
      if (timestamp === null) next.delete(taskId);
      else next.set(taskId, timestamp);
      return next;
    });
  }, []);

  const loadTasks = useCallback(({ restoreFocus = false } = {}) => {
    setHistoryStatus("loading");
    const historyRequest = apiFetch("/api/history")
      .then(({ data }) => {
        setHistory(Array.isArray(data) ? data : []);
        setHistoryStatus("ready");
      })
      .catch((error) => {
        console.error("히스토리 통계를 불러오지 못했습니다.", error);
        setHistoryStatus("error");
      });

    const tasksRequest = apiFetch("/api/tasks").then(
      ({ data, streak: nextStreak }) => {
        if (restoreFocus) {
          const restored = getRestorableFocusSession(data);
          if (restored) {
            setFocusSession(restored.session);
            setSelectedTaskId(restored.task.id);
          }
        }
        setTasks(data);
        setStreak(nextStreak);
        setIsLoading(false);
      },
    );
    return Promise.all([tasksRequest, historyRequest]);
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
      stateRef.current.selectedTaskId !== null ||
      modalOpenRef.current !== null ||
      timersRef.current.has(task.id)
    ) {
      return;
    }

    const delayMs = getNudgeDelayMs(task.level, task.deadline);
    setNextNudgeAt(task.id, Date.now() + delayMs);
    const timeoutId = setTimeout(() => {
      timersRef.current.delete(task.id);
      setNextNudgeAt(task.id, null);
      runTickRef.current?.(task.id);
    }, delayMs);
    timersRef.current.set(task.id, timeoutId);
  }, [setNextNudgeAt]);

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
      // Focus 중(어떤 task든)에는 전체 task의 무응답 tick을 차단한다 — 자기 자신뿐
      // 아니라 다른 active task까지 전부 멈춰야 Web Push도 함께 억제된다.
      if (sel !== null) return;
      const before = cur.find((t) => t.id === id);
      // 완료/삭제 등으로 더 이상 대상이 아니면 skip(재예약도 하지 않음)
      if (!before || before.status !== "active") return;
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
        setNextNudgeAt(id, null);
      }
    }
  }, [tasks, selectedTaskId, scheduleTaskTimer, setNextNudgeAt]);

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

  // Focus 진입 시 이 task뿐 아니라 다른 모든 active task의 타이머/카운트다운도
  // 함께 멈춘다 — 서버는 폴링(notification_sent 요청)에 전적으로 의존하는 구조라,
  // 클라이언트에서 요청 자체를 막으면 레벨업과 Web Push 발송까지 함께 억제된다.
  function pauseAllTaskTimersForFocus() {
    clearAllTaskTimers();
    setNextNudgeAtByTaskId(new Map());
  }

  function startFocus(task, overrides = {}) {
    const existing = getRestorableFocusSession(stateRef.current.tasks);
    if (existing) {
      if (modalOpenRef.current !== null) closeModalWithoutReschedule();
      pauseAllTaskTimersForFocus();
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
    pauseAllTaskTimersForFocus();
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
    const resolvedMicroTask = microTask.trim();
    lv2ActionByTaskRef.current.set(taskId, resolvedMicroTask);
    setHeroActionsByTask((previous) => {
      const next = new Map(previous);
      next.set(taskId, resolvedMicroTask);
      return next;
    });
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
      setHeroActionsByTask((previous) => {
        const next = new Map(previous);
        next.delete(id);
        return next;
      });
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
  const waitingTasks = tasks.filter((task) => task.status === "waiting");
  const activeTasks = tasks.filter((task) => task.status === "active");
  const doneTasks = tasks.filter((task) => task.status === "done");
  const otherTasks = tasks.filter((task) => !TASK_STATUSES.has(task.status));
  // Lv3 기억 기반 개입이 참조할 세션 내 완료 이력(같은 회피 이유로 성공한 사례 탐색용).
  const completedTasks = doneTasks;
  const heroTask = activeTasks[0] ?? null;
  const visibleDoneTasks = showAllDoneTasks
    ? doneTasks
    : doneTasks.slice(0, DEFAULT_DONE_TASK_COUNT);
  const renderNow = new Date();
  const homeStats = calculateHomeStats(tasks, history, streak, renderNow);

  useEffect(() => {
    if (doneTasks.length <= DEFAULT_DONE_TASK_COUNT && showAllDoneTasks) {
      setShowAllDoneTasks(false);
    }
  }, [doneTasks.length, showAllDoneTasks]);

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
        <JourneyHero />
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
        <div>
          <h1 className="page-title">홈</h1>
          <p className="page-sub">등록된 할일과 지금 상태예요.</p>
        </div>
        <Link className="task-create-link" to="/register">
          + 새 할 일
        </Link>
      </div>
      <StatsRow stats={homeStats} historyStatus={historyStatus} />
      <JourneyHero
        task={heroTask}
        microTask={
          heroTask ? (heroActionsByTask.get(heroTask.id) ?? null) : null
        }
        onStart={heroTask ? () => startFocus(heroTask) : null}
      />
      <div className="task-sections">
        <TaskSection
          id="active-tasks"
          title="진행 중인 할 일"
          tasks={activeTasks}
          emptyMessage="지금 진행 중인 할 일이 없어요."
          onStart={startFocus}
          onDelete={handleDeleteTask}
          now={renderNow}
          modalTaskId={modalTaskId}
          focusedTaskId={selectedTaskId}
          nextNudgeAtByTaskId={nextNudgeAtByTaskId}
        />
        {waitingTasks.length > 0 && (
          <TaskSection
            id="waiting-tasks"
            title="시작 예정"
            tasks={waitingTasks}
            onStart={startFocus}
            onDelete={handleDeleteTask}
            now={renderNow}
          />
        )}
        {otherTasks.length > 0 && (
          <TaskSection
            id="other-tasks"
            title="기타 상태"
            tasks={otherTasks}
            onStart={startFocus}
            onDelete={handleDeleteTask}
            now={renderNow}
            modalTaskId={modalTaskId}
            focusedTaskId={selectedTaskId}
            nextNudgeAtByTaskId={nextNudgeAtByTaskId}
          />
        )}
        <TaskSection
          id="done-tasks"
          title="완료한 할 일"
          tasks={visibleDoneTasks}
          count={doneTasks.length}
          emptyMessage="완료한 할 일이 아직 없어요."
          onStart={startFocus}
          onDelete={handleDeleteTask}
          now={renderNow}
          action={
            doneTasks.length > DEFAULT_DONE_TASK_COUNT ? (
              <button
                type="button"
                className="task-section-toggle"
                aria-expanded={showAllDoneTasks}
                aria-controls="done-tasks-list"
                onClick={() => setShowAllDoneTasks((current) => !current)}
              >
                {showAllDoneTasks
                  ? "완료 목록 접기"
                  : "완료한 할 일 모두 보기"}
              </button>
            ) : null
          }
        />
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
