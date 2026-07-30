import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { hashPassword } from '../lib/password.js'

const fromMock = vi.fn()
const supabaseMock = { from: fromMock }
vi.mock('../lib/supabase.js', () => ({
  supabase: supabaseMock,
  requireSupabase: () => supabaseMock, // claude: requireSupabase 추출 후 라우트가 이걸 부르므로 mock에도 추가
}))
const { app } = await import('../app.js')

type QueryResult = { data: unknown; error: unknown; count?: number }

function createQueryBuilder(result: QueryResult) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  }
  return builder
}

describe('POST /api/appointments/:id/participants', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('필수값이 없으면 400과 필드별 에러를 반환한다', async () => {
    const res = await request(app).post('/api/appointments/appt-uuid/participants').send({})

    expect(res.status).toBe(400)
    expect(res.body.fields).toBeDefined()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('존재하지 않는 약속이면 404를 반환한다', async () => {
    fromMock.mockImplementationOnce(() => createQueryBuilder({ data: null, error: null }))

    const res = await request(app)
      .post('/api/appointments/no-such-id/participants')
      .send({ name: '신주하', password: '1234' })

    expect(res.status).toBe(404)
  })

  it('처음 보는 이름이면 신규 참여자를 생성하고 201을 반환한다', async () => {
    fromMock
      .mockImplementationOnce(() => createQueryBuilder({ data: { id: 'appt-uuid', headcount: 5 }, error: null }))
      .mockImplementationOnce(() => createQueryBuilder({ data: null, error: null }))
      .mockImplementationOnce(() => createQueryBuilder({ data: null, error: null, count: 1 }))
      .mockImplementationOnce(() => createQueryBuilder({ data: { id: 'new-participant-uuid' }, error: null }))

    const res = await request(app)
      .post('/api/appointments/appt-uuid/participants')
      .send({ name: '신규참여자', password: '1234' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ participantId: 'new-participant-uuid', role: 'participant' })
  })

  it('정원이 다 찼으면 409를 반환한다', async () => {
    fromMock
      .mockImplementationOnce(() => createQueryBuilder({ data: { id: 'appt-uuid', headcount: 5 }, error: null }))
      .mockImplementationOnce(() => createQueryBuilder({ data: null, error: null }))
      .mockImplementationOnce(() => createQueryBuilder({ data: null, error: null, count: 5 }))

    const res = await request(app)
      .post('/api/appointments/appt-uuid/participants')
      .send({ name: '늦게온사람', password: '1234' })

    expect(res.status).toBe(409)
  })

  it('정원이 찬 상태여도 기존 참여자 재접속은 막지 않는다', async () => {
    const passwordHash = await hashPassword('1234')
    fromMock
      .mockImplementationOnce(() => createQueryBuilder({ data: { id: 'appt-uuid', headcount: 5 }, error: null }))
      .mockImplementationOnce(() =>
        createQueryBuilder({
          data: { id: 'existing-participant-uuid', password_hash: passwordHash, role: 'participant' },
          error: null,
        }),
      )

    const res = await request(app)
      .post('/api/appointments/appt-uuid/participants')
      .send({ name: '기존참여자', password: '1234' })

    expect(res.status).toBe(200)
  })

  it('기존 이름+맞는 비밀번호면 재접속으로 200을 반환한다', async () => {
    const passwordHash = await hashPassword('1234')
    fromMock
      .mockImplementationOnce(() => createQueryBuilder({ data: { id: 'appt-uuid' }, error: null }))
      .mockImplementationOnce(() =>
        createQueryBuilder({
          data: { id: 'existing-participant-uuid', password_hash: passwordHash, role: 'participant' },
          error: null,
        }),
      )

    const res = await request(app)
      .post('/api/appointments/appt-uuid/participants')
      .send({ name: '기존참여자', password: '1234' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ participantId: 'existing-participant-uuid', role: 'participant' })
  })

  it('기존 이름인데 비밀번호가 틀리면 401을 반환한다', async () => {
    const passwordHash = await hashPassword('1234')
    fromMock
      .mockImplementationOnce(() => createQueryBuilder({ data: { id: 'appt-uuid' }, error: null }))
      .mockImplementationOnce(() =>
        createQueryBuilder({
          data: { id: 'existing-participant-uuid', password_hash: passwordHash, role: 'participant' },
          error: null,
        }),
      )

    const res = await request(app)
      .post('/api/appointments/appt-uuid/participants')
      .send({ name: '기존참여자', password: '9999' })

    expect(res.status).toBe(401)
  })
})
