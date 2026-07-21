const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const CHALLENGE_START_HOUR_MS = 7 * 60 * 60 * 1000

export function getKstChallengeDateString(now: Date = new Date()): string {
  const kstMs = now.getTime() + KST_OFFSET_MS - CHALLENGE_START_HOUR_MS
  const shifted = new Date(kstMs)

  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
