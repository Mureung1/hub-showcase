import type { MissionRecordCalendarDay } from '../../../api/types'
import { MISSION_TYPE_LABEL } from '../../../shared/domain/labels'
import ErrorState from '../../../shared/ui/ErrorState/ErrorState'
import type { CalendarState } from '../types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function buildCalendarGrid(displayMonth: string): (string | null)[] {
  const [year, month] = displayMonth.split('-').map(Number)
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (string | null)[] = new Array(startWeekday).fill(null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

type MissionCalendarProps = {
  displayMonth: string
  selectedDate: string
  today: string
  state: CalendarState
  onSelectDate: (date: string) => void
}

export default function MissionCalendar({
  displayMonth,
  selectedDate,
  today,
  state,
  onSelectDate,
}: MissionCalendarProps) {
  const daysByDate = new Map<string, MissionRecordCalendarDay>(
    state.status === 'success' ? state.days.map((day) => [day.date, day]) : [],
  )

  return (
    <section className="card myggaem-calendar-card">
      <div className="myggaem-weekdays">
        {WEEKDAYS.map((weekday, index) => (
          <span
            key={weekday}
            className={`myggaem-weekday${index === 0 ? ' myggaem-weekday--sunday' : ''}`}
          >
            {weekday}
          </span>
        ))}
      </div>
      <div className="myggaem-days">
        {buildCalendarGrid(displayMonth).map((date, index) => {
          if (date === null) return <span key={`blank-${index}`} />

          const record = daysByDate.get(date)
          const dayNumber = Number(date.split('-')[2])
          const accessibleName = record
            ? `${dayNumber}일, ${MISSION_TYPE_LABEL[record.firstMissionType]} 기록 ${record.recordCount}개`
            : `${dayNumber}일`

          return (
            <button
              key={date}
              type="button"
              className={`myggaem-day${date === today ? ' myggaem-day--today' : ''}${
                date === selectedDate ? ' myggaem-day--selected' : ''
              }${record ? ' myggaem-day--has-record' : ''}`}
              aria-pressed={date === selectedDate}
              aria-label={accessibleName}
              onClick={() => onSelectDate(date)}
            >
              {record && (
                <span
                  className={`myggaem-day-stamp myggaem-stamp--${record.firstMissionType}`}
                  aria-hidden="true"
                />
              )}
              {dayNumber}
            </button>
          )
        })}
      </div>
      {state.status === 'loading' && <p role="status">달력을 불러오고 있어요...</p>}
      {state.status === 'error' && (
        <ErrorState message={state.message} onRetry={state.onRetry} />
      )}
      {state.status === 'success' && state.days.length === 0 && (
        <p className="myggaem-empty-month">이 달에는 기록이 없어요.</p>
      )}
    </section>
  )
}
