import './TaskItem.css';
import { formatDue } from '../utils/date';

function TaskItem({ task, assigneeName }) {
  return (
    <div className="task-item">
      <div className="task-info">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {assigneeName} · {formatDue(task.due_date)}
        </div>
      </div>
    </div>
  );
}

export default TaskItem;
