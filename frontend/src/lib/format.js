// 프로토타입에서 추출된 고정 표기값 (extracted-source.md §4, §5)
export const SERIAL_NO = 'BR-2024-0512'
export const POOL_COUNT = '1,428'
export const WAIT_SECS_INITIAL = 24 * 60 * 60 // 24시간

/** 초 단위 카운트다운을 HH:MM:SS 로 표기 (prototype fmt()) */
export function fmt(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

/** 편지 상단 메타에 쓰이는 날짜 표기 (ko-KR long) */
export function dateStr(date = new Date()) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export function charCount(text) {
  return text.length
}
