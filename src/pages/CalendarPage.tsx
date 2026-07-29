import { useEffect, useState } from 'react'
import { resolveImageUrl } from '../api/client.ts'
import { getRecordsByMonth } from '../api/records.ts'
import type { MonthRecord } from '../api/records.ts'
import Layout from '../components/Layout.tsx'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [records, setRecords] = useState<MonthRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    setSelectedDate(null)
    getRecordsByMonth(year, month)
      .then(setRecords)
      .catch(() => setRecords([]))
  }, [year, month])

  function goToPrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayString = toDateString(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  const selectedRecord = selectedDate ? recordsByDate.get(selectedDate) : undefined

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <Layout title="캘린더">
      <div className="mb-3.5 flex items-center justify-between">
        <button aria-label="이전 달" className="px-2.5 py-1 text-lg text-muted" onClick={goToPrevMonth} type="button">
          ‹
        </button>
        <span className="text-[15px] font-semibold text-heading">
          {year}년 {month}월
        </span>
        <button aria-label="다음 달" className="px-2.5 py-1 text-lg text-muted" onClick={goToNextMonth} type="button">
          ›
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (day === null) {
            return <div className="aspect-square" key={`empty-${index}`} />
          }

          const dateString = toDateString(year, month, day)
          const record = recordsByDate.get(dateString)
          const isToday = dateString === todayString

          return (
            <button
              className={`relative aspect-square overflow-hidden rounded-[10px] border text-xs ${
                record ? 'border-transparent bg-cover bg-center' : 'border-border bg-card text-muted'
              } ${isToday ? 'outline outline-2 -outline-offset-2 outline-accent' : ''}`}
              key={dateString}
              onClick={() => record && setSelectedDate(dateString)}
              style={record ? { backgroundImage: `url(${resolveImageUrl(record.imageUrl)})` } : undefined}
              type="button"
            >
              {record ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-1.5 py-1 text-[11px] font-semibold text-white">
                  {day}
                </span>
              ) : (
                day
              )}
            </button>
          )
        })}
      </div>

      {selectedRecord ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] text-muted">{selectedRecord.date}</p>
          <img
            alt="기록 사진"
            className="mt-2 w-full rounded-xl border border-border object-cover"
            src={resolveImageUrl(selectedRecord.imageUrl)}
          />
          <p className="mt-3 text-sm text-heading">{selectedRecord.memo}</p>
        </section>
      ) : (
        <p className="mt-4 rounded-[10px] bg-accent-bg px-3 py-2.5 text-xs text-muted">
          기록한 날에만 썸네일이 표시돼요. 본인의 기록만 볼 수 있어요.
        </p>
      )}
    </Layout>
  )
}

export default CalendarPage
