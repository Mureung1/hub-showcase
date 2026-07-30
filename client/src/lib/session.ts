import type { Role } from 'shared'

export type Session = {
  participantId: string
  role: Role
}

function storageKey(appointmentId: string) {
  return `hub-session-${appointmentId}`
}

export function getSession(appointmentId: string): Session | null {
  const raw = localStorage.getItem(storageKey(appointmentId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.participantId === 'string' && (parsed.role === 'admin' || parsed.role === 'participant')) {
      return { participantId: parsed.participantId, role: parsed.role }
    }
  } catch {
    // 저장된 값이 JSON이 아니면 무시하고 null 처리
  }
  return null
}

export function setSession(appointmentId: string, session: Session) {
  localStorage.setItem(storageKey(appointmentId), JSON.stringify(session))
}
