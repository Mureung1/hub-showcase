export type Role = 'admin' | 'participant'

function storageKey(appointmentId: string) {
  return `hub-role-${appointmentId}`
}

// Day1 뼈대 단계라 실제 로그인/세션 검증 없이 localStorage로만 role을 흉내낸다.
// Day3(약속 참여 및 재접속 기능)에서 진짜 세션 로직으로 교체될 임시 스텁이다.
export function getRole(appointmentId: string): Role | null {
  const value = localStorage.getItem(storageKey(appointmentId))
  return value === 'admin' || value === 'participant' ? value : null
}

export function setRole(appointmentId: string, role: Role) {
  localStorage.setItem(storageKey(appointmentId), role)
}
