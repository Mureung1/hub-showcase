import type { PatientCategoryDefinition } from "@baro-jinryo/shared";
import { Minus, Plus } from "lucide-react";

interface PatientCountStepperProps {
  category: PatientCategoryDefinition;
  count: number;
  total: number;
  onChange: (categoryId: string, nextCount: number) => void;
}

export function PatientCountStepper({
  category,
  count,
  total,
  onChange,
}: PatientCountStepperProps) {
  return (
    <div className="count-row">
      <div>
        <strong>{category.name}</strong>
        {category.description && <span>{category.description}</span>}
      </div>
      <div className="stepper" aria-label={`${category.name} 인원`}>
        <button
          type="button"
          aria-label={`${category.name} 1명 줄이기`}
          onClick={() => onChange(category.id, count - 1)}
          disabled={count === 0}
        >
          <Minus size={18} />
        </button>
        <output aria-live="polite">{count}</output>
        <button
          type="button"
          aria-label={`${category.name} 1명 늘리기`}
          onClick={() => onChange(category.id, count + 1)}
          disabled={total >= 9}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
