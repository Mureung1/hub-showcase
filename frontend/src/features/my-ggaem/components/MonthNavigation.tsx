type MonthParts = { year: number; month: number }

type MonthNavigationProps = {
  displayMonth: string
  onPrevMonth: () => void
  onNextMonth: () => void
}

function shiftMonthParts(displayMonth: string, delta: number): MonthParts {
  const [year, month] = displayMonth.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

function monthPartsFromDisplayMonth(displayMonth: string): MonthParts {
  const [year, month] = displayMonth.split('-').map(Number)
  return { year, month }
}

export default function MonthNavigation({
  displayMonth,
  onPrevMonth,
  onNextMonth,
}: MonthNavigationProps) {
  const prevMonth = shiftMonthParts(displayMonth, -1)
  const currentMonth = monthPartsFromDisplayMonth(displayMonth)
  const nextMonth = shiftMonthParts(displayMonth, 1)

  return (
    <div className="myggaem-month-pills" role="group" aria-label="표시 월 이동">
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
  )
}
