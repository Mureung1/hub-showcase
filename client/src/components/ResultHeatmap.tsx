import { slotKey, type ScheduleSlot } from 'shared'
import { formatDateLabel } from '../lib/formatDateLabel.ts'
import './ResultHeatmap.css'

type ResultHeatmapProps = {
  slots: ScheduleSlot[]
  levelMap: Map<string, number>
}

// claude: ScheduleGrid.tsx의 표 렌더링 뼈대(날짜/시간 축 추출, slotKey로 O(1) 조회)를 참고. 클릭/선택 상태가 없는 읽기 전용 컴포넌트라 별도로 작성.
function ResultHeatmap({ slots, levelMap }: ResultHeatmapProps) {
  const dates = [...new Set(slots.map((slot) => slot.date))].sort()
  const times = [...new Set(slots.map((slot) => slot.time))].sort()
  const slotSet = new Set(slots.map(slotKey))

  return (
    <div className="result-grid-wrapper">
      <table className="result-grid">
        <thead>
          <tr>
            <th className="result-grid__corner" />
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
                if (!slotSet.has(key)) return <td key={date} />

                const level = levelMap.get(key) ?? 0
                return (
                  <td key={date}>
                    <div className={`result-cell result-cell--heat-${level}`} />
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

export default ResultHeatmap
