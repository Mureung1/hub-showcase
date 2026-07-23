import { format } from "date-fns";
import { REASON_OPTIONS } from "../lib/taskOptions";
import "./HistoryRow.css";

function reasonLabel(task) {
  if (!task) return null;
  if (task.reason === "custom" && task.customReasonText) return task.customReasonText;
  return REASON_OPTIONS.find((option) => option.value === task.reason)?.label ?? null;
}

function formatDuration(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// entry: /api/history 항목(taskId/title/completedAt/durationSeconds/entryLevel/microTask).
// task: /api/tasks 쪽 같은 taskId(회피이유·skipCount 막대 등 기존 표시용, STEP1 이전부터 있던 것).
// entryLevel/microTask는 Lv2를 거쳐 완료했을 때만 값이 있다 — 없으면 그 항목은 생략한다
// (CompletionMessage.jsx와 동일한 조건부 렌더링 패턴).
function HistoryRow({ entry, task, maxSkip }) {
  const reasonText = reasonLabel(task);
  const skipCount = task?.skipCount ?? 0;
  const barWidth = maxSkip > 0 ? (skipCount / maxSkip) * 100 : 0;

  return (
    <div className="history-row">
      <div className="history-main">
        <span className="htitle">{entry.title}</span>
        {reasonText && <span className="history-reason">{reasonText}</span>}
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${barWidth}%` }} />
      </div>
      <span className="hcount">{skipCount}회 미룸</span>
      {skipCount === 0 && <span className="history-badge">한 번에 완료</span>}
      <div className="history-completion">
        <span className="history-completed-at">
          {format(new Date(entry.completedAt), "M/d HH:mm")} 완료
        </span>
        {entry.durationSeconds != null && (
          <span className="history-duration">집중 {formatDuration(entry.durationSeconds)}</span>
        )}
        {entry.entryLevel != null && (
          <span className="history-entry-level">Lv{entry.entryLevel}</span>
        )}
        {entry.microTask && (
          <span className="history-microtask">첫 행동: {entry.microTask}</span>
        )}
      </div>
    </div>
  );
}

export default HistoryRow;
