import { Link } from 'react-router-dom'

function ExerciseRow({ order, exercise }) {
  return (
    <div className="flex items-center gap-4 rounded-md px-4 py-[15px] hover:bg-panel">
      <span className="font-display w-5 text-[15px] text-muted">{order}</span>
      <div className="min-w-0 flex-1">
        <span className="text-[15px] font-semibold text-text">
          {exercise.name}
        </span>
      </div>
      <span className="text-[13px] tabular-nums text-text-secondary">
        {exercise.targetSets} × {exercise.targetReps}
      </span>
    </div>
  )
}

function SessionCard({
  routineDayId,
  targetArea,
  exercises,
  status,
  onComplete,
}) {
  const isCompleted = status === 'COMPLETED'

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-7 py-6">
        <div>
          <div className="font-display mb-1.5 text-[11px] tracking-[.16em] text-accent">
            TODAY · {targetArea}
          </div>
          <div className="text-[22px] font-extrabold tracking-[-.01em] text-text">
            {targetArea} 세션
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-text">
            {exercises.length}
          </div>
          <div className="text-[11px] text-text-secondary">개 운동</div>
        </div>
      </div>

      <div className="px-3 py-2.5">
        {exercises.map((exercise, i) => (
          <ExerciseRow
            key={exercise.exerciseId}
            order={i + 1}
            exercise={exercise}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border px-7 py-5">
        <button
          onClick={onComplete}
          disabled={isCompleted}
          className={
            isCompleted
              ? 'min-w-[170px] flex-1 cursor-not-allowed rounded-pill border border-border px-6 py-[15px] text-[15px] font-bold text-success'
              : 'min-w-[170px] flex-1 rounded-pill bg-accent px-6 py-[15px] text-[15px] font-bold tracking-[-.01em] text-on-accent hover:bg-accent-hover'
          }
        >
          {isCompleted ? '완료됨' : '오늘 운동 완료'}
        </button>
        <Link
          to={`/pain-report/${routineDayId}`}
          className="flex items-center justify-center rounded-pill border border-border px-[26px] py-[15px] text-[15px] font-semibold text-text hover:border-outline-hover"
        >
          통증 보고하기
        </Link>
        <button
          disabled
          className="cursor-not-allowed rounded-pill border border-border px-[26px] py-[15px] text-[15px] font-semibold text-muted"
        >
          오늘 세션 스킵
        </button>
      </div>
    </div>
  )
}

export default SessionCard
