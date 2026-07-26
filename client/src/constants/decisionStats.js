import { SENTIMENT_META } from "./sentiment.js"

export function isHit(decision, marketSentiment) {
  if (!marketSentiment) return null
  return SENTIMENT_META[marketSentiment]?.tone === decision
}

function toResult(decision, marketSentiment) {
  const hit = isHit(decision, marketSentiment)
  if (hit === null) return "none"
  return hit ? "hit" : "miss"
}

function computeRatePercent(items) {
  const judged = items.filter((item) => item.marketSentiment)
  if (judged.length === 0) return null
  const hitCount = judged.filter((item) => isHit(item.decision, item.marketSentiment)).length
  return Math.round((hitCount / judged.length) * 100)
}

export function computeRecentAccuracy(decisions, limit = 10) {
  const recent = decisions.slice(0, limit)
  const judged = recent.filter((item) => item.marketSentiment)
  const hitCount = judged.filter((item) => isHit(item.decision, item.marketSentiment)).length
  const ratePercent = judged.length === 0 ? null : Math.round((hitCount / judged.length) * 100)
  const blocks = [...recent].reverse().map((item) => ({
    id: item.id,
    result: toResult(item.decision, item.marketSentiment),
    createdAt: item.createdAt,
  }))
  return { total: recent.length, hitCount, ratePercent, blocks }
}

export function groupDecisionsByMonth(decisions) {
  const groups = []
  const indexByKey = new Map()

  for (const item of decisions) {
    const date = new Date(item.createdAt)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (!indexByKey.has(monthKey)) {
      indexByKey.set(monthKey, groups.length)
      groups.push({ monthKey, monthLabel: `${date.getMonth() + 1}월`, items: [], ratePercent: null })
    }
    groups[indexByKey.get(monthKey)].items.push(item)
  }

  for (const group of groups) {
    group.ratePercent = computeRatePercent(group.items)
  }

  return groups
}
