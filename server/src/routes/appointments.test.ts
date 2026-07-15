import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const fromMock = vi.fn()
// study: supabase.js를 mock으로 바꿔치기.
vi.mock('../lib/supabase.js', () => ({
  supabase: { from: fromMock },
}))
// study: 위에서 먼저 바꿔치기 했으므로, 이제 app에서 supabase 를 import 할 때 mock 를 불러옴(순서 중요)
const { app } = await import('../app.js')

type QueryResult = { data: unknown; error: unknown }

function createQueryBuilder(result: QueryResult) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  }
  return builder
}

const validBody = {
  title: '팀 회의',
  dateStart: '2026-07-20',
  dateEnd: '2026-07-21',
  timeStart: '09:00',
  timeEnd: '18:00',
  headcount: 3,
  creatorName: '신주하',
  adminPassword: '1234',
}

// study: 테스트 시작. 각 CASE 별로 호출.
describe('POST /api/appointments', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('필수값이 없으면 400과 필드별 에러를 반환한다', async () => {
    const res = await request(app).post('/api/appointments').send({})

    expect(res.status).toBe(400)
    expect(res.body.fields).toBeDefined()
    expect(res.body.fields.title).toBeTruthy()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('유효한 요청이면 약속과 관리자 참가자를 생성하고 201을 반환한다', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'appointments') {
        return createQueryBuilder({ data: { id: 'appt-uuid' }, error: null })
      }
      if (table === 'participants') {
        return createQueryBuilder({ data: null, error: null })
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const res = await request(app).post('/api/appointments').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ appointmentId: 'appt-uuid' })
    expect(fromMock).toHaveBeenCalledWith('appointments')
    expect(fromMock).toHaveBeenCalledWith('participants')
  })
})
