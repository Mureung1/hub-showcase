import { MISSION_TYPE_LABEL, MISSION_TYPE_ORDER } from '../../shared/domain/labels'
import BottomTabBar from '../../shared/ui/BottomTabBar/BottomTabBar'
import MissionCalendar from './components/MissionCalendar'
import MissionRecordList from './components/MissionRecordList'
import MonthNavigation from './components/MonthNavigation'
import type { CalendarState, RecordsState } from './types'
import './MyGgaem.css'

export type { CalendarState, RecordsState } from './types'

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
  const recordsLabel = selectedDate === today
    ? '오늘의 기록'
    : `${selectedDate.replaceAll('-', '.')} 기록`

  return (
    <div className="app-shell">
      <header className="myggaem-header">
        <h1>나의 깸</h1>
      </header>
      <main className="screen-main">
        <MonthNavigation
          displayMonth={displayMonth}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />
        <MissionCalendar
          displayMonth={displayMonth}
          selectedDate={selectedDate}
          today={today}
          state={calendarState}
          onSelectDate={onSelectDate}
        />
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
        <MissionRecordList state={recordsState} />
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
