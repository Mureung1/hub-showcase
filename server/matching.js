export function passesGenderFilter(me, candidate) {
  const requiresMatch = me.genderOnly || candidate.genderOnly
  if (!requiresMatch) return true

  if (me.gender === 'unknown' || candidate.gender === 'unknown') return false

  return me.gender === candidate.gender
}

function arrivalMinutes(estimate) {
  const match = /\d+/.exec(estimate ?? '')
  return match ? Number(match[0]) : Infinity
}

export function sortByArrivalPriority(rows) {
  return [...rows].sort((a, b) => arrivalMinutes(a.arrival_estimate) - arrivalMinutes(b.arrival_estimate))
}

const ACTIVE_THRESHOLD_MINUTES = 2

export function describeActivity(lastSeenAt, now = new Date()) {
  if (!lastSeenAt) {
    return { isActive: false, label: '활동 정보 없음' }
  }

  const diffMinutes = Math.floor((now - new Date(lastSeenAt)) / 60000)

  if (diffMinutes <= ACTIVE_THRESHOLD_MINUTES) {
    return { isActive: true, label: '활동중' }
  }

  return { isActive: false, label: `${diffMinutes}분 전 활동` }
}

const STALE_THRESHOLD_MINUTES = 120

// 마지막 활동(하트비트) 이후 일정 시간이 지난 방은 후보 목록에서 제외하기 위한 판단 함수
export function isRoomStale(lastSeenAt, now = new Date(), thresholdMinutes = STALE_THRESHOLD_MINUTES) {
  if (!lastSeenAt) return false

  const diffMinutes = (now - new Date(lastSeenAt)) / 60000
  return diffMinutes > thresholdMinutes
}

const BOARDING_GRACE_MINUTES = 5

export function classifyBoarding(desiredTime, referenceDate, boardedAt) {
  const [hours, minutes, seconds] = desiredTime.split(':').map(Number)
  const scheduled = new Date(referenceDate)
  scheduled.setUTCHours(hours, minutes, seconds ?? 0, 0)

  const diffMinutes = Math.round((boardedAt - scheduled) / 60000)

  if (diffMinutes <= BOARDING_GRACE_MINUTES) {
    return { status: 'on_time', minutesLate: Math.max(0, diffMinutes) }
  }

  return { status: 'late', minutesLate: diffMinutes }
}
