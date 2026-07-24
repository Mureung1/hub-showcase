import type { BriefingRoutine } from '@shared/schemas';

type RoutineCardProps = {
  routines: BriefingRoutine[];
};

export default function RoutineCard({ routines }: RoutineCardProps) {
  if (routines.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">오늘의 루틴</h2>
      {routines.map(({ routine }) => (
        <div key={routine.id} className="schedule-item">
          {routine.startTime && (
            // DB의 time 컬럼은 "HH:mm:ss"로 내려온다 — 초는 버리고 시작 시간만 보여준다.
            <span className="schedule-item__time">{routine.startTime.slice(0, 5)}</span>
          )}
          <span className="schedule-item__title">{routine.content}</span>
        </div>
      ))}
    </section>
  );
}
