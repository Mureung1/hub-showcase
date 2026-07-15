import { useState, useEffect, useRef, useCallback } from "react";
import TaskCard from "./TaskCard";
import EmptyState from "./EmptyState";
import FocusMode from "./FocusMode";
import NudgeModal from "./NudgeModal";
import { apiFetch } from "../lib/api";
import { NUDGE_TICK_MS, ACTIVATION_POLL_MS } from "../lib/nudgeConfig";
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
    calc: () => 0, // TODO: 실제 스트릭 계산은 나중 이슈에서
    format: (value) => `🔥 ${value}`,
  },
];

function StatsRow({ tasks }) {
  return (
    <div className="stats-row">
      {STAT_DEFS.map((def) => {
        const value = def.calc(tasks);
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null); // 포커스 중인 task(= modalLocked)
  const [modalTaskId, setModalTaskId] = useState(null); // 자동으로 뜬 넛지 모달 대상

  // 인터벌/폴링 콜백은 stale closure를 잡으므로, 항상 최신 값은 ref로 읽는다.
  const stateRef = useRef({ tasks: [], selectedTaskId: null });
  stateRef.current = { tasks, selectedTaskId };

  const timersRef = useRef(new Map()); // taskId -> intervalId (active task별 20초 무응답 tick)
  const activatingRef = useRef(new Set()); // 활성화 요청 in-flight 중복 방지
  const tickingRef = useRef(new Set()); // tick 요청 in-flight 중복 방지
  const modalOpenRef = useRef(null); // 자동 팝업 경합 방지용 동기 소스(다른 task가 덮어쓰지 못하게)

  const loadTasks = useCallback(() => {
    return apiFetch("/api/tasks").then(({ data }) => {
      setTasks(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 넛지 모달 열기/닫기 — 렌더용 state와 경합방지용 ref를 항상 함께 갱신한다.
  const openModal = useCallback((id) => {
    modalOpenRef.current = id;
    setModalTaskId(id);
  }, []);
  const closeModal = useCallback(() => {
    modalOpenRef.current = null;
    setModalTaskId(null);
  }, []);

  // 무응답 1회(20초 경과) 처리: 서버에 반영하고, 레벨이 올랐으면 자동으로 모달을 띄운다.
  const runTick = useCallback(
    async (id) => {
      const { tasks: cur, selectedTaskId: sel } = stateRef.current;
      const before = cur.find((t) => t.id === id);
      // 완료/삭제/포커스 진입 등으로 더 이상 대상이 아니면 skip
      if (!before || before.status !== "active" || id === sel) return;
      if (tickingRef.current.has(id)) return;
      tickingRef.current.add(id);
      try {
        const { data: updated } = await apiFetch(`/api/tasks/${id}/events`, {
          method: "POST",
          body: JSON.stringify({ eventType: "notification_sent" }),
        });
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
          openModal(id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        tickingRef.current.delete(id);
      }
    },
    [openModal],
  );

  // 폴링 대상(active + 포커스 중 아님) 목록에 맞춰 task별 20초 타이머를 붙였다 뗐다 한다.
  useEffect(() => {
    const pollable = new Set(
      tasks
        .filter((t) => t.status === "active" && t.id !== selectedTaskId)
        .map((t) => t.id),
    );
    // 새 대상: 타이머 부착
    for (const id of pollable) {
      if (!timersRef.current.has(id)) {
        const intervalId = setInterval(() => runTick(id), NUDGE_TICK_MS);
        timersRef.current.set(id, intervalId);
      }
    }
    // 대상에서 빠진 task(완료/삭제/포커스 진입): 타이머 정리
    for (const [id, intervalId] of timersRef.current) {
      if (!pollable.has(id)) {
        clearInterval(intervalId);
        timersRef.current.delete(id);
      }
    }
  }, [tasks, selectedTaskId, runTick]);

  // 언마운트 시 모든 tick 타이머 정리
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const intervalId of timers.values()) clearInterval(intervalId);
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
          .catch((err) => console.error(err))
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

  // FocusMode 종료(완료/멈추기 공통): 오버레이 닫고 목록 최신화
  function closeFocusAndRefresh() {
    setSelectedTaskId(null);
    loadTasks();
  }

  // 넛지 모달에서 "지금 시작하기" → 포커스 진입(그 task는 폴링 대상에서 빠짐)
  function handleStartFromModal() {
    const id = modalTaskId;
    closeModal();
    setSelectedTaskId(id);
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const modalTask = tasks.find(
    (t) => t.id === modalTaskId && t.status === "active",
  );

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
      <StatsRow tasks={tasks} />
      <div className="task-grid">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => setSelectedTaskId(task.id)}
          />
        ))}
      </div>
      {selectedTask && (
        <div className="focus-overlay">
          <FocusMode
            taskId={selectedTask.id}
            title={selectedTask.title}
            onComplete={closeFocusAndRefresh}
            onStop={closeFocusAndRefresh}
          />
        </div>
      )}
      {/* 포커스 중(modalLocked)에는 넛지 모달을 띄우지 않는다 */}
      {!selectedTask && modalTask && (
        <NudgeModal
          task={modalTask}
          onStart={handleStartFromModal}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export default HomePage;
