import type { Task } from '@shared/schemas';
import type { CompletionPhase } from '../../types/completion';
import DdayBadge from '../common/DdayBadge';

type DeadlineItemProps = {
  task: Task;
  baseDate: string;
  phase?: CompletionPhase;
  onToggle: (taskId: string, completed: boolean) => void;
};

export default function DeadlineItem({ task, baseDate, phase, onToggle }: DeadlineItemProps) {
  const isDone = phase === 'done' || phase === 'fading';

  return (
    <div className={phase === 'fading' ? 'check-item check-item--fading' : 'check-item'}>
      <input
        type="checkbox"
        className="check-item__checkbox"
        checked={isDone}
        disabled={isDone}
        onChange={() => onToggle(task.id, true)}
        aria-label={`${task.title} 완료`}
      />
      <span className={isDone ? 'check-item__title check-item__title--done' : 'check-item__title'}>
        {task.title}
      </span>
      <DdayBadge deadline={task.deadline} baseDate={baseDate} />
    </div>
  );
}
