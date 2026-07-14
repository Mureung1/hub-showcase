import type { Task } from '@shared/schemas';
import DeadlineItem from './DeadlineItem';

type DeadlineCardProps = {
  deadlines: Task[];
  baseDate: string;
};

export default function DeadlineCard({ deadlines, baseDate }: DeadlineCardProps) {
  if (deadlines.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">마감 임박</h2>
      {deadlines.map((t) => (
        <DeadlineItem key={t.id} task={t} baseDate={baseDate} />
      ))}
    </section>
  );
}
