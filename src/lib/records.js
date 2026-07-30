// 날짜별 식사 기록 저장(F6, localStorage 기반). 유저별로 분리해서 저장한다.
//
// [현재 상태] 예전엔 Analyze.jsx가 저장 때마다 saveRecord()도 같이 불렀지만, 끼니 저장이 Supabase
// meals 테이블로 옮겨가며 그 호출부와 saveRecord() 자체를 제거했다(안정성 점검(Phase B), 죽은 export
// 정리) — 즉 이 파일의 실제 저장소(records:<userId>)는 더는 늘어나지 않는 읽기 전용 과거 데이터다.
// getAllRecords()는 Calendar.jsx가 옛 날짜 폴백으로만 계속 읽는다. toDateKey()만은 순수 날짜 포맷
// 함수라 지금도 여러 화면에서 범용으로 쓴다. 레거시 로컬 데이터 처리 방침은 csv.js 상단 주석 참고.
import { get } from './storage.js'

function storageKey(userId) {
  return `records:${userId}`
}

export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getAllRecords(userId) {
  if (!userId) return {}
  return get(storageKey(userId), {})
}

export function getRecord(userId, dateKey) {
  return getAllRecords(userId)[dateKey] || null
}
