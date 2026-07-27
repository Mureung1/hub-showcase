import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoutineToday } from '@/hooks/useRoutineToday'
import { useExerciseRecords } from '@/hooks/useExerciseRecords'
import Sidebar from '@/components/Sidebar'

const KOREAN_DAY_LABEL = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
}
const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']

// loggedAt(진짜 타임스탬프)에서 "YYYY-M-D" 키를 뽑는다 — 이 키로 달력 칸과 세션을 잇는다.
function toDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// loggedAt이 없는 세션(세트를 하나도 안 남기고 완료한 경우)은 달력에 꽂을 날짜 자체가
// 없어서 이 화면에서는 자연히 제외된다 — 애초에 보여줄 기록도 없다.
function buildSessionsByDate(sessions) {
  const map = new Map()
  for (const session of sessions) {
    if (!session.loggedAt) continue
    map.set(toDateKey(new Date(session.loggedAt)), session)
  }
  return map
}

function buildMonthCells(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()
  const cells = Array.from({ length: startWeekday }, () => null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  return cells
}

function formatSessionHeading(loggedAt, dayOfWeek) {
  const date = new Date(loggedAt)
  return `완료 · ${date.getMonth() + 1}월 ${date.getDate()}일 (${KOREAN_DAY_LABEL[dayOfWeek]})`
}

function RecordExerciseRow({ order, exercise }) {
  return (
    <div className="flex items-start gap-4 rounded-md px-4 py-[15px]">
      <span className="font-display w-5 text-[15px] text-muted">{order}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-text">{exercise.name}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums text-text-secondary">
          {exercise.sets.map((set) => (
            <span key={set.setNumber}>
              {set.weight}kg × {set.reps}회
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function RecordSessionCard({ session }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-7 py-6">
        <div className="font-display mb-1.5 text-[11px] tracking-[.16em] text-accent">
          {formatSessionHeading(session.loggedAt, session.dayOfWeek)}
        </div>
        <div className="text-[22px] font-extrabold tracking-[-.01em] text-text">
          {session.targetArea} 세션
        </div>
      </div>
      <div className="px-3 py-2.5">
        {session.exercises.map((exercise, i) => (
          <RecordExerciseRow key={exercise.exerciseId} order={i + 1} exercise={exercise} />
        ))}
      </div>
    </div>
  )
}

function CalendarCell({ day, hasSession, isSelected, onClick }) {
  if (day === null) return <div />

  if (!hasSession) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md text-[13px] text-text-secondary">
        {day}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-md border text-[13px] font-semibold ${
        isSelected
          ? 'border-accent bg-day-today text-accent'
          : 'border-border bg-surface text-text hover:border-outline-hover'
      }`}
    >
      {day}
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
    </button>
  )
}

function Calendar({ sessionsByDate, selectedKey, onSelect }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const base = new Date()
  base.setDate(1)
  base.setMonth(base.getMonth() + monthOffset)
  const year = base.getFullYear()
  const month = base.getMonth()
  const cells = buildMonthCells(year, month)

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((v) => v - 1)}
          className="rounded-pill border border-border px-3 py-1.5 text-[13px] text-text hover:border-outline-hover"
        >
          ← 이전 달
        </button>
        <span className="font-display text-[15px] tracking-[.08em] text-text">
          {year}년 {month + 1}월
        </span>
        <button
          type="button"
          onClick={() => setMonthOffset((v) => v + 1)}
          className="rounded-pill border border-border px-3 py-1.5 text-[13px] text-text hover:border-outline-hover"
        >
          다음 달 →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="text-center text-[12px] text-text-secondary"
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          const key = day === null ? null : `${year}-${month}-${day}`
          return (
            <CalendarCell
              key={i}
              day={day}
              hasSession={key !== null && sessionsByDate.has(key)}
              isSelected={key === selectedKey}
              onClick={() => onSelect(key)}
            />
          )
        })}
      </div>
    </div>
  )
}

function Records() {
  const {
    data: routineData,
    loading: routineLoading,
    error: routineError,
  } = useRoutineToday()
  const {
    data: recordsData,
    loading: recordsLoading,
    error: recordsError,
  } = useExerciseRecords()
  const [selectedKey, setSelectedKey] = useState(null)

  if (routineLoading || recordsLoading) {
    return <p className="p-8 text-text-secondary">로딩 중...</p>
  }

  if (routineError || recordsError) {
    return (
      <p className="p-8 text-text-secondary">
        서버에 연결할 수 없습니다. 백엔드(server)가 실행 중인지 확인해주세요.
      </p>
    )
  }

  if (!routineData.hasRoutine) {
    return (
      <div className="p-8 text-text-secondary">
        아직 루틴이 없습니다.{' '}
        <Link to="/onboarding" className="text-accent hover:text-link-hover">
          온보딩을 먼저 완료해주세요.
        </Link>
      </div>
    )
  }

  const sessionsByDate = buildSessionsByDate(recordsData.sessions)
  const selectedSession = selectedKey ? sessionsByDate.get(selectedKey) : null

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar
        weekProgress={routineData.weekProgress}
        routine={routineData.routine}
      />
      <main className="max-w-[1080px] flex-1 p-8">
        <h1 className="mb-6 text-[24px] font-extrabold tracking-[-.01em] text-text">
          운동 기록
        </h1>
        {sessionsByDate.size === 0 ? (
          <p className="text-text-secondary">아직 완료한 세션이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <Calendar
              sessionsByDate={sessionsByDate}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
            {selectedSession ? (
              <RecordSessionCard session={selectedSession} />
            ) : (
              <p className="text-text-secondary">
                날짜를 선택하면 그날 기록을 볼 수 있습니다.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Records
