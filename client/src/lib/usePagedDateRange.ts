import { useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import type { ScheduleSlot } from 'shared'

const PAGE_DAYS = 7

// claude: 일정 입력(ScheduleEditor)/결과 화면(ResultHeatmap) 공용 7일 페이지네이션 훅.
// study: dateStart/dateEnd 문자열 대신 slots를 받는 이유 = 두 화면 모두 이미 candidateSlots를 갖고 있어서 
// 그걸 그대로 넘겨서 날짜 구할 때 쓰면 되고, dateStart/dateEnd 를 위한 훅(useScheduleResponse/useScheduleResult)을 굳이 추가적으로 안 건드려도 된다.
export function usePagedDateRange(slots: ScheduleSlot[]) {
  const sortedDates = [...new Set(slots.map((slot) => slot.date))].sort()
  const firstDate = sortedDates[0] ?? ''
  const lastDate = sortedDates[sortedDates.length - 1] ?? ''

  const [pageStartDate, setPageStartDate] = useState(firstDate)

  // claude: slots는 호출하는 쪽(useScheduleResponse/useScheduleResult)이 매 렌더링마다 새로 생성해서
  // 배열 참조가 매번 바뀔 수 있다 - 그래서 slots 자체가 아니라 firstDate/lastDate 문자열을 의존성으로 둔다.
  // 둘 중 하나라도 실제로 바뀌면 첫 페이지로 되돌린다.
  useEffect(() => {
    setPageStartDate(firstDate)
  }, [firstDate, lastDate])

  const pageEndDate = pageStartDate ? format(addDays(parseISO(pageStartDate), PAGE_DAYS - 1), 'yyyy-MM-dd') : ''

  const visibleDates = sortedDates.filter((date) => date >= pageStartDate && date <= pageEndDate) // study: 범위로 필터링 하기 때문에, 7일보다 부족한 경우에 대한 별도 분기 처리가 필요없음.

  // study: 화살표 활성화 여부. 
  const canGoPrev = pageStartDate > firstDate 
  const canGoNext = pageEndDate < lastDate

  // study: 이동 함수. 
  const goPrev = () => {
    if (!canGoPrev) return
    setPageStartDate(format(addDays(parseISO(pageStartDate), -PAGE_DAYS), 'yyyy-MM-dd'))
  }

  const goNext = () => {
    if (!canGoNext) return
    setPageStartDate(format(addDays(parseISO(pageStartDate), PAGE_DAYS), 'yyyy-MM-dd'))
  }

  return { visibleDates, canGoPrev, canGoNext, goPrev, goNext }
}
