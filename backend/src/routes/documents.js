import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { toApiDoc, toDbRow, buildDbComment, mapCommentToApi } from '../lib/documents-mapper.js'
import { optionalAuth, requireAuth } from '../middleware/requireAuth.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { generateAiFeedback, formatScoreComment } from '../lib/aiFeedback.js'

// AI 자동 피드백: 문서 전체 총평을 담는 특수 코멘트의 sectionId.
const OVERALL_SECTION_ID = '__overall__'
// AI 자동 채점(챌린지 제출작): 총점·항목별·근거를 담는 특수 코멘트의 sectionId.
const SCORE_SECTION_ID = '__score__'
// 유저당 일일 AI 호출 제한(기획서 §3.4).
// 비용이 드는 건 "저장"이 아니라 "호출"이므로 발행 피드백과 미리보기를 합산해 센다.
const AI_DAILY_LIMIT = 10

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

// 최근 24시간 AI 호출 수를 세고, 한도를 넘었으면 true. 발행 피드백/미리보기 공통.
async function isAiLimitExceeded(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const logs = unwrap(
    await supabase
      .from('ai_feedback_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('called_at', since),
  )
  return logs.length >= AI_DAILY_LIMIT
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
// 초안(draft)은 절대 전체 공개하지 않는다. mine 파라미터와 무관하게 항상 소유자 스코프.
router.get('/', optionalAuth, async (req, res) => {
  const { status, mine } = req.query
  const orderColumn = status === 'draft' ? 'updated_at' : 'published_at'
  let query = supabase.from('documents').select('*').order(orderColumn, { ascending: false })

  // 초안은 남의 것을 볼 수 없다(비로그인이면 빈 목록). mine=true 도 동일하게 소유자 스코프.
  const ownerScoped = status === 'draft' || mine === 'true'
  if (ownerScoped) {
    if (!req.user) return res.json([])
    query = query.eq('author_id', req.user.id)
    if (status) query = query.eq('status', status)
  } else {
    // 공개 목록은 항상 발행분만. status를 생략해도 남의 초안이 섞이지 않게 강제한다.
    query = query.eq('status', 'published')
  }
  const rows = unwrap(await query)
  res.json(rows.map(toApiDoc))
})

// GET /api/documents/:id — 단건.
// 발행 문서는 누구나, 초안은 소유자(회원) 또는 올바른 수정 비밀번호(비회원)만.
router.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params
  const notFound = { error: '문서를 찾을 수 없어요.' }
  if (!UUID_RE.test(id)) return res.status(404).json(notFound)
  const rows = unwrap(await supabase.from('documents').select('*').eq('id', id).limit(1))
  if (rows.length === 0) return res.status(404).json(notFound)
  const row = rows[0]

  if (row.status === 'draft') {
    if (row.author_id) {
      // 회원 초안 — 소유자만. 존재 여부도 숨기려 404로 응답.
      if (!req.user || req.user.id !== row.author_id) return res.status(404).json(notFound)
    } else {
      // 비회원 초안 — 수정 비밀번호를 제시해야 열람 가능.
      const ok =
        row.edit_password_hash &&
        (await verifyPassword(readEditPassword(req) ?? '', row.edit_password_hash))
      if (!ok) return res.status(404).json(notFound)
    }
  }

  res.json(toApiDoc(row))
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
// 보안: is_ai 는 클라이언트 입력을 무시하고 항상 false(사람 코멘트의 AI 위장 차단),
// 작성자명도 클라이언트를 믿지 않고 서버가 결정한다.
router.post('/:id/comments', optionalAuth, async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const rows = unwrap(await supabase.from('documents').select('comments').eq('id', id).limit(1))
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })

  const author = req.user ? await resolveAuthorName(req.user) : '익명'
  const comment = buildDbComment({
    sectionId: req.body?.sectionId,
    content: req.body?.content,
    author,
    isAi: false,
  })
  const next = [...(rows[0].comments ?? []), comment]
  unwrap(await supabase.from('documents').update({ comments: next }).eq('id', id))
  res.status(201).json(mapCommentToApi(comment))
})

// POST /api/documents/:id/ai-feedback — 회원 전용. 섹션별 코멘트 + 전체 총평을 생성해 저장한다.
router.post('/:id/ai-feedback', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })

  if (await isAiLimitExceeded(req.user.id)) {
    return res
      .status(429)
      .json({ error: `AI 피드백은 하루 ${AI_DAILY_LIMIT}회까지 받을 수 있어요.` })
  }

  const rows = unwrap(
    await supabase.from('documents').select('author_id, sections, comments').eq('id', id).limit(1),
  )
  if (rows.length === 0) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const doc = rows[0]

  // AI 코멘트는 남의 문서에 붙일 수 없다(예시 문서는 author_id가 null이라 함께 거부된다).
  if (doc.author_id !== req.user.id) {
    return res.status(403).json({ error: '본인 문서에만 AI 피드백을 받을 수 있어요.' })
  }

  // 프론트가 보낸 섹션별 guide(그 섹션이 다뤄야 하는 것)를 sectionId로 매칭한다.
  // guide가 있어야 모델이 섹션 성격에 맞는 특화 피드백을 낸다(없으면 heading/content만으로 일반적).
  const guideById = new Map((req.body?.guides ?? []).map((g) => [g.sectionId, g.guide]))

  // sectionKey는 문서 섹션의 id를 그대로 쓴다(프론트가 sectionId로 매칭).
  const sections = (doc.sections ?? []).map((s) => ({
    key: s.id,
    heading: s.heading,
    content: s.content,
    fields: s.fields,
    guide: guideById.get(s.id),
  }))

  const feedback = await generateAiFeedback(sections, {
    title: req.body?.title,
    gameTag: req.body?.gameTag,
    templateName: req.body?.templateName,
    kind: req.body?.kind,
    // 장르 렌즈 — 그 장르에서 특히 봐야 할 관점으로 피드백·채점하게 한다.
    genreLens: req.body?.genreLens,
    // 챌린지 제출이면 채점 기준(rubric)을 실어 보내 자동 채점을 받는다.
    criteria: req.body?.criteria,
  })

  const aiComments = [
    ...feedback.sectionComments.map((c) =>
      buildDbComment({ sectionId: c.sectionKey, isAi: true, content: c.content }),
    ),
    buildDbComment({ sectionId: OVERALL_SECTION_ID, isAi: true, content: feedback.overall }),
  ]
  // 채점 결과가 있으면 "AI 채점" 특수 코멘트로 함께 저장하고, 총점은 정렬용 컬럼에.
  if (feedback.score) {
    aiComments.push(
      buildDbComment({
        sectionId: SCORE_SECTION_ID,
        isAi: true,
        content: formatScoreComment(feedback.score, req.body?.criteria),
      }),
    )
  }

  const nextComments = [...(doc.comments ?? []), ...aiComments]
  const hasScore = feedback.score && Number.isFinite(feedback.score.total)

  if (hasScore) {
    // ai_score 컬럼이 아직 없어도(마이그레이션 전) 피드백은 반드시 저장되게 방어한다.
    const { error } = await supabase
      .from('documents')
      .update({ comments: nextComments, ai_score: feedback.score.total })
      .eq('id', id)
    if (error) {
      unwrap(await supabase.from('documents').update({ comments: nextComments }).eq('id', id))
    }
  } else {
    unwrap(await supabase.from('documents').update({ comments: nextComments }).eq('id', id))
  }
  unwrap(await supabase.from('ai_feedback_logs').insert({ user_id: req.user.id, document_id: id }))

  res.status(201).json(aiComments.map(mapCommentToApi))
})

const REACTION_TYPES = ['like', 'bookmark']

// 문서의 좋아요/북마크 수를 세어 documents 캐시 컬럼에 반영하고 현재 수치를 돌려준다.
async function syncReactionCounts(docId) {
  const rows = unwrap(await supabase.from('reactions').select('type').eq('document_id', docId))
  const likes = rows.filter((r) => r.type === 'like').length
  const bookmarks = rows.filter((r) => r.type === 'bookmark').length
  unwrap(await supabase.from('documents').update({ likes, bookmarks }).eq('id', docId))
  return { likes, bookmarks }
}

// 로그인 사용자가 이 문서에 남긴 반응.
async function myReactions(userId, docId) {
  if (!userId) return { liked: false, bookmarked: false }
  const rows = unwrap(
    await supabase.from('reactions').select('type').eq('document_id', docId).eq('user_id', userId),
  )
  return {
    liked: rows.some((r) => r.type === 'like'),
    bookmarked: rows.some((r) => r.type === 'bookmark'),
  }
}

// GET /api/documents/:id/reactions — 현재 카운트 + 내 반응 여부
router.get('/:id/reactions', optionalAuth, async (req, res) => {
  const { id } = req.params
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  const rows = unwrap(await supabase.from('reactions').select('type').eq('document_id', id))
  res.json({
    likes: rows.filter((r) => r.type === 'like').length,
    bookmarks: rows.filter((r) => r.type === 'bookmark').length,
    ...(await myReactions(req.user?.id, id)),
  })
})

// POST /api/documents/:id/reactions — 회원 전용 토글(있으면 취소, 없으면 추가)
router.post('/:id/reactions', requireAuth, async (req, res) => {
  const { id } = req.params
  const { type } = req.body ?? {}
  if (!UUID_RE.test(id)) return res.status(404).json({ error: '문서를 찾을 수 없어요.' })
  if (!REACTION_TYPES.includes(type)) {
    return res.status(400).json({ error: '지원하지 않는 반응이에요.' })
  }

  const existing = unwrap(
    await supabase
      .from('reactions')
      .select('id')
      .eq('document_id', id)
      .eq('user_id', req.user.id)
      .eq('type', type),
  )
  if (existing.length > 0) {
    unwrap(await supabase.from('reactions').delete().eq('id', existing[0].id))
  } else {
    unwrap(await supabase.from('reactions').insert({ document_id: id, user_id: req.user.id, type }))
  }

  const counts = await syncReactionCounts(id)
  res.json({ ...counts, ...(await myReactions(req.user.id, id)) })
})

// POST /api/documents/ai-feedback/preview — 회원 전용. 저장하지 않는 AI 미리보기.
// 에디터에서 발행 전에 실제 Gemini 피드백을 보기 위한 것(DB·일일 제한 기록 안 함).
router.post('/ai-feedback/preview', requireAuth, async (req, res) => {
  const sections = (req.body?.sections ?? []).map((s) => ({
    key: s.key,
    heading: s.heading,
    content: s.content,
    fields: s.fields,
    guide: s.guide,
  }))
  if (sections.length === 0) return res.json([])

  // 저장은 안 하지만 Gemini는 실제로 호출되므로, 미리보기로 한도를 우회하지 못하게 같이 센다.
  if (await isAiLimitExceeded(req.user.id)) {
    return res.status(429).json({ error: `AI 호출은 하루 ${AI_DAILY_LIMIT}회까지 가능해요.` })
  }

  const feedback = await generateAiFeedback(sections, {
    title: req.body?.title,
    gameTag: req.body?.gameTag,
    templateName: req.body?.templateName,
    kind: req.body?.kind,
    genreLens: req.body?.genreLens,
  })
  unwrap(await supabase.from('ai_feedback_logs').insert({ user_id: req.user.id }))

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
