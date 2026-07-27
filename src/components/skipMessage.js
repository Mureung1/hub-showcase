import { KOREAN_DAY_LABEL } from '@/lib/dayLabels'

// 재배치/기록 두 갈래의 정적 템플릿 문구만 만든다.
// API 응답(reassigned, fromDayOfWeek, toDayOfWeek)의 값만 문장에 꽂아 넣고, 자유 텍스트를 렌더링하지 않는다.
export function buildSkipMessage({ reassigned, fromDayOfWeek, toDayOfWeek }) {
  if (reassigned) {
    return `이번 주 세션이 밀려서 ${KOREAN_DAY_LABEL[fromDayOfWeek]}요일 루틴을 ${KOREAN_DAY_LABEL[toDayOfWeek]}요일로 옮겼습니다.`
  }
  return '쉬어가는 것도 계획의 일부예요. 내일 루틴은 그대로 유지됩니다.'
}
