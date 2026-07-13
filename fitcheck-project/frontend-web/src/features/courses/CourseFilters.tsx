import type { BodyPart, Goal } from '../../data/userMock';
import { BODY_PARTS, GOALS } from '../../data/userMock';
import './courses.css';

interface CourseFiltersProps {
  bodyPart: BodyPart | '전체';
  goal: Goal | '전체';
  onBodyPartChange: (value: BodyPart | '전체') => void;
  onGoalChange: (value: Goal | '전체') => void;
}

export default function CourseFilters({
  bodyPart,
  goal,
  onBodyPartChange,
  onGoalChange,
}: CourseFiltersProps) {
  return (
    <div className="course-filters">
      <div className="filter-group">
        <span className="form-label">부위</span>
        <div className="filter-chips">
          {BODY_PARTS.map((part) => (
            <button
              key={part}
              type="button"
              className={`filter-chip${bodyPart === part ? ' active' : ''}`}
              onClick={() => onBodyPartChange(part)}
            >
              {part}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <span className="form-label">목적</span>
        <div className="filter-chips">
          {GOALS.map((item) => (
            <button
              key={item}
              type="button"
              className={`filter-chip${goal === item ? ' active' : ''}`}
              onClick={() => onGoalChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
