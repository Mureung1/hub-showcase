import type { BriefingRoutine } from '@shared/schemas';

type RoutineCardProps = {
  routines: BriefingRoutine[];
  onToggle: (routineId: string, completed: boolean) => void;
};

export default function RoutineCard({ routines, onToggle }: RoutineCardProps) {
  if (routines.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">오늘의 루틴</h2>
      {routines.map(({ routine, completedToday }) => (
        <div key={routine.id} className="routine-item">
          <input
            type="checkbox"
            className="routine-item__checkbox"
            checked={completedToday}
            onChange={() => onToggle(routine.id, !completedToday)}
            aria-label={`${routine.content} 완료`}
          />
          <div>
            <p className="routine-item__content">{routine.content}</p>
            {routine.startTime && routine.endTime && (
              <p className="routine-item__time">
                {routine.startTime} ~ {routine.endTime}
              </p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
