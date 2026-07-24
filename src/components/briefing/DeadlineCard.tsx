import type { Task } from '@shared/schemas';
import type { CompletionPhases } from '../../types/completion';
import DeadlineItem from './DeadlineItem';

type DeadlineCardProps = {
  deadlines: Task[];
  baseDate: string;
  completionPhases: CompletionPhases;
  onToggle: (taskId: string, completed: boolean) => void;
};

export default function DeadlineCard({
  deadlines,
  baseDate,
  completionPhases,
  onToggle,
}: DeadlineCardProps) {
  if (deadlines.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">마감 임박</h2>
      {deadlines.map((t) => (
        <DeadlineItem
          key={t.id}
          task={t}
          baseDate={baseDate}
          phase={completionPhases[t.id]}
          onToggle={onToggle}
        />
      ))}
    </section>
  );
}
