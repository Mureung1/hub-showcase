import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { toApiDoc, toDbRow, buildDbComment, mapCommentToApi } from '../lib/documents-mapper.js'
import { optionalAuth, requireAuth } from '../middleware/requireAuth.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { generateAiFeedback } from '../lib/aiFeedback.js'

// AI 자동 피드백: 문서 전체 총평을 담는 특수 코멘트의 sectionId.
const OVERALL_SECTION_ID = '__overall__'
// 유저당 일일 AI 피드백 호출 제한(기획서 §3.4).
const AI_DAILY_LIMIT = 5

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

// 회원 문서의 작성자 표시명: profiles.nickname → user_metadata.name → 이메일 앞부분 순.
async function resolveAuthorName(user) {
  const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).limit(1)
  const nickname = data?.[0]?.nickname
  if (nickname) return nickname
  return user.user_metadata?.name ?? user.email?.split('@')[0] ?? '익명'
}

// 요청에서 수정 비밀번호를 꺼낸다(body 또는 헤더). DELETE는 body가 애매하므로 헤더도 허용.
function readEditPassword(req) {
  return req.body?.editPassword ?? req.headers['x-edit-password'] ?? null
}

// 수정/삭제 권한 확인: 회원 문서는 소유자만, 비회원 문서는 올바른 비밀번호만.
// 통과하면 null, 실패하면 { status, error } 를 돌려준다.
async function authorizeEdit(req, id) {
  const rows = unwrap(
    await supabase.from('documents').select('author_id, edit_password_hash').eq('id', id).limit(1),
  )
  if (rows.length === 0) return { status: 404, error: '문서를 찾을 수 없어요.' }
  const { author_id, edit_password_hash } = rows[0]

  if (author_id) {
    // 회원 문서 — 로그인 + 소유자 일치 필요.
    if (!req.user) return { status: 401, error: '로그인이 필요해요.' }
    if (req.user.id !== author_id) return { status: 403, error: '본인 문서만 수정할 수 있어요.' }
    return null
  }

  // 비회원 문서 — 수정 비밀번호 일치 필요.
  if (!edit_password_hash) return { status: 403, error: '이 문서는 수정할 수 없어요.' }
  const ok = await verifyPassword(readEditPassword(req) ?? '', edit_password_hash)
  if (!ok) return { status: 403, error: '비밀번호가 일치하지 않아요.' }
  return null
}

// GET /api/documents?status=draft|published&mine=true — 목록
router.get('/', optionalAuth, async (req, res) => {
  const { status, mine } = req.query
  const orderColumn = status === 'draft' ? 'updated_at' : 'published_at'
  let query = supabase.from('documents').select('*').order(orderColumn, { ascending: false })
  if (status) query = query.eq('status', status)
  // mine=true 는 로그인 사용자의 문서만(초안 포함). 비로그인이면 빈 목록.
  if (mine === 'true') {
    if (!req.user) return res.json([])
    query = query.eq('author_id', req.user.id)
  }
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

// POST /api/documents — 생성. 로그인 시 회원 문서(author_id), 아니면 비회원 문서(수정 비번).
router.post('/', optionalAuth, async (req, res) => {
  const row = toDbRow(req.body)
  if (req.user) {
    // 회원 문서 — 서버가 소유자를 주입한다(클라 author_id 는 신뢰하지 않음).
    row.author_id = req.user.id
    row.author_name = await resolveAuthorName(req.user)
  } else if (req.body.editPassword) {
    // 비회원 문서 — 수정용 비밀번호를 해시해 저장.
    row.edit_password_hash = await hashPassword(req.body.editPassword)
  }
  if (row.status === 'published') row.published_at = new Date().toISOString()
  const rows = unwrap(await supabase.from('documents').insert(row).select())
  res.status(201).json(toApiDoc(rows[0]))
})

// PATCH /api/documents/:id — 초안 수정 + 발행 status flip
router.patch('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const denied = await authorizeEdit(req, id)
  if (denied) return res.status(denied.status).json({ error: denied.error })

  const row = toDbRow(req.body)
  if (row.status === 'published') row.published_at = new Date().toISOString()
  const rows = unwrap(await supabase.from('documents').update(row).eq('id', id).select())
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  res.json(toApiDoc(rows[0]))
})

// DELETE /api/documents/:id — 초안/문서 삭제
router.delete('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const denied = await authorizeEdit(req, id)
  if (denied) return res.status(denied.status).json({ error: denied.error })

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

// POST /api/documents/:id/ai-feedback — 회원 전용. 섹션별 코멘트 + 전체 총평을 생성해 저장한다.
router.post('/:id/ai-feedback', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })

  // 일일 호출 제한 확인(최근 24시간).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const logs = unwrap(
    await supabase
      .from('ai_feedback_logs')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('called_at', since),
  )
  if (logs.length >= AI_DAILY_LIMIT) {
    return res
      .status(429)
      .json({ error: `AI 피드백은 하루 ${AI_DAILY_LIMIT}회까지 받을 수 있어요.` })
  }

  const rows = unwrap(
    await supabase.from('documents').select('sections, comments').eq('id', id).limit(1),
  )
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const doc = rows[0]

  // 프론트가 보낸 섹션별 guide(그 섹션이 다뤄야 하는 것)를 sectionId로 매칭한다.
  // guide가 있어야 모델이 섹션 성격에 맞는 특화 피드백을 낸다(없으면 heading/content만으로 일반적).
  const guideById = new Map((req.body?.guides ?? []).map((g) => [g.sectionId, g.guide]))

  // sectionKey는 문서 섹션의 id를 그대로 쓴다(프론트가 sectionId로 매칭).
  const sections = (doc.sections ?? []).map((s) => ({
    key: s.id,
    heading: s.heading,
    content: s.content,
    guide: guideById.get(s.id),
  }))

  const feedback = await generateAiFeedback(sections, {
    title: req.body?.title,
    gameTag: req.body?.gameTag,
    templateName: req.body?.templateName,
  })

  const aiComments = [
    ...feedback.sectionComments.map((c) =>
      buildDbComment({ sectionId: c.sectionKey, isAi: true, content: c.content }),
    ),
    buildDbComment({ sectionId: OVERALL_SECTION_ID, isAi: true, content: feedback.overall }),
  ]

  const nextComments = [...(doc.comments ?? []), ...aiComments]
  unwrap(await supabase.from('documents').update({ comments: nextComments }).eq('id', id))
  unwrap(await supabase.from('ai_feedback_logs').insert({ user_id: req.user.id, document_id: id }))

  res.status(201).json(aiComments.map(mapCommentToApi))
})

// POST /api/documents/ai-feedback/preview — 회원 전용. 저장하지 않는 AI 미리보기.
// 에디터에서 발행 전에 실제 Gemini 피드백을 보기 위한 것(DB·일일 제한 기록 안 함).
router.post('/ai-feedback/preview', requireAuth, async (req, res) => {
  const sections = (req.body?.sections ?? []).map((s) => ({
    key: s.key,
    heading: s.heading,
    content: s.content,
    guide: s.guide,
  }))
  if (sections.length === 0) return res.json([])
  const feedback = await generateAiFeedback(sections, {
    title: req.body?.title,
    gameTag: req.body?.gameTag,
    templateName: req.body?.templateName,
  })
  // 에디터 handleAiFeedback가 기대하는 [{sectionKey, content}] 형태로 반환.
  res.json(feedback.sectionComments)
})

// POST /api/documents/:id/verify-edit — 비회원 문서 수정 비밀번호 확인(잠금 해제 모달용).
router.post('/:id/verify-edit', async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const rows = unwrap(
    await supabase.from('documents').select('author_id, edit_password_hash').eq('id', id).limit(1),
  )
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const { author_id, edit_password_hash } = rows[0]
  if (author_id || !edit_password_hash) {
    return res.status(400).json({ error: '이 문서는 비밀번호로 수정하는 문서가 아니에요.' })
  }
  const ok = await verifyPassword(req.body?.editPassword ?? '', edit_password_hash)
  if (!ok) return res.status(403).json({ error: '비밀번호가 일치하지 않아요.' })
  res.json({ ok: true })
})

export default router
export { requireAuth }
