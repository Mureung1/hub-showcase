import { slotKey, type ScheduleSlot } from 'shared'
import { formatDateLabel } from '../lib/formatDateLabel.ts'
import './ScheduleGrid.css'

type ScheduleGridProps = {
  slots: ScheduleSlot[]
  selectedKeys: Set<string>
  variant: 'available' | 'preferred'
  onToggle: (slot: ScheduleSlot) => void
  // claude: 지정하지 않으면 slots 전부 클릭 가능(1단계). 지정하면 이 키에 없는 슬롯은 회색으로 비활성화(2단계 — 1단계에서 고르지 않은 칸은 선호로 못 고르게).
  eligibleKeys?: Set<string>
}

function ScheduleGrid({ slots, selectedKeys, variant, onToggle, eligibleKeys }: ScheduleGridProps) {
  const dates = [...new Set(slots.map((slot) => slot.date))].sort() // study: slot에서 날짜 뽑아내는데, 시간은 다르지만 날짜는 같은 slot들 때문에 중복이 나올 것이라, set으로 중복 제거, 이후 배열로 만들고 정렬. 이때 날짜/시간 문자열은 항상 형식이 맞춰져 있으므로, 시간 순으로 정렬됨.
  const times = [...new Set(slots.map((slot) => slot.time))].sort()
  const slotMap = new Map(slots.map((slot) => [slotKey(slot), slot])) // study: key = 문자열, value = {date:"2026-07-20", time:"09:00"} 같은 객체

  return (
    <div className="schedule-grid-wrapper">
      <table className="schedule-grid">
        <thead>
          <tr>
            <th className="schedule-grid__corner" />
            {dates.map((date) => {
              const label = formatDateLabel(date) // claude: "7/21(화)" 형태 - 좁은 칸에서 겹치지 않도록 괄호 앞에서 두 줄로 나눠 렌더링.
              const weekdayIndex = label.indexOf('(')
              return (
                <th key={date}>
                  <span className="schedule-grid__date">{label.slice(0, weekdayIndex)}</span>
                  <span className="schedule-grid__weekday">{label.slice(weekdayIndex)}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time}>
              <th scope="row">{time}</th>
              {dates.map((date) => {
                const key = `${date}T${time}`
                const slot = slotMap.get(key)
                if (!slot) return <td key={date} />

                const eligible = !eligibleKeys || eligibleKeys.has(key)
                const selected = eligible && selectedKeys.has(key)
                // claude: 2단계(preferred)에서 "가능하지만 아직 선호로 선택 안 한" 칸은 회색이 아니라
                // 1단계에서 칠했던 연한 파랑(available 스타일)을 그대로 유지 - 선택하면 진한 파랑(preferred)으로 전환.
                const modifier = selected ? variant : variant === 'preferred' && eligible ? 'available' : ''
                return (
                  <td key={date}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={!eligible}
                      className={`schedule-cell${modifier ? ` schedule-cell--${modifier}` : ''}`}
                      onClick={() => onToggle(slot)}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ScheduleGrid
