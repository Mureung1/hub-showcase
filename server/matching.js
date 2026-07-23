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
