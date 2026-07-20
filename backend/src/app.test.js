import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from './app.js'
import { supabase } from './lib/supabase.js'

// 실 Supabase를 타지 않도록 클라이언트를 통째로 스텁으로 바꾼다.
vi.mock('./lib/supabase.js', async () => {
  const { createSupabaseMock } = await import('./test/supabase-mock.js')
  return { supabase: createSupabaseMock() }
})

beforeEach(() => {
  supabase.query.result = { data: [], error: null }
  supabase.query.calls = []
})

describe('GET /api/health', () => {
  it('DB 조회가 성공하면 db: ok 를 돌려준다', async () => {
    supabase.query.result = { data: [], error: null }

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' })
  })

  it('DB 조회가 실패하면 db: error 를 돌려준다', async () => {
    supabase.query.result = { data: null, error: { message: 'boom' } }

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.db).toBe('error')
  })
})

describe('GET /api/documents/:id', () => {
  it('uuid 형식이 아니면 DB를 조회하지 않고 404를 준다', async () => {
    const res = await request(app).get('/api/documents/doc-genshin-gacha')

    expect(res.status).toBe(404)
    // uuid 가드가 DB 조회 전에 막아야 한다
    expect(supabase.query.calls).toHaveLength(0)
  })

  it('해당 uuid 문서가 없으면 404를 준다', async () => {
    supabase.query.result = { data: [], error: null }

    const res = await request(app).get('/api/documents/2444efbb-a170-4581-964f-e013255880ed')

    expect(res.status).toBe(404)
  })
})
