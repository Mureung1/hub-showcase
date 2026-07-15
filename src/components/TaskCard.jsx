import { format } from "date-fns";
import { LEVEL_META } from "../lib/levelMeta";
import "./TaskCard.css";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function TaskCard({ task, onClick }) {
  if (task.status === "done") {
    return (
      <div className="task-card done">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className="meta-chip">{task.type}</span>
          <span className="meta-chip done-chip">
            <CheckIcon /> 완료
          </span>
        </div>
      </div>
    );
  }

  if (task.status === "waiting") {
    return (
      <div className="task-card">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className="meta-chip">{task.type}</span>
          <span className="meta-chip">
            ⏳ 오늘 {format(new Date(task.startTime), "HH:mm")}부터 시작돼요
          </span>
        </div>
      </div>
    );
  }

  // status === "active" — 포커스 화면 진입은 active 카드에서만 가능
  const meta = LEVEL_META[task.level];

  return (
    <div className="task-card task-card-clickable" onClick={onClick}>
      <div className="task-title-row">
        <div className="task-face">{meta.face}</div>
        <p className="task-title">{task.title}</p>
      </div>
      <div className="pressure-track">
        <div
          className="pressure-fill"
          style={{ width: `${(task.level / 4) * 100}%` }}
        ></div>
      </div>
      <div className="pressure-label">
        <span>{meta.label}</span>
        <span>벌써 {task.skipCount}번째 알림</span>
      </div>
    </div>
  );
}

export default TaskCard;
