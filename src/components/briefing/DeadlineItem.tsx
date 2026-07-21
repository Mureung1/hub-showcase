import type { Task } from '@shared/schemas';
import DdayBadge from '../common/DdayBadge';

type DeadlineItemProps = {
  task: Task;
  baseDate: string;
  onToggle: (taskId: string, completed: boolean) => void;
};

export default function DeadlineItem({ task, baseDate, onToggle }: DeadlineItemProps) {
  return (
    <div className="deadline-item">
      <input
        type="checkbox"
        className="deadline-item__checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id, !task.completed)}
        aria-label={`${task.title} 완료`}
      />
      <span className="deadline-item__title">{task.title}</span>
      <DdayBadge deadline={task.deadline} baseDate={baseDate} />
    </div>
  );
}
