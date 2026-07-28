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
// 정보 위계: primary(제목+완료시각) > secondary(집중시간+진입레벨) > detail(첫 행동/회피 이유).
function HistoryRow({ entry }) {
  const reasonText = reasonLabel(entry);
  const hasSecondary = entry.durationSeconds != null || entry.entryLevel != null;
  const hasDetail = Boolean(entry.microTask) || Boolean(reasonText);

  return (
    <div className="history-row">
      <div className="history-primary">
        <span className="htitle">{entry.title}</span>
        <span className="history-completed-at">
          {format(new Date(entry.completedAt), "M/d HH:mm")} 완료
        </span>
      </div>

      {hasSecondary && (
        <div className="history-secondary">
          {entry.durationSeconds != null && (
            <span className="history-duration">집중 {formatDuration(entry.durationSeconds)}</span>
          )}
          {entry.entryLevel != null && (
            <span className="history-entry-level" data-level={entry.entryLevel}>
              Lv{entry.entryLevel}
            </span>
          )}
        </div>
      )}

      {hasDetail && (
        <div className="history-detail">
          {entry.microTask && (
            <p className="history-detail-item history-microtask">
              <span className="history-detail-label">첫 행동</span>
              <span className="history-detail-value">{entry.microTask}</span>
            </p>
          )}
          {reasonText && (
            <p className="history-detail-item history-reason">
              <span className="history-detail-label">회피 이유</span>
              <span className="history-detail-value">{reasonText}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryRow;
