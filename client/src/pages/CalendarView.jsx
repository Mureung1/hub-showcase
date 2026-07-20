import { useState } from 'react'
import { buildMonthGrid, toDateKey } from '../utils/calendar'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function CalendarView({ checkins, onSelectCheckin }) {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const byDay = new Map()
  for (const checkin of checkins) {
    const key = toDateKey(checkin.createdAt)
    if (!byDay.has(key)) {
      byDay.set(key, [])
    }
    byDay.get(key).push(checkin)
  }

  function moveMonth(offset) {
    setCursor(({ year, month }) => {
      const moved = new Date(year, month + offset, 1)
      return { year: moved.getFullYear(), month: moved.getMonth() }
    })
  }

  const cells = buildMonthGrid(cursor.year, cursor.month)
  const todayKey = toDateKey(today)

  return (
    <div className="calendar-panel">
      <div className="cal-head">
        <button className="cal-nav" type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">‹</button>
        <span className="month">{cursor.year}년 {cursor.month + 1}월</span>
        <button className="cal-nav" type="button" onClick={() => moveMonth(1)} aria-label="다음 달">›</button>
      </div>
      <div className="cal-grid">
        {DAY_NAMES.map((name) => (
          <div className="cal-dow" key={name}>{name}</div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) {
            return <div className="cal-day empty" key={`empty-${index}`} />
          }

          const dayCheckins = byDay.get(cell.dateKey) || []
          const isToday = cell.dateKey === todayKey

          if (dayCheckins.length === 0) {
            return (
              <div className={`cal-day${isToday ? ' today' : ''}`} key={cell.dateKey}>
                {cell.day}
              </div>
            )
          }

          // 같은 날 기록이 여러 개면 가장 최근 것을 연다 (목록이 최신순이라 [0])
          const latest = dayCheckins[0]

          return (
            <button
              className={`cal-day has-record${isToday ? ' today' : ''}`}
              type="button"
              key={cell.dateKey}
              onClick={() => onSelectCheckin(latest)}
            >
              {cell.day}
              {latest.mood
                ? <span className="cal-mood" aria-hidden="true">{latest.mood}</span>
                : <span className="cal-dot" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarView
