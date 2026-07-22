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

function HistoryPage() {
  const location = useLocation();
  // Lv4 "캘린더에 추가" 카드에서 넘어온 경우(#28 연동) 캘린더 뷰 + 해당 날짜로 바로 진입한다.
  const navigatedDate = location.state?.selectedDate ?? null;

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState(navigatedDate ? "calendar" : "list");
  const [selectedDate, setSelectedDate] = useState(
    navigatedDate ? new Date(navigatedDate) : null,
  );

  useEffect(() => {
    apiFetch("/api/tasks").then(({ data }) => {
      setTasks(data);
      setIsLoading(false);
    });
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

  const doneTasks = tasks.filter((t) => t.status === "done");
  const maxSkip = Math.max(...doneTasks.map((t) => t.skipCount), 1);
  const tasksByDate = groupTasksByDate(tasks);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">히스토리</h1>
        <p className="page-sub">완료 {doneTasks.length}개</p>
      </div>

      <div className="view-tabs">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={viewMode === tab.value ? "view-tab view-tab-active" : "view-tab"}
            onClick={() => setViewMode(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === "list" ? (
        doneTasks.length === 0 ? (
          <EmptyState message="아직 완료한 할일이 없어요." actionLabel="할일 등록하러 가기" />
        ) : (
          <div className="history-list">
            {doneTasks.map((task) => (
              <HistoryRow key={task.id} task={task} maxSkip={maxSkip} />
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
