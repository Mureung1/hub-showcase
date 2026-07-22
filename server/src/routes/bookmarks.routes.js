import { Router } from 'express'
import { db } from '../db/connection.js'
import { supabaseAdmin } from '../db/supabaseAdmin.js'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'
import { evaluateJob } from '../services/gapAnalysisService.js'
import { validateGapAnalysisRequest } from '../services/gapAnalysisValidation.js'

export const bookmarksRouter = Router()

bookmarksRouter.use(requireSupabaseAuth)

const selectJobById = db.prepare('SELECT * FROM jobs WHERE job_id = ?')

async function fetchBookmarkedIds(userId) {
  const { data, error } = await supabaseAdmin.from('bookmarks').select('job_id').eq('user_id', userId)
  if (error) throw Object.assign(new Error('북마크 목록을 불러오지 못했습니다.'), { status: 500 })
  return data.map((row) => Number.parseInt(row.job_id, 10))
}

function selectJobsByIds(ids) {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  return db.prepare(`SELECT * FROM jobs WHERE job_id IN (${placeholders})`).all(...ids)
}

// bookmarks.job_id(Supabase, text)는 jobs.job_id(로컬 SQLite, integer)를 가리키지만 DB가 분리돼 있어
// 진짜 FK를 걸 수 없다 — insert 전에 로컬 SQLite에서 존재 여부를 먼저 확인한다.
bookmarksRouter.post('/bookmarks', async (req, res) => {
  const jobId = Number.parseInt(req.body?.job_id, 10)
  if (!Number.isInteger(jobId)) {
    res.status(400).json({ error: 'job_id가 올바르지 않습니다.' })
    return
  }

  const job = selectJobById.get(jobId)
  if (!job) {
    res.status(404).json({ error: '존재하지 않는 공고입니다.' })
    return
  }

  const { error } = await supabaseAdmin
    .from('bookmarks')
    .upsert({ user_id: req.userId, job_id: String(jobId) }, { onConflict: 'user_id,job_id' })
  if (error) {
    res.status(500).json({ error: '북마크 추가에 실패했습니다.' })
    return
  }

  res.status(201).json(job)
})

bookmarksRouter.delete('/bookmarks/:job_id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('bookmarks')
    .delete()
    .eq('user_id', req.userId)
    .eq('job_id', req.params.job_id)
  if (error) {
    res.status(500).json({ error: '북마크 삭제에 실패했습니다.' })
    return
  }

  res.status(204).end()
})

bookmarksRouter.get('/bookmarks', async (req, res) => {
  const ids = await fetchBookmarkedIds(req.userId)
  res.status(200).json(selectJobsByIds(ids))
})

// 북마크한 공고를 "북마크했을 때의 스펙"이 아니라 "지금 저장된 최신 스펙" 기준으로 재평가한다 —
// evaluateJob은 gapAnalysisService.js의 runGapAnalysis가 쓰는 것과 동일한 함수라, 결과 화면과
// 완전히 같은 모양({ job, checks, overallMatch })을 돌려주므로 FE는 기존 buildJobDisplay를 그대로 재사용할 수 있다.
bookmarksRouter.post('/bookmarks/evaluate', async (req, res) => {
  validateGapAnalysisRequest({ filters: null, spec: req.body?.spec })

  const ids = await fetchBookmarkedIds(req.userId)
  const jobs = selectJobsByIds(ids)
  const jobList = jobs.map((job) => evaluateJob(job, req.body.spec))
  res.status(200).json({ jobList })
})
