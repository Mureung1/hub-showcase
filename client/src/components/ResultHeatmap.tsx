import { useState } from 'react'
import { slotKey, type ScheduleSlot, type SlotResult } from 'shared'
import { formatDateLabel } from '../lib/formatDateLabel.ts'
import { usePagedDateRange } from '../lib/usePagedDateRange.ts'
import DatePaginationArrows from './DatePaginationArrows.tsx'
import ScreenHint from './ScreenHint.tsx'
import Modal from './Modal.tsx'
import './ResultHeatmap.css'

type ResultHeatmapProps = {
  slots: ScheduleSlot[]
  levelMap: Map<string, number>
  resultMap: Map<string, SlotResult>
}

// claude: ScheduleGrid.tsx의 표 렌더링 뼈대(날짜/시간 축 추출, slotKey로 O(1) 조회)를 참고. 클릭/선택 상태가 없는 읽기 전용 컴포넌트라 별도로 작성.
// claude: 페이지네이션 훅은 ResultPage.tsx가 아니라 여기서 부른다 - ResultPage.tsx엔 로딩/에러/리다이렉트 조건부 return이
// 있어서 그 뒤에서 훅을 부르면 Hooks 규칙 위반이 되지만, ResultHeatmap은 그 return들을 다 통과한 뒤에만 마운트되므로 안전하다.
// claude: resultMap도 추가로 받는다 - 클릭한 셀의 가능/선호 인원수를 조회하는 용도(아래 selectedResult).
function ResultHeatmap({ slots, levelMap, resultMap }: ResultHeatmapProps) { // study: levelMap 은 이미 계산 완료된 채로 넘어온다.
  const { visibleDates, canGoPrev, canGoNext, goPrev, goNext } = usePagedDateRange(slots)
  // claude: levelMap(색상 등급)은 이 컴포넌트가 안 건드리는 전체 slots 기준으로 이미 계산돼 있어서,
  // 페이지 단위로 렌더링만 필터링해도 등급 자체는 페이지와 무관하게 항상 유지된다.
  const pageSlots = slots.filter((slot) => visibleDates.includes(slot.date))

  const dates = [...new Set(pageSlots.map((slot) => slot.date))].sort()
  const times = [...new Set(pageSlots.map((slot) => slot.time))].sort()
  const slotSet = new Set(pageSlots.map(slotKey))

  // claude: 클릭한 슬롯의 date/time만 state로 저장하고, 모달 내용은 그때그때 resultMap에서 다시 조회한다.
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const selectedResult = selectedSlot ? resultMap.get(slotKey(selectedSlot)) : null

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
                  // claude: 응답이 아예 없는 칸(resultMap에 없음)은 클릭해도 볼 근거가 없으므로 비활성화.
                  const hasResponses = resultMap.has(key)
                  const dateLabel = formatDateLabel(date)
                  return (
                    <td key={date}>
                      <button
                        type="button"
                        className={`result-cell result-cell--heat-${level}`}
                        disabled={!hasResponses}
                        onClick={() => setSelectedSlot({ date, time })}
                        aria-label={`${dateLabel} ${time} 상세보기`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={selectedSlot !== null} onClose={() => setSelectedSlot(null)}>
        {selectedSlot && selectedResult && (
          <>
            <strong>
              {formatDateLabel(selectedSlot.date)} {selectedSlot.time}
            </strong>
            {/* claude: ScheduleEditor.tsx의 확정 모달과 동일한 방식 - availableCount는 선호까지 포함한 값이라
                그대로 나란히 보여주면 선호로 뽑힌 인원이 가능/선호 양쪽에 중복 집계된 것처럼 보인다.
                선호가 아닌 가능 인원만 "가능"으로 보여줘서 두 숫자가 겹치지 않게 한다. */}
            <p>
              가능 {selectedResult.availableCount - selectedResult.preferredCount}명 · 선호{' '}
              {selectedResult.preferredCount}명
            </p>
            {/* claude: "선호는 가능에 포함된다"는 걸 추상적인 문장 대신, 바로 위에 보이는 실제 숫자로 다시 풀어서
                설명한다 - 방금 본 숫자와 바로 연결되니 더 직관적이다. */}
            <ScreenHint
              text={`총 ${selectedResult.availableCount}명이 가능하다고 했고, 그중 ${selectedResult.preferredCount}명은 선호까지 표시했어요.`}
            />
            <button type="button" onClick={() => setSelectedSlot(null)}>
              닫기
            </button>
          </>
        )}
      </Modal>
    </div>
  )
}

export default ResultHeatmap
