import './TaskItem.css';
import { formatDue } from '../utils/date';

const STATUS_LABEL = { pending: '대기', in_progress: '진행', done: '완료' };
const STATUS_CLASS = { pending: 'wait', in_progress: 'progress', done: 'done' };

function TaskItem({ task, assigneeName, canChange, isPending, onToggleStatus, onCycleStatus, onDelete }) {
  const isDone = task.status === 'done';
  const isLocked = !canChange || isPending;

  return (
    <div className={`task-item${isDone ? ' done' : ''}${isPending ? ' pending' : ''}`}>
      <button
        type="button"
        className={`checkbox${isDone ? ' checked' : ''}`}
        onClick={() => onToggleStatus(task.id)}
        disabled={isLocked}
        aria-label="완료 처리"
      >
        {isDone ? '✓' : ''}
      </button>

      <div className="task-info">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {assigneeName} · {formatDue(task.due_date)}
        </div>
      </div>

      <button
        type="button"
        className={`status-badge status-${STATUS_CLASS[task.status] || 'wait'}`}
        onClick={() => onCycleStatus(task.id)}
        disabled={isLocked}
      >
        {STATUS_LABEL[task.status] || '대기'}
      </button>

      <button
        type="button"
        className="delete-btn"
        onClick={() => onDelete(task.id)}
        disabled={isLocked}
        title="삭제"
        aria-label="삭제"
      >
        ×
      </button>
    </div>
  );
}

export default TaskItem;
