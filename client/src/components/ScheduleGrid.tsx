import { parseISO } from 'date-fns'
import { slotKey, type ScheduleSlot } from 'shared'
import './ScheduleGrid.css'

type ScheduleGridProps = {
  slots: ScheduleSlot[]
  selectedKeys: Set<string>
  variant: 'available' | 'preferred'
  onToggle: (slot: ScheduleSlot) => void
  // claude: 지정하지 않으면 slots 전부 클릭 가능(1단계). 지정하면 이 키에 없는 슬롯은 회색으로 비활성화(2단계 — 1단계에서 고르지 않은 칸은 선호로 못 고르게).
  eligibleKeys?: Set<string>
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

// study: 템플릿 문자열로 "7/20(월)" 같은 글자 완성해서 return. 
function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}(${weekdayLabels[date.getDay()]})`
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
            {dates.map((date) => (
              <th key={date}>{formatDateLabel(date)}</th>
            ))}
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
                return (
                  <td key={date}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={!eligible}
                      className={`schedule-cell${selected ? ` schedule-cell--${variant}` : ''}`}
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
