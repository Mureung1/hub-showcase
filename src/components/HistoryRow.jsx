import { format } from "date-fns";
import { REASON_OPTIONS } from "../lib/taskOptions";
import "./HistoryRow.css";

function formatDuration(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// entry.reason/customReasonText는 완료 시점(completedAt) 기준 회피 이유다 — 현재
// task 상태가 아니라 그 시점에 유효했던 값이라 완료 후 바뀌지 않는다(server/src/routes/history.ts).
function reasonLabel(entry) {
  if (!entry.reason) return null;
  if (entry.reason === "custom" && entry.customReasonText) {
    return entry.customReasonText;
  }
  return REASON_OPTIONS.find((option) => option.value === entry.reason)?.label ?? null;
}

// entry: /api/history 항목(taskId/title/completedAt/durationSeconds/entryLevel/microTask/reason/customReasonText).
// entryLevel/microTask/reason은 값이 있을 때만 표시한다 — 없으면 그 항목은 생략한다
// (CompletionMessage.jsx와 동일한 조건부 렌더링 패턴).
function HistoryRow({ entry }) {
  const reasonText = reasonLabel(entry);

  return (
    <div className="history-row">
      <div className="history-main">
        <span className="htitle">{entry.title}</span>
        {reasonText && <span className="history-reason">{reasonText}</span>}
      </div>
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
