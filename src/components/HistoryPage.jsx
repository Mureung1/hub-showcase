import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { groupTasksByDate } from "../lib/historyGrouping";
import HistoryRow from "./HistoryRow";
import CalendarHistoryView from "./CalendarHistoryView";
import EmptyState from "./EmptyState";
import "./HistoryPage.css";

// 뷰 전환 탭 — content-as-data.
const VIEW_TABS = [
  { value: "list", label: "리스트" },
  { value: "calendar", label: "캘린더" },
];

// Focus 세션 복구(jansori.focusSession.v2)와 키가 겹치지 않도록 별도 네임스페이스로 둔다.
// 탭을 닫으면 초기화되는 정도로 충분해 sessionStorage를 쓴다(localStorage처럼 영구 저장 불필요).
const HISTORY_VIEW_MODE_KEY = "jansori.historyViewMode.v1";

function getStoredViewMode() {
  try {
    const stored = window.sessionStorage.getItem(HISTORY_VIEW_MODE_KEY);
    return stored === "list" || stored === "calendar" ? stored : null;
  } catch {
    // 프라이빗 브라우징 등으로 storage 접근이 막혀도 화면 동작엔 지장 없게 무시한다.
    return null;
  }
}

function storeViewMode(mode) {
  try {
    window.sessionStorage.setItem(HISTORY_VIEW_MODE_KEY, mode);
  } catch {
    // 저장 실패해도 조용히 무시 — 이번 방문에서만 기억이 안 될 뿐 기능엔 지장 없음.
  }
}

function HistoryPage() {
  const location = useLocation();
  // Lv4 "캘린더에 추가" 카드에서 넘어온 경우(#28 연동) 캘린더 뷰 + 해당 날짜로 바로 진입한다.
  // 이 경우는 사용자의 명시적 이동 의도라 저장된 마지막 뷰보다 우선한다.
  const navigatedDate = location.state?.selectedDate ?? null;

  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]); // done 이벤트 기준 완료 스냅샷(완료시각/집중시간/진입레벨/microTask) — 최근순 정렬된 채로 옴
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState(
    () => (navigatedDate ? "calendar" : (getStoredViewMode() ?? "list")),
  );
  const [selectedDate, setSelectedDate] = useState(
    navigatedDate ? new Date(navigatedDate) : null,
  );

  // 사용자가 직접 탭을 눌러 바꾼 경우에만 "마지막 본 뷰"로 기억한다(Lv4에서
  // 강제로 캘린더로 진입한 것까지 다음 방문 기본값을 바꿔버리지 않기 위함).
  function handleViewModeChange(mode) {
    setViewMode(mode);
    storeViewMode(mode);
  }

  useEffect(() => {
    // 캘린더 뷰(등록일 기준 그룹핑)는 기존처럼 /api/tasks를 그대로 쓰고,
    // 리스트 뷰의 완료 스냅샷 표시는 /api/history를 새로 쓴다(#STEP2).
    Promise.all([apiFetch("/api/tasks"), apiFetch("/api/history")]).then(
      ([tasksRes, historyRes]) => {
        setTasks(tasksRes.data);
        setHistory(historyRes.data);
        setIsLoading(false);
      },
    );
  }, []);

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">히스토리</h1>
        </div>
        <p>불러오는 중...</p>
      </div>
    );
  }

  // 캘린더 그루핑에서만 completedAt을 반영한다 — 완료된 task는 taskId로
  // /api/history의 completedAt을 찾아 붙이고, 진행 중이라 history에 없는 task는
  // completedAt 없이(=createdAt 기준으로) 그대로 둔다. 리스트 뷰(history state)는
  // 이 매핑과 무관하게 원본 그대로 렌더링한다.
  const completedAtByTaskId = new Map(
    history.map((entry) => [entry.taskId, entry.completedAt]),
  );
  const tasksForCalendar = tasks.map((task) => ({
    ...task,
    completedAt: completedAtByTaskId.get(task.id) ?? null,
  }));
  const tasksByDate = groupTasksByDate(tasksForCalendar);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">히스토리</h1>
        <p className="page-sub">완료 {history.length}개</p>
      </div>

      <div className="view-tabs">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={viewMode === tab.value ? "view-tab view-tab-active" : "view-tab"}
            onClick={() => handleViewModeChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === "list" ? (
        history.length === 0 ? (
          <EmptyState message="아직 완료한 할일이 없어요." actionLabel="할일 등록하러 가기" />
        ) : (
          <div className="history-list">
            {history.map((entry) => (
              <HistoryRow key={entry.taskId} entry={entry} />
            ))}
          </div>
        )
      ) : (
        <CalendarHistoryView
          tasksByDate={tasksByDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          initialMonth={selectedDate ?? new Date()}
        />
      )}
    </div>
  );
}

export default HistoryPage;
