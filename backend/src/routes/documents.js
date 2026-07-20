import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { toApiDoc, toDbRow, buildDbComment, mapCommentToApi } from '../lib/documents-mapper.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// supabase-js는 reject 하지 않고 { data, error } 를 준다. error면 던져서 에러 미들웨어로.
function unwrap({ data, error }) {
  if (error) {
    const e = new Error(error.message)
    e.status = error.code === '23514' ? 400 : 500 // 23514 = check constraint(publish_requires_tags)
    throw e
  }
  return data
}

// GET /api/documents?status=draft|published — 목록
router.get('/', async (req, res) => {
  const { status } = req.query
  // 초안은 published_at이 null이라 발행일 정렬이 무의미하다(순서가 사실상 무작위).
  // 초안 목록은 "최근 수정한 것부터"가 자연스러우므로 updated_at을 쓴다.
  const orderColumn = status === 'draft' ? 'updated_at' : 'published_at'
  let query = supabase.from('documents').select('*').order(orderColumn, { ascending: false })
  if (status) query = query.eq('status', status)
  const rows = unwrap(await query)
  res.json(rows.map(toApiDoc))
})

// GET /api/documents/:id — 단건(초안·발행 무관)
router.get('/:id', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const rows = unwrap(await supabase.from('documents').select('*').eq('id', id).limit(1))
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  res.json(toApiDoc(rows[0]))
})

// POST /api/documents — 생성(id 없는 신규 초안/발행). 서버가 uuid 발급.
router.post('/', async (req, res) => {
  const row = toDbRow(req.body)
  if (row.status === 'published') row.published_at = new Date().toISOString()
  const rows = unwrap(await supabase.from('documents').insert(row).select())
  res.status(201).json(toApiDoc(rows[0]))
})

// PATCH /api/documents/:id — 초안 수정 + 발행 status flip
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const row = toDbRow(req.body)
  if (row.status === 'published') row.published_at = new Date().toISOString()
  const rows = unwrap(await supabase.from('documents').update(row).eq('id', id).select())
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  res.json(toApiDoc(rows[0]))
})

// DELETE /api/documents/:id — 초안 삭제
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  unwrap(await supabase.from('documents').delete().eq('id', id))
  res.status(204).end()
})

// POST /api/documents/:id/comments — comments jsonb read-modify-write append
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const rows = unwrap(await supabase.from('documents').select('comments').eq('id', id).limit(1))
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const comment = buildDbComment(req.body)
  const next = [...(rows[0].comments ?? []), comment]
  unwrap(await supabase.from('documents').update({ comments: next }).eq('id', id))
  res.status(201).json(mapCommentToApi(comment))
})

export default router
