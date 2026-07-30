import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const fromMock = vi.fn()
const rpcMock = vi.fn()
const supabaseMock = { from: fromMock, rpc: rpcMock }
vi.mock('../lib/supabase.js', () => ({
  supabase: supabaseMock,
  requireSupabase: () => supabaseMock,
}))
const { app } = await import('../app.js')

type QueryResult = { data: unknown; error: unknown }

function createQueryBuilder(result: QueryResult) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  }
  return builder
}

const openAppointmentRow = {
  date_start: '2026-07-20',
  date_end: '2026-07-21',
  time_start: '09:00:00',
  time_end: '18:00:00',
  closed_at: null,
}
const closedAppointmentRow = { ...openAppointmentRow, closed_at: '2026-07-20T12:00:00.000Z' }

// claude: 집계는 이제 DB 함수(RPC)가 하므로, responses 원본 행이 아니라 rpc가 돌려주는 "이미 집계된 결과"를 mock한다.
// fn 이름별로 다른 응답을 준다. (get_slot_counts / get_completed_count / get_participants_status)
function mockRpc(overrides: Record<string, QueryResult>) {
  rpcMock.mockImplementation((fn: string) => {
    if (fn in overrides) return Promise.resolve(overrides[fn])
    throw new Error(`unexpected rpc: ${fn}`)
  })
}

function mockAppointment(result: QueryResult) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'appointments') return createQueryBuilder(result)
    throw new Error(`unexpected table: ${table}`)
  })
}

describe('GET /api/appointments/:id/results', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
  })

  it('마감된 약속이면 슬롯별 가능/선호 인원을 집계해서 반환한다', async () => {
    mockAppointment({ data: closedAppointmentRow, error: null })
    // Postgres time은 "09:00:00"으로 직렬화되고, 서버가 "09:00"으로 정규화해 응답하는지까지 확인한다.
    mockRpc({
      get_slot_counts: {
        data: [
          { date: '2026-07-20', time: '09:00:00', availableCount: 2, preferredCount: 1 },
          { date: '2026-07-20', time: '09:30:00', availableCount: 1, preferredCount: 0 },
        ],
        error: null,
      },
    })

    const res = await request(app).get('/api/appointments/appt-uuid/results')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      slots: [
        { date: '2026-07-20', time: '09:00', availableCount: 2, preferredCount: 1 },
        { date: '2026-07-20', time: '09:30', availableCount: 1, preferredCount: 0 },
      ],
    })
  })

  it('응답이 없으면 빈 슬롯 배열을 반환한다', async () => {
    mockAppointment({ data: closedAppointmentRow, error: null })
    mockRpc({ get_slot_counts: { data: [], error: null } })

    const res = await request(app).get('/api/appointments/appt-uuid/results')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ slots: [] })
  })

  it('마감 전이면 409를 반환한다', async () => {
    mockAppointment({ data: openAppointmentRow, error: null })

    const res = await request(app).get('/api/appointments/appt-uuid/results')

    expect(res.status).toBe(409)
  })

  it('집계 RPC가 오류면 500을 반환한다', async () => {
    mockAppointment({ data: closedAppointmentRow, error: null })
    mockRpc({ get_slot_counts: { data: null, error: { message: 'boom' } } })

    const res = await request(app).get('/api/appointments/appt-uuid/results')

    expect(res.status).toBe(500)
  })
})

describe('GET /api/appointments/:id/response-status', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
  })

  it('응답을 남긴 참여자 수를 반환한다', async () => {
    mockRpc({ get_completed_count: { data: 1, error: null } })

    const res = await request(app).get('/api/appointments/appt-uuid/response-status')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ completedCount: 1 })
  })

  it('응답이 없으면 0을 반환한다', async () => {
    mockRpc({ get_completed_count: { data: 0, error: null } })

    const res = await request(app).get('/api/appointments/appt-uuid/response-status')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ completedCount: 0 })
  })

  it('집계 RPC가 오류면 500을 반환한다', async () => {
    mockRpc({ get_completed_count: { data: null, error: { message: 'boom' } } })

    const res = await request(app).get('/api/appointments/appt-uuid/response-status')

    expect(res.status).toBe(500)
  })
})

describe('GET /api/appointments/:id/participants', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
  })

  it('참여자별 완료 여부 목록을 반환한다', async () => {
    mockRpc({
      get_participants_status: {
        data: [
          { id: 'p1', name: '참여자A', completed: true },
          { id: 'p2', name: '참여자B', completed: false },
        ],
        error: null,
      },
    })

    const res = await request(app).get('/api/appointments/appt-uuid/participants')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      participants: [
        { id: 'p1', name: '참여자A', completed: true },
        { id: 'p2', name: '참여자B', completed: false },
      ],
    })
  })

  it('집계 RPC가 오류면 500을 반환한다', async () => {
    mockRpc({ get_participants_status: { data: null, error: { message: 'boom' } } })

    const res = await request(app).get('/api/appointments/appt-uuid/participants')

    expect(res.status).toBe(500)
  })
})

describe('PUT /api/appointments/:id/participants/:participantId/close', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
  })

  const url = '/api/appointments/appt-uuid/participants/participant-uuid/close'

  it('관리자가 호출하면 마감 시각을 저장하고 반환한다', async () => {
    // claude: 마감 전 조회(1번째 appointments 호출)와 update 직후 재조회(2번째 호출)가 서로 다른 값을 돌려줘야 해서, 호출 순서별로 다르게 응답하도록 구성한다.
    let appointmentsCallCount = 0
    fromMock.mockImplementation((table: string) => {
      if (table === 'participants') return createQueryBuilder({ data: { role: 'admin' }, error: null })
      if (table === 'appointments') {
        appointmentsCallCount += 1
        return createQueryBuilder({ data: appointmentsCallCount === 1 ? openAppointmentRow : closedAppointmentRow, error: null })
      }
      throw new Error(`unexpected table: ${table}`)
    })

    const res = await request(app).put(url)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ closedAt: closedAppointmentRow.closed_at })
  })

  it('관리자가 아니면 403을 반환한다', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'participants') return createQueryBuilder({ data: { role: 'participant' }, error: null })
      throw new Error(`unexpected table: ${table}`)
    })

    const res = await request(app).put(url)

    expect(res.status).toBe(403)
  })

  it('참여자를 찾을 수 없으면 404를 반환한다', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'participants') return createQueryBuilder({ data: null, error: null })
      throw new Error(`unexpected table: ${table}`)
    })

    const res = await request(app).put(url)

    expect(res.status).toBe(404)
  })

  it('이미 마감된 상태면 기존 closedAt을 그대로 반환한다(멱등)', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'participants') return createQueryBuilder({ data: { role: 'admin' }, error: null })
      if (table === 'appointments') return createQueryBuilder({ data: closedAppointmentRow, error: null })
      throw new Error(`unexpected table: ${table}`)
    })

    const res = await request(app).put(url)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ closedAt: closedAppointmentRow.closed_at })
  })
})
