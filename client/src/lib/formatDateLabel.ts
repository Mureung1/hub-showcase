import { parseISO } from 'date-fns'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

// study: 템플릿 문자열로 "7/20(월)" 같은 글자 완성해서 return.
export function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}(${weekdayLabels[date.getDay()]})`
}
