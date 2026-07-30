import './TimeRangeSlider.css'

type TimeRangeSliderProps = {
  startValue: string
  endValue: string
  onChange: (start: string, end: string) => void
}

const STEP_COUNT = 48 // 하루 24시간을 30분 단위로 나눈 슬롯 수

function stepToTime(step: number): string {
  const minutes = step * 30
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// claude: 00:00~24:00(30분 단위) 옵션 목록 — <select>라 모바일에서 OS 자체 휠/드롭다운 피커가 뜬다.
const OPTIONS = Array.from({ length: STEP_COUNT + 1 }, (_, i) => stepToTime(i))

function TimeRangeSlider({ startValue, endValue, onChange }: TimeRangeSliderProps) {
  return (
    <div className="time-range-select">
      <div className="time-range-select__field">
        <span className="time-range-select__caption">시작</span>
        <select value={startValue} onChange={(e) => onChange(e.target.value, endValue)}>
          {OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>
      <span className="time-range-select__tilde" aria-hidden="true">
        ~
      </span>
      <div className="time-range-select__field">
        <span className="time-range-select__caption">종료</span>
        <select value={endValue} onChange={(e) => onChange(startValue, e.target.value)}>
          {OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default TimeRangeSlider
