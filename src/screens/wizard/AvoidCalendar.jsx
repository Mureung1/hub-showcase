import { useState } from 'react'
import { toDateInputValue } from '../../utils/dates'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/* 기피 날짜 선택 캘린더 — 마감일은 빨간 표시, 기피 날짜는 회색 블럭.
   클릭 가능 범위: 내일 ~ 마감일 전날 (마감일이 정해져야 활성화) */
export default function AvoidCalendar({ deadline, avoidDates, onToggle }) {
  const today = new Date()
  const todayStr = toDateInputValue(today)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const firstWeekday = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function moveMonth(delta) {
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function dayToStr(day) {
    return toDateInputValue(new Date(view.year, view.month, day))
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => moveMonth(-1)} aria-label="이전 달">‹</button>
        <strong>{view.year}년 {view.month + 1}월</strong>
        <button type="button" className="cal-nav" onClick={() => moveMonth(1)} aria-label="다음 달">›</button>
      </div>

      <div className="cal-grid cal-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />

          const dateStr = dayToStr(day)
          const isDeadline = deadline && dateStr === deadline
          const selectable = deadline && dateStr > todayStr && dateStr < deadline
          const isAvoid = avoidDates.includes(dateStr)

          let cls = 'cal-day'
          if (isDeadline) cls += ' deadline'
          else if (isAvoid) cls += ' avoid'
          else if (!selectable) cls += ' off'
          if (dateStr === todayStr) cls += ' today'

          return (
            <button
              key={dateStr}
              type="button"
              className={cls}
              disabled={!selectable}
              onClick={() => onToggle(dateStr)}
              aria-pressed={isAvoid}
              aria-label={`${view.month + 1}월 ${day}일${isAvoid ? ' 기피 해제' : ' 기피 지정'}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        <span><i className="dot dot-deadline" /> 마감일</span>
        <span><i className="dot dot-avoid" /> 기피 날짜</span>
      </div>

      {!deadline && <p className="cal-hint">마감일을 먼저 선택하면 기피 날짜를 지정할 수 있어요.</p>}
    </div>
  )
}
