import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { supabase } from '../lib/supabase.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { toDbRow } from '../lib/documents-mapper.js'

vi.mock('../lib/supabase.js', async () => {
  const { createSupabaseMock } = await import('../test/supabase-mock.js')
  return { supabase: createSupabaseMock() }
})

const UUID = '2444efbb-a170-4581-964f-e013255880ed'

beforeEach(() => {
  supabase.query.result = { data: [], error: null }
  supabase.query.results = []
  supabase.query.calls = []
  // 기본은 비로그인(토큰 없음/무효).
  supabase.auth.getUser = async () => ({ data: { user: null }, error: null })
})

describe('password 해시 유틸', () => {
  it('올바른 비밀번호는 통과하고 틀린 비밀번호는 실패한다', async () => {
    const stored = await hashPassword('hunter2')
    expect(await verifyPassword('hunter2', stored)).toBe(true)
    expect(await verifyPassword('wrong', stored)).toBe(false)
  })
})

describe('POST /api/documents/:id/verify-edit', () => {
  it('비밀번호가 맞으면 ok를 준다', async () => {
    const hash = await hashPassword('secret')
    supabase.query.result = { data: [{ author_id: null, edit_password_hash: hash }], error: null }

    const res = await request(app)
      .post(`/api/documents/${UUID}/verify-edit`)
      .send({ editPassword: 'secret' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('비밀번호가 틀리면 403을 준다', async () => {
    const hash = await hashPassword('secret')
    supabase.query.result = { data: [{ author_id: null, edit_password_hash: hash }], error: null }

    const res = await request(app)
      .post(`/api/documents/${UUID}/verify-edit`)
      .send({ editPassword: 'nope' })

    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/documents/:id 수정 권한 게이트', () => {
  it('비회원 문서에 비밀번호 없이 수정하면 403', async () => {
    const hash = await hashPassword('secret')
    supabase.query.result = { data: [{ author_id: null, edit_password_hash: hash }], error: null }

    const res = await request(app).patch(`/api/documents/${UUID}`).send({ title: '수정' })

    expect(res.status).toBe(403)
  })

  it('회원 문서를 로그인 없이 수정하면 401', async () => {
    supabase.query.result = {
      data: [{ author_id: 'owner-uuid', edit_password_hash: null }],
      error: null,
    }

    const res = await request(app).patch(`/api/documents/${UUID}`).send({ title: '수정' })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/documents/:id/ai-feedback 인증', () => {
  it('로그인하지 않으면 401을 준다', async () => {
    const res = await request(app).post(`/api/documents/${UUID}/ai-feedback`).send({})
    expect(res.status).toBe(401)
  })

  it('남의 문서에는 AI 코멘트를 붙일 수 없다 (403)', async () => {
    supabase.auth.getUser = async () => ({ data: { user: { id: 'me' } }, error: null })
    supabase.query.results = [
      { data: [], error: null }, // 1) ai_feedback_logs — 한도 미달
      { data: [{ author_id: '남', sections: [], comments: [] }], error: null }, // 2) 문서
    ]

    const res = await request(app)
      .post(`/api/documents/${UUID}/ai-feedback`)
      .set('Authorization', 'Bearer token')
      .send({})

    expect(res.status).toBe(403)
  })
})

describe('초안 열람 권한 (남의 초안 유출 방지)', () => {
  it('목록: 비로그인 상태의 status=draft 는 빈 배열', async () => {
    // 초안이 DB에 있어도 소유자 스코프가 아니면 내보내지 않는다.
    supabase.query.result = { data: [{ id: UUID, status: 'draft' }], error: null }

    const res = await request(app).get('/api/documents?status=draft')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('목록: status 없이 호출해도 발행분만 조회한다', async () => {
    // status를 생략하면 예전에는 필터가 아예 없어 전원의 초안이 그대로 나갔다.
    supabase.query.result = { data: [], error: null }

    const res = await request(app).get('/api/documents')

    expect(res.status).toBe(200)
    expect(supabase.query.calls).toContainEqual(['eq', 'status', 'published'])
  })

  it('단건: 남의 회원 초안은 404로 숨긴다', async () => {
    supabase.query.result = {
      data: [{ id: UUID, status: 'draft', author_id: 'someone-else', sections: [], comments: [] }],
      error: null,
    }

    const res = await request(app).get(`/api/documents/${UUID}`)

    expect(res.status).toBe(404)
  })

  it('단건: 비회원 초안은 비밀번호가 맞아야 열린다', async () => {
    const hash = await hashPassword('secret')
    supabase.query.result = {
      data: [
        {
          id: UUID,
          status: 'draft',
          author_id: null,
          edit_password_hash: hash,
          sections: [],
          comments: [],
        },
      ],
      error: null,
    }

    const denied = await request(app).get(`/api/documents/${UUID}`)
    expect(denied.status).toBe(404)

    const allowed = await request(app)
      .get(`/api/documents/${UUID}`)
      .set('x-edit-password', 'secret')
    expect(allowed.status).toBe(200)
  })

  it('단건: 발행 문서는 누구나 열람 가능', async () => {
    supabase.query.result = {
      data: [{ id: UUID, status: 'published', author_id: 'someone', sections: [], comments: [] }],
      error: null,
    }

    const res = await request(app).get(`/api/documents/${UUID}`)

    expect(res.status).toBe(200)
  })
})

describe('toDbRow 신뢰 경계 (재발행 시 코멘트·카운트 삭제 방지)', () => {
  it('클라이언트가 보낸 comments·likes·bookmarks 는 무시한다', async () => {
    const row = toDbRow({
      title: '제목',
      comments: [], // 재발행 payload가 이걸 보내면 기존 코멘트가 통째로 지워졌었다
      likes: 999,
      bookmarks: 999,
    })

    expect(row.title).toBe('제목')
    expect(row).not.toHaveProperty('comments')
    expect(row).not.toHaveProperty('likes')
    expect(row).not.toHaveProperty('bookmarks')
  })

  it('섹션의 guideKey 는 보존한다 (이어쓰기·AI 재요청용)', async () => {
    const row = toDbRow({ sections: [{ id: 's1', guideKey: 'goal', heading: 'H', content: 'C' }] })
    expect(row.sections[0].guide_key).toBe('goal')
  })
})

describe('POST /api/documents/:id/comments 보안', () => {
  it('클라이언트가 isAi=true 를 보내도 사람 코멘트로 저장한다', async () => {
    supabase.query.result = { data: [{ comments: [] }], error: null }

    const res = await request(app)
      .post(`/api/documents/${UUID}/comments`)
      .send({ sectionId: 'sec-1', content: 'AI인 척', isAi: true, author: '관리자' })

    expect(res.status).toBe(201)
    expect(res.body.isAi).toBe(false)
    // 작성자명도 클라이언트 입력을 쓰지 않는다(비로그인 → 익명).
    expect(res.body.author).toBe('익명')
  })
})
