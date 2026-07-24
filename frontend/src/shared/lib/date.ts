function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function getKstDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function shiftMonth(displayMonth: string, delta: number): string {
  const [year, month] = displayMonth.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}`
}

function lastDayOfMonth(targetMonth: string): number {
  const [year, month] = targetMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function moveDateToMonth(date: string, targetMonth: string): string {
  const day = Number(date.split('-')[2])
  const clampedDay = Math.min(day, lastDayOfMonth(targetMonth))
  return `${targetMonth}-${pad2(clampedDay)}`
}
