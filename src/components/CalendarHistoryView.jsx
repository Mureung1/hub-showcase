import { useState } from "react";
import { addMonths, subMonths, isSameMonth, isSameDay, isToday, format } from "date-fns";
import { buildMonthGrid, dateKey } from "../lib/historyGrouping";
import { formatFocusDuration } from "../lib/historyInsights";
import "./CalendarHistoryView.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_LABELS = {
  waiting: "대기 중",
  active: "진행 중",
  done: "완료",
};

// 완료된 task만 리스트 뷰에 준하는 요약(완료시각·집중시간·진입레벨)을 보여준다 —
// 첫 행동/회피 이유는 여기서는 표시하지 않는다(컴팩트 행 유지 목적).
function formatCompletionTimeAndDuration(task) {
  const parts = [`${format(new Date(task.completedAt), "HH:mm")} 완료`];
  if (task.durationSeconds != null) {
    parts.push(`집중 ${formatFocusDuration(task.durationSeconds)}`);
  }
  return parts.join(" · ");
}

function CalendarHistoryView({ tasksByDate, selectedDate, onSelectDate, initialMonth }) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const grid = buildMonthGrid(currentMonth);
  const selectedTasks = selectedDate ? (tasksByDate[dateKey(selectedDate.toISOString())] ?? []) : [];

  return (
    <div className="calendar-history">
      <div className="calendar-nav">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
        >
          ← 이전 달
        </button>
        <span className="calendar-month-label">{format(currentMonth, "yyyy년 M월")}</span>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
        >
          다음 달 →
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div className="calendar-weekday" key={label}>
            {label}
          </div>
        ))}
        {grid.map((day) => {
          const key = dateKey(day.toISOString());
          const dayTasks = tasksByDate[key] ?? [];
          const outOfMonth = !isSameMonth(day, currentMonth);
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={key}
              type="button"
              className={[
                "calendar-day",
                outOfMonth && "calendar-day-out",
                isToday(day) && "calendar-day-today",
                selected && "calendar-day-selected",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(day)}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              {dayTasks.length > 0 && (
                <span className="calendar-day-dot" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="calendar-day-detail">
          <p className="calendar-day-detail-title">
            {format(selectedDate, "M월 d일")} 완료 기록
          </p>
          {selectedTasks.length === 0 ? (
            <p className="calendar-day-detail-empty">이 날 등록된 할일이 없어요.</p>
          ) : (
            <ul className="calendar-day-detail-list">
              {selectedTasks.map((task) => {
                const isDone = task.status === "done" && Boolean(task.completedAt);
                return (
                  <li key={task.id} className="calendar-day-detail-item">
                    <span className="calendar-day-detail-title-row">
                      <span className="calendar-day-detail-marker" aria-hidden="true" />
                      <span className="calendar-day-detail-item-title">{task.title}</span>
                    </span>
                    {isDone ? (
                      <span className="calendar-day-detail-summary">
                        {formatCompletionTimeAndDuration(task)}
                        {task.entryLevel != null && (
                          <>
                            {" · "}
                            <span
                              className="calendar-day-detail-level"
                              data-level={task.entryLevel}
                            >
                              Lv{task.entryLevel}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="calendar-day-detail-status">
                        {STATUS_LABELS[task.status]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarHistoryView;
