import type { Schedule } from '@shared/schemas';
import ScheduleItem from './ScheduleItem';

type ScheduleCardProps = {
  schedules: Schedule[];
};

export default function ScheduleCard({ schedules }: ScheduleCardProps) {
  if (schedules.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">오늘의 일정</h2>
      {schedules.map((s) => (
        <ScheduleItem key={s.id} time={s.startTime} title={s.title} />
      ))}
    </section>
  );
}
