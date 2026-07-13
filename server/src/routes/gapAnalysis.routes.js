import { Router } from 'express'
import { db } from '../db/connection.js'
import { runGapAnalysis } from '../services/gapAnalysisService.js'

export const gapAnalysisRouter = Router()

const insertAnalysis = db.prepare(`
  INSERT INTO analysis_results (filter_json, spec_json, stats_json, job_list_json)
  VALUES (@filter_json, @spec_json, @stats_json, @job_list_json)
`)

const selectAnalysisById = db.prepare('SELECT * FROM analysis_results WHERE id = ?')

function deserializeAnalysis(row) {
  return {
    id: row.id,
    created_at: row.created_at,
    filters: row.filter_json ? JSON.parse(row.filter_json) : null,
    spec: JSON.parse(row.spec_json),
    stats: JSON.parse(row.stats_json),
    jobList: JSON.parse(row.job_list_json),
  }
}

gapAnalysisRouter.post('/gap-analysis', (req, res) => {
  const { filters, spec } = req.body

  const jobs = db.prepare('SELECT * FROM jobs').all()
  const { stats, jobList } = runGapAnalysis(jobs, filters, spec)

  const info = insertAnalysis.run({
    filter_json: filters ? JSON.stringify(filters) : null,
    spec_json: JSON.stringify(spec),
    stats_json: JSON.stringify(stats),
    job_list_json: JSON.stringify(jobList),
  })

  const row = selectAnalysisById.get(info.lastInsertRowid)
  res.status(201).json(deserializeAnalysis(row))
})

gapAnalysisRouter.get('/gap-analysis/:id', (req, res) => {
  const row = selectAnalysisById.get(req.params.id)
  if (!row) {
    res.status(404).json({ error: '분석 결과를 찾을 수 없습니다.' })
    return
  }
  res.status(200).json(deserializeAnalysis(row))
})
