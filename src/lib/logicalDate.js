// FR-16 — 퀘스트 로테이션을 "자정"이 아니라 "오전 4시"에 리셋하기 위한 논리적 하루/주 계산.
// resetHour 이전(예: 새벽 3시)은 아직 "어제/지난주"로 취급한다. 실제 서버 크론은 없으므로, 이 함수는
// 순수하게 현재 시각에서 resetHour만큼 앞당긴 뒤 기존 toDateKey(records.js, 로컬 타임존 Y-M-D)로
// 날짜 키를 뽑는 방식으로 구현한다 — 클라이언트가 언제 호출하든 같은 결과가 나온다.
import { toDateKey } from './records.js'

export function logicalDateKey(date = new Date(), resetHour = 4) {
  return toDateKey(new Date(date.getTime() - resetHour * 60 * 60 * 1000))
}

// 그 논리적 하루가 속한 주의 월요일 날짜를 주 식별자로 쓴다. 리셋이 정확히 "매주 월요일 오전 4시"가
// 되는 이유는 logicalDateKey 자체가 이미 4시 이전을 전날로 넘겨주기 때문 — 월요일 오전 4시 이전이면
// shifted 시각이 일요일이 되어 지난주 월요일이 그대로 주 식별자로 유지된다.
export function logicalWeekKey(date = new Date(), resetHour = 4) {
  const shifted = new Date(date.getTime() - resetHour * 60 * 60 * 1000)
  const day = shifted.getDay() // 0=일 1=월 ... 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(shifted)
  monday.setDate(shifted.getDate() + diffToMonday)
  return toDateKey(monday)
}
