import { getSummary, getMonthlyStats } from '../services/stats.service.js'
import { getOrGenerateInsight } from '../services/insight.service.js'

export function summary(req, res) {
  res.json(getSummary(req.sessionId))
}

export function monthly(req, res) {
  res.json({ months: getMonthlyStats(req.sessionId) })
}

export async function insight(req, res) {
  const text = await getOrGenerateInsight(req.sessionId)
  res.json({ insight: text })
}
