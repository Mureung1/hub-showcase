import './TaskItem.css';
import { formatDue } from '../utils/date';

const STATUS_LABEL = { pending: '대기', in_progress: '진행', done: '완료' };
const STATUS_CLASS = { pending: 'wait', in_progress: 'progress', done: 'done' };

function TaskItem({
  task,
  assigneeName,
  canChange,
  isPending,
  onToggleStatus,
  onCycleStatus,
  onDelete,
  showToast,
}) {
  const isDone = task.status === 'done';

  function guard(action, deniedMessage) {
    if (!canChange) {
      showToast(deniedMessage);
      return;
    }
    action();
  }

  return (
    <div className={`task-item${isDone ? ' done' : ''}${isPending ? ' pending' : ''}`}>
      <button
        type="button"
        className={`checkbox${isDone ? ' checked' : ''}${!canChange ? ' locked' : ''}`}
        onClick={() => guard(() => onToggleStatus(task.id), '담당자만 상태를 변경할 수 있습니다.')}
        disabled={isPending}
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
        className={`status-badge status-${STATUS_CLASS[task.status] || 'wait'}${!canChange ? ' locked' : ''}`}
        onClick={() => guard(() => onCycleStatus(task.id), '담당자만 상태를 변경할 수 있습니다.')}
        disabled={isPending}
      >
        {STATUS_LABEL[task.status] || '대기'}
      </button>

      <button
        type="button"
        className={`delete-btn${!canChange ? ' locked' : ''}`}
        onClick={() => guard(() => onDelete(task.id), '담당자만 삭제할 수 있습니다.')}
        disabled={isPending}
        title="삭제"
        aria-label="삭제"
      >
        ×
      </button>
    </div>
  );
}

export default TaskItem;
