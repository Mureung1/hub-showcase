import { getSummary, getMonthlyStats } from '../services/stats.service.js'
import { getOrGenerateInsight } from '../services/insight.service.js'

export async function summary(req, res) {
  res.json(await getSummary(req.sessionId))
}

export async function monthly(req, res) {
  res.json({ months: await getMonthlyStats(req.sessionId) })
}

export async function insight(req, res) {
  const text = await getOrGenerateInsight(req.sessionId)
  res.json({ insight: text })
}
