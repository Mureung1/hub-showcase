import { useState } from 'react';
import type { Routine } from '@shared/schemas';

type RoutineCardProps = {
  routines: Routine[];
};

export default function RoutineCard({ routines }: RoutineCardProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (routines.length === 0) return null;

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="card">
      <h2 className="card__title">오늘의 루틴</h2>
      {routines.map((r) => (
        <div key={r.id} className="routine-item">
          <input
            type="checkbox"
            className="routine-item__checkbox"
            checked={checked[r.id] ?? false}
            onChange={() => toggle(r.id)}
            aria-label={`${r.content} 완료`}
          />
          <div>
            <p className="routine-item__content">{r.content}</p>
            {r.startTime && r.endTime && (
              <p className="routine-item__time">
                {r.startTime} ~ {r.endTime}
              </p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
