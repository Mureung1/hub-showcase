export function buildAppointmentLink(appointmentId: string): string {
  return `${window.location.origin}/a/${appointmentId}`
}

export function parseAppointmentId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const match = trimmed.match(/\/a\/([^/?#]+)/)
  return match ? match[1] : null
}
