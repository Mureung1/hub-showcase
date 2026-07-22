import { REASON_OPTIONS } from "../lib/taskOptions";
import "./HistoryRow.css";

function reasonLabel(task) {
  if (task.reason === "custom" && task.customReasonText) return task.customReasonText;
  return REASON_OPTIONS.find((option) => option.value === task.reason)?.label ?? null;
}

function HistoryRow({ task, maxSkip }) {
  const reasonText = reasonLabel(task);
  const barWidth = maxSkip > 0 ? (task.skipCount / maxSkip) * 100 : 0;

  return (
    <div className="history-row">
      <div className="history-main">
        <span className="htitle">{task.title}</span>
        {reasonText && <span className="history-reason">{reasonText}</span>}
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${barWidth}%` }} />
      </div>
      <span className="hcount">{task.skipCount}회 미룸</span>
      {task.skipCount === 0 && <span className="history-badge">한 번에 완료</span>}
    </div>
  );
}

export default HistoryRow;
