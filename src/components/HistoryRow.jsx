import { format } from "date-fns";
import "./HistoryRow.css";

function formatDuration(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// entry: /api/history 항목(taskId/title/completedAt/durationSeconds/entryLevel/microTask).
// entryLevel/microTask는 Lv2를 거쳐 완료했을 때만 값이 있다 — 없으면 그 항목은 생략한다
// (CompletionMessage.jsx와 동일한 조건부 렌더링 패턴).
function HistoryRow({ entry }) {
  return (
    <div className="history-row">
      <div className="history-main">
        <span className="htitle">{entry.title}</span>
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
