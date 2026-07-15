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

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
    </svg>
  );
}

function DeleteButton({ title, onDelete }) {
  function handleClick(e) {
    e.stopPropagation(); // 카드 자체의 onClick(포커스 진입 등)이 함께 발동하지 않도록
    if (window.confirm(`"${title}"을(를) 삭제할까요?`)) {
      onDelete();
    }
  }

  return (
    <button
      className="task-delete-btn"
      onClick={handleClick}
      aria-label={`${title} 삭제`}
    >
      <TrashIcon />
    </button>
  );
}

function TaskCard({ task, onClick, onDelete }) {
  if (task.status === "done") {
    return (
      <div className="task-card done">
        <div className="task-card-top">
          <p className="task-title">{task.title}</p>
          <DeleteButton title={task.title} onDelete={onDelete} />
        </div>
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
        <div className="task-card-top">
          <p className="task-title">{task.title}</p>
          <DeleteButton title={task.title} onDelete={onDelete} />
        </div>
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
        <DeleteButton title={task.title} onDelete={onDelete} />
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
