import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { getKstDateString, moveDateToMonth, shiftMonth } from '../../shared/lib/date'
import MyGgaem, { type CalendarState, type RecordsState } from './MyGgaem'

export default function MyGgaemContainer({ onGoToToday }: { onGoToToday: () => void }) {
  const [todayDate] = useState(() => getKstDateString())
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const displayMonth = selectedDate.slice(0, 7)
  const [calendarState, setCalendarState] = useState<CalendarState>({ status: 'loading' })
  const [recordsState, setRecordsState] = useState<RecordsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadCalendar() {
      setCalendarState({ status: 'loading' })
      try {
        const response = await api.getMissionRecordsCalendar(displayMonth)
        if (cancelled) return
        setCalendarState({ status: 'success', days: response.days })
      } catch {
        if (cancelled) return
        setCalendarState({
          status: 'error',
          message: '달력을 불러오지 못했어요.',
          onRetry: loadCalendar,
        })
      }
    }

    loadCalendar()
    return () => {
      cancelled = true
    }
  }, [displayMonth])

  useEffect(() => {
    let cancelled = false

    async function loadRecords() {
      setRecordsState({ status: 'loading' })
      try {
        const items = await api.getMissionRecords(selectedDate)
        if (cancelled) return
        setRecordsState({ status: 'success', items })
      } catch {
        if (cancelled) return
        setRecordsState({
          status: 'error',
          message: '기록을 불러오지 못했어요.',
          onRetry: loadRecords,
        })
      }
    }

    loadRecords()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  return (
    <MyGgaem
      displayMonth={displayMonth}
      selectedDate={selectedDate}
      today={todayDate}
      calendarState={calendarState}
      recordsState={recordsState}
      onPrevMonth={() => setSelectedDate(moveDateToMonth(selectedDate, shiftMonth(displayMonth, -1)))}
      onNextMonth={() => setSelectedDate(moveDateToMonth(selectedDate, shiftMonth(displayMonth, 1)))}
      onSelectDate={setSelectedDate}
      onGoToToday={onGoToToday}
    />
  )
}
