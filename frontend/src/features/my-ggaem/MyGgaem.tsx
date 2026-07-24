import type { MissionRecordCalendarDay, MissionRecordListItem } from '../../api/types'
import {
  MISSION_TYPE_LABEL,
  MISSION_TYPE_ORDER,
  URL_STATUS_NOTICE,
} from '../../shared/domain/labels'
import BottomTabBar from '../../shared/ui/BottomTabBar/BottomTabBar'
import ErrorState from '../../shared/ui/ErrorState/ErrorState'
import './MyGgaem.css'

export type CalendarState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; days: MissionRecordCalendarDay[] }

export type RecordsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; items: MissionRecordListItem[] }

type MyGgaemProps = {
  displayMonth: string
  selectedDate: string
  today: string
  calendarState: CalendarState
  recordsState: RecordsState
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: string) => void
  onGoToToday: () => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateLabel(date: string): string {
  return date.replaceAll('-', '.')
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

const KST_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatKstCreatedAt(createdAt: string): string {
  return KST_TIME_FORMATTER.format(new Date(createdAt))
}

// Date.UTC 기반으로 계산해 브라우저 로컬 시간대의 영향을 받지 않는다.
function buildCalendarGrid(displayMonth: string): (string | null)[] {
  const [year, month] = displayMonth.split('-').map(Number)
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: (string | null)[] = new Array(startWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`)
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

type MonthParts = { year: number; month: number }

// 표시 월(YYYY-MM)에서 delta개월 이동한 연/월을 계산한다. 실제 이동은 onPrevMonth/onNextMonth가
// 담당하고, 여기서는 pill에 보여줄 라벨만 파생한다.
function shiftMonthParts(displayMonth: string, delta: number): MonthParts {
  const [year, month] = displayMonth.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

function monthPartsFromDisplayMonth(displayMonth: string): MonthParts {
  const [year, month] = displayMonth.split('-').map(Number)
  return { year, month }
}

export default function MyGgaem({
  displayMonth,
  selectedDate,
  today,
  calendarState,
  recordsState,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onGoToToday,
}: MyGgaemProps) {
  const gridCells = buildCalendarGrid(displayMonth)
  const daysByDate = new Map<string, MissionRecordCalendarDay>(
    calendarState.status === 'success' ? calendarState.days.map((day) => [day.date, day]) : [],
  )

  const prevMonth = shiftMonthParts(displayMonth, -1)
  const currentMonth = monthPartsFromDisplayMonth(displayMonth)
  const nextMonth = shiftMonthParts(displayMonth, 1)

  const recordsLabel =
    selectedDate === today ? '오늘의 기록' : `${formatDateLabel(selectedDate)} 기록`

  return (
    <div className="app-shell">
      <header className="myggaem-header">
        <h1>나의 깸</h1>
      </header>

      <main className="screen-main">
        <div
          className="myggaem-month-pills"
          role="group"
          aria-label="표시 월 이동"
        >
          <button
            type="button"
            className="myggaem-month-pill"
            aria-label={`이전 달 ${prevMonth.year}년 ${prevMonth.month}월`}
            onClick={() => onPrevMonth()}
          >
            {prevMonth.month}월
          </button>
          <button
            type="button"
            className="myggaem-month-pill myggaem-month-pill--current"
            aria-current="date"
            aria-label={`현재 표시 월 ${currentMonth.year}년 ${currentMonth.month}월`}
            disabled
          >
            {currentMonth.month}월
          </button>
          <button
            type="button"
            className="myggaem-month-pill"
            aria-label={`다음 달 ${nextMonth.year}년 ${nextMonth.month}월`}
            onClick={() => onNextMonth()}
          >
            {nextMonth.month}월
          </button>
        </div>

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
            {gridCells.map((date, index) => {
              if (date === null) return <span key={`blank-${index}`} />

              const isSelected = date === selectedDate
              const isToday = date === today
              const dayNumber = Number(date.split('-')[2])
              const record = daysByDate.get(date)
              const accessibleName = record
                ? `${dayNumber}일, ${MISSION_TYPE_LABEL[record.firstMissionType]} 기록 ${record.recordCount}개`
                : `${dayNumber}일`

              return (
                <button
                  key={date}
                  type="button"
                  className={`myggaem-day${isToday ? ' myggaem-day--today' : ''}${
                    isSelected ? ' myggaem-day--selected' : ''
                  }${record ? ' myggaem-day--has-record' : ''}`}
                  aria-pressed={isSelected}
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

          {calendarState.status === 'loading' && (
            <p role="status">달력을 불러오고 있어요...</p>
          )}
          {calendarState.status === 'error' && (
            <ErrorState message={calendarState.message} onRetry={calendarState.onRetry} />
          )}
          {calendarState.status === 'success' && calendarState.days.length === 0 && (
            <p className="myggaem-empty-month">이 달에는 기록이 없어요.</p>
          )}
        </section>

        <div className="myggaem-legend" aria-label="미션 유형 범례">
          {MISSION_TYPE_ORDER.map((type) => (
            <div key={type} className="myggaem-legend-item">
              <span
                className={`myggaem-legend-swatch myggaem-legend-swatch--${type}`}
                aria-hidden="true"
              />
              <span className="myggaem-legend-label">{MISSION_TYPE_LABEL[type]}</span>
            </div>
          ))}
        </div>

        <p className="myggaem-records-label">{recordsLabel}</p>

        {recordsState.status === 'loading' && <p role="status">기록을 불러오고 있어요...</p>}
        {recordsState.status === 'error' && (
          <ErrorState message={recordsState.message} onRetry={recordsState.onRetry} />
        )}
        {recordsState.status === 'success' && recordsState.items.length === 0 && (
          <p>이 날짜에는 기록이 없어요.</p>
        )}

        {recordsState.status === 'success' && (
          <section className="myggaem-records">
            {recordsState.items.map((item) => (
              <article key={item.id} className="card myggaem-record-card">
                <div className="myggaem-record-card-header">
                  <span
                    className={`myggaem-mission-type myggaem-mission-type--${item.missionType}`}
                  >
                    {MISSION_TYPE_LABEL[item.missionType]}
                  </span>
                  <span className="myggaem-record-date">{formatKstCreatedAt(item.createdAt)}</span>
                </div>
                <p className="card-meta">{item.sourceName}</p>
                <h2 className="myggaem-record-title">{item.articleTitle}</h2>
                <div className="myggaem-record-tags">
                  {item.interestTags.map((tag) => (
                    <span key={tag.id} className="topic-tag">
                      {tag.name}
                    </span>
                  ))}
                </div>
                <p className="myggaem-record-prompt">{item.missionPrompt}</p>
                <p className="myggaem-record-answer">{item.userAnswer}</p>
                {item.urlStatus === 'active' ? (
                  <a
                    className="card-link"
                    href={item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    원문 다시 보기
                  </a>
                ) : (
                  <>
                    <p className="myggaem-record-url-notice">
                      {URL_STATUS_NOTICE[item.urlStatus]}
                    </p>
                    <button type="button" className="card-link" disabled>
                      원문 다시 보기
                    </button>
                  </>
                )}
              </article>
            ))}
          </section>
        )}
      </main>

      <BottomTabBar
        activeTab="myGgaem"
        onChange={(tab) => {
          if (tab === 'today') onGoToToday()
        }}
      />
    </div>
  )
}
