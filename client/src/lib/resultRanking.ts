import { slotKey, type SlotResult } from 'shared'

export const HEAT_LEVELS = 5
// study: 순위 계산 함수.
// claude: availableCount desc -> 동률이면 preferredCount desc로 정렬해 고유 조합마다 순위를 매기고, 그 "순위 위치"를 1~HEAT_LEVELS 등급으로 환산한다(값의 절대 비율이 아니라 순위 기준). 동률(같은 조합)은 항상 같은 등급.
export function rankSlots(slots: SlotResult[]): Map<string, number> {
  const groupKeyOf = (slot: SlotResult) => `${slot.availableCount}:${slot.preferredCount}`

  const uniqueGroups = [...new Set(slots.map(groupKeyOf))]
    .map((key) => {
      const [availableCount, preferredCount] = key.split(':').map(Number)
      return { key, availableCount, preferredCount }
    })
    .sort((a, b) => b.availableCount - a.availableCount || b.preferredCount - a.preferredCount)

  const levelByGroupKey = new Map<string, number>()
  uniqueGroups.forEach((group, index) => {
    const level =
      uniqueGroups.length === 1
        ? HEAT_LEVELS
        : HEAT_LEVELS - Math.round((index / (uniqueGroups.length - 1)) * (HEAT_LEVELS - 1))
    levelByGroupKey.set(group.key, level)
  })

  const levelBySlotKey = new Map<string, number>()
  for (const slot of slots) {
    levelBySlotKey.set(slotKey(slot), levelByGroupKey.get(groupKeyOf(slot)) ?? 1)
  }

  return levelBySlotKey
}
