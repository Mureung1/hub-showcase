import { KOREAN_DAY_LABEL } from '@/lib/dayLabels'

const WEEK_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function getThisWeekDates() {
  const today = new Date()
  const jsDay = today.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  return WEEK_ORDER.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
}

function DayCard({ day, date, isToday }) {
  const isRest = day.targetArea === null
  const isCompleted = day.status === 'COMPLETED'
  const isSkipped = day.status === 'SKIPPED'

  // 배경/테두리는 "오늘인지"만으로 정하고, 상태 텍스트는 완료/휴식/예정 중 따로 정한다 —
  // 이렇게 층을 나눠야 "오늘이면서 휴식"·"오늘이면서 완료" 같은 조합이 다 제대로 표현된다.
  const bgClass = isToday
    ? 'bg-day-today'
    : isRest
      ? 'bg-day-rest'
      : 'bg-day-default'
  const todayRing = isToday
    ? 'border-[1.5px] border-accent shadow-[0_0_0_3px_rgba(255,106,26,.12)]'
    : ''
  const cardClass = `${bgClass} ${todayRing}`

  let statusText = null
  let statusClass = 'text-muted'
  if (!isRest) {
    if (isCompleted) {
      statusText = '완료'
      statusClass = 'text-success'
    } else if (isSkipped) {
      statusText = '스킵됨'
    } else {
      statusText = '예정'
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 rounded-md p-3 ${cardClass}`}>
      <span className="text-sm font-semibold text-text">
        {KOREAN_DAY_LABEL[day.dayOfWeek]}
      </span>
      <span className="font-display text-xs text-text-secondary">{date}</span>
      <span className="text-sm text-text">
        {isRest ? '휴식' : day.targetArea}
      </span>
      {statusText && (
        <span className={`text-xs font-medium ${statusClass}`}>
          {statusText}
        </span>
      )}
    </div>
  )
}

function WeekStrip({ days, today }) {
  const dates = getThisWeekDates()

  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((day, i) => (
        <DayCard
          key={day.dayOfWeek}
          day={day}
          date={dates[i]}
          isToday={day.dayOfWeek === today}
        />
      ))}
    </div>
  )
}

export default WeekStrip
