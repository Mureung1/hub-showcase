import type { Task } from '@shared/schemas';
import DdayBadge from '../common/DdayBadge';

type DeadlineItemProps = {
  task: Task;
  baseDate: string;
};

export default function DeadlineItem({ task, baseDate }: DeadlineItemProps) {
  return (
    <div className="deadline-item">
      <span className="deadline-item__title">{task.title}</span>
      <DdayBadge deadline={task.deadline} baseDate={baseDate} />
    </div>
  );
}
