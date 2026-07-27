import { useState } from 'react'
import { Link } from 'react-router-dom'

// 운동마다 targetSets 개수만큼 세트 입력칸의 초기값을 만든다.
// key는 "exerciseId-setNumber" — 세트 입력 하나를 유일하게 식별한다.
// 반복수는 목표치(targetReps)로, 무게는 그 운동의 마지막 기록(lastWeight)으로 미리 채운다 —
// 사용자는 다 못 했을 때만 반복수를 스텝퍼로 내리면 된다(타이핑 대신 터치).
function buildInitialSetInputs(exercises) {
  const state = {}
  for (const exercise of exercises) {
    for (let setNumber = 1; setNumber <= exercise.targetSets; setNumber++) {
      state[`${exercise.exerciseId}-${setNumber}`] = {
        weight: exercise.lastWeight ?? '',
        reps: exercise.targetReps,
      }
    }
  }
  return state
}

function SetInputRow({ setNumber, value, onChange }) {
  const decrement = () => onChange({ ...value, reps: Math.max(0, Number(value.reps) - 1) })
  const increment = () => onChange({ ...value, reps: Number(value.reps) + 1 })
  const isSkipped = value.reps === 0

  return (
    <div
      className={`flex items-center gap-3 py-1.5 pl-9 text-[13px] ${isSkipped ? 'opacity-50' : ''}`}
    >
      <span className="font-display w-14 text-muted">세트 {setNumber}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value.weight}
        onChange={(e) => onChange({ ...value, weight: e.target.value })}
        placeholder="kg"
        className="w-16 rounded-sm border border-border bg-bg px-2 py-1 tabular-nums text-text"
      />
      <span className="text-muted">×</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          disabled={value.reps === 0}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-text hover:border-outline-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums text-text">
          {value.reps}
        </span>
        <button
          type="button"
          onClick={increment}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-text hover:border-outline-hover"
        >
          +
        </button>
        <span className="text-text-secondary">회</span>
      </div>
      {isSkipped && <span className="text-text-secondary">이 세트는 안 함</span>}
    </div>
  )
}

// 운동 하나가 펼쳐졌는지는 그 운동 행 자신만 아는 표시용 상태라, 부모(SessionCard)로
// 끌어올리지 않고 여기 로컬 state로 둔다 — 제출 데이터(setInputs)와는 무관하다.
function ExerciseRow({ order, exercise, setInputs, onSetChange, showInputs }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const header = (
    <>
      <span className="font-display w-5 text-[15px] text-muted">{order}</span>
      <div className="min-w-0 flex-1">
        <span className="text-[15px] font-semibold text-text">
          {exercise.name}
        </span>
      </div>
      <span className="text-[13px] tabular-nums text-text-secondary">
        {exercise.targetSets} × {exercise.targetReps}
      </span>
    </>
  )

  return (
    <div className="rounded-md px-4 py-[15px] hover:bg-panel">
      {showInputs ? (
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex w-full items-center gap-4 text-left"
        >
          {header}
          <span className="w-4 text-center text-muted">
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-4">{header}</div>
      )}
      {showInputs && isExpanded && (
        <div className="mt-2">
          {Array.from({ length: exercise.targetSets }, (_, i) => i + 1).map(
            (setNumber) => {
              const key = `${exercise.exerciseId}-${setNumber}`
              return (
                <SetInputRow
                  key={key}
                  setNumber={setNumber}
                  value={setInputs[key]}
                  onChange={(next) => onSetChange(key, next)}
                />
              )
            },
          )}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  routineDayId,
  targetArea,
  exercises,
  status,
  onComplete,
  onSkip,
}) {
  const isCompleted = status === 'COMPLETED'
  const [setInputs, setSetInputs] = useState(() => buildInitialSetInputs(exercises))

  const handleSetChange = (key, value) => {
    setSetInputs((prev) => ({ ...prev, [key]: value }))
  }

  const handleComplete = () => {
    // 반복수가 0인 세트는 "안 한 것"으로 보고 전송하지 않는다 — 그 외엔 목표를 못 채웠어도
    // (반복수를 줄인 값 그대로) 미달성으로 기록한다.
    const logs = Object.entries(setInputs)
      .filter(([, value]) => value.reps > 0)
      .map(([key, value]) => {
        const [exerciseId, setNumber] = key.split('-').map(Number)
        return {
          exerciseId,
          setNumber,
          weight: Number(value.weight) || 0,
          reps: value.reps,
          completed: true,
        }
      })
    onComplete(logs)
  }

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
            setInputs={setInputs}
            onSetChange={handleSetChange}
            showInputs={!isCompleted}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border px-7 py-5">
        <button
          onClick={handleComplete}
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
          onClick={onSkip}
          disabled={isCompleted}
          className={
            isCompleted
              ? 'cursor-not-allowed rounded-pill border border-border px-[26px] py-[15px] text-[15px] font-semibold text-muted'
              : 'rounded-pill border border-border px-[26px] py-[15px] text-[15px] font-semibold text-text hover:border-outline-hover'
          }
        >
          오늘 세션 스킵
        </button>
      </div>
    </div>
  )
}

export default SessionCard
