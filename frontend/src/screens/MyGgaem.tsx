import type { MissionRecordCalendarDay, MissionRecordListItem, MissionType } from '../api/types'
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

const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  question: '질문',
  rebuttal: '반박',
  connection: '연결',
  expression: '표현',
}

const URL_STATUS_NOTICE: Record<'paywalled' | 'broken' | 'removed', string> = {
  paywalled: '유료 콘텐츠라 이 앱에서 바로 열 수 없어요.',
  broken: '원문 링크에 문제가 생겼어요.',
  removed: '원문이 삭제됐어요.',
}

function formatMonthTitle(displayMonth: string): string {
  return displayMonth.replace('-', '.')
}

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

  return (
    <div className="app-shell">
      <header className="screen-header">
        <h1>나의 깸</h1>
      </header>

      <main className="screen-main">
        <section className="card myggaem-calendar-card">
          <div className="myggaem-calendar-nav">
            <button
              type="button"
              className="myggaem-month-nav-btn"
              aria-label="이전 달"
              onClick={() => onPrevMonth()}
            >
              ‹
            </button>
            <p className="myggaem-calendar-title">{formatMonthTitle(displayMonth)}</p>
            <button
              type="button"
              className="myggaem-month-nav-btn"
              aria-label="다음 달"
              onClick={() => onNextMonth()}
            >
              ›
            </button>
          </div>

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
            <div role="alert">
              <p>{calendarState.message}</p>
              <button type="button" className="btn-primary" onClick={calendarState.onRetry}>
                다시 시도
              </button>
            </div>
          )}
          {calendarState.status === 'success' && calendarState.days.length === 0 && (
            <p className="myggaem-empty-month">이 달에는 기록이 없어요.</p>
          )}
        </section>

        <p className="myggaem-records-label">{formatDateLabel(selectedDate)} 기록</p>

        {recordsState.status === 'loading' && <p role="status">기록을 불러오고 있어요...</p>}
        {recordsState.status === 'error' && (
          <div role="alert">
            <p>{recordsState.message}</p>
            <button type="button" className="btn-primary" onClick={recordsState.onRetry}>
              다시 시도
            </button>
          </div>
        )}
        {recordsState.status === 'success' && recordsState.items.length === 0 && (
          <p>이 날짜에는 기록이 없어요.</p>
        )}

        {recordsState.status === 'success' && (
          <section className="myggaem-records">
            {recordsState.items.map((item) => (
              <article key={item.id} className="card myggaem-record-card">
                <div className="myggaem-record-card-header">
                  <span className="myggaem-mission-type">
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

      <footer className="screen-footer">
        <nav className="bottom-tabbar">
          <button type="button" className="bottom-tab" onClick={() => onGoToToday()}>
            <BookIcon />
            오늘의 글
          </button>
          <button
            type="button"
            className="bottom-tab bottom-tab--active"
            aria-current="page"
          >
            <LogIcon />
            나의 깸
          </button>
        </nav>
      </footer>
    </div>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 6.5c3-1.5 6-1.5 8 0 2-1.5 5-1.5 8 0v12c-3-1.5-6-1.5-8 0-2-1.5-5-1.5-8 0v-12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 4v16M5 8h4M5 12h4M5 16h4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}
