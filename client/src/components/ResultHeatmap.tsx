import { slotKey, type ScheduleSlot } from 'shared'
import { formatDateLabel } from '../lib/formatDateLabel.ts'
import { usePagedDateRange } from '../lib/usePagedDateRange.ts'
import DatePaginationArrows from './DatePaginationArrows.tsx'
import ScreenHint from './ScreenHint.tsx'
import './ResultHeatmap.css'

type ResultHeatmapProps = {
  slots: ScheduleSlot[]
  levelMap: Map<string, number>
}

// claude: ScheduleGrid.tsx의 표 렌더링 뼈대(날짜/시간 축 추출, slotKey로 O(1) 조회)를 참고. 클릭/선택 상태가 없는 읽기 전용 컴포넌트라 별도로 작성.
// claude: 페이지네이션 훅은 ResultPage.tsx가 아니라 여기서 부른다 - ResultPage.tsx엔 로딩/에러/리다이렉트 조건부 return이
// 있어서 그 뒤에서 훅을 부르면 Hooks 규칙 위반이 되지만, ResultHeatmap은 그 return들을 다 통과한 뒤에만 마운트되므로 안전하다.
function ResultHeatmap({ slots, levelMap }: ResultHeatmapProps) { // study: levelMap 은 이미 계산 완료된 채로 넘어온다.
  const { visibleDates, canGoPrev, canGoNext, goPrev, goNext } = usePagedDateRange(slots)
  // claude: levelMap(색상 등급)은 이 컴포넌트가 안 건드리는 전체 slots 기준으로 이미 계산돼 있어서,
  // 페이지 단위로 렌더링만 필터링해도 등급 자체는 페이지와 무관하게 항상 유지된다.
  const pageSlots = slots.filter((slot) => visibleDates.includes(slot.date))

  const dates = [...new Set(pageSlots.map((slot) => slot.date))].sort()
  const times = [...new Set(pageSlots.map((slot) => slot.time))].sort()
  const slotSet = new Set(pageSlots.map(slotKey))

  return (
    <div className="page-stack transition-slide-up">
      <ScreenHint text={'색이 진할수록 더 많은 사람이 선호하는 시간대예요.\n칸을 클릭하면 상세 근거를 볼 수 있어요.'} />
      <DatePaginationArrows canGoPrev={canGoPrev} canGoNext={canGoNext} onPrev={goPrev} onNext={goNext} />
      <div className="result-grid-wrapper">
        <table className="result-grid">
          <thead>
            <tr>
              <th className="result-grid__corner" />
              {dates.map((date) => {
                const label = formatDateLabel(date) // claude: ScheduleGrid.tsx와 동일 - 좁은 칸에서 겹치지 않도록 괄호 앞에서 두 줄로 나눠 렌더링.
                const weekdayIndex = label.indexOf('(')
                return (
                  <th key={date}>
                    <span className="result-grid__date">{label.slice(0, weekdayIndex)}</span>
                    <span className="result-grid__weekday">{label.slice(weekdayIndex)}</span>
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
    </div>
  )
}

export default ResultHeatmap
