import { getSummary, getMonthlyStats } from '../services/stats.service.js'

export function summary(req, res) {
  res.json(getSummary(req.sessionId))
}

export function monthly(req, res) {
  res.json({ months: getMonthlyStats(req.sessionId) })
}
