import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { supabase } from '../lib/supabase.js'
import { hashPassword, verifyPassword } from '../lib/password.js'

vi.mock('../lib/supabase.js', async () => {
  const { createSupabaseMock } = await import('../test/supabase-mock.js')
  return { supabase: createSupabaseMock() }
})

const UUID = '2444efbb-a170-4581-964f-e013255880ed'

beforeEach(() => {
  supabase.query.result = { data: [], error: null }
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
})
