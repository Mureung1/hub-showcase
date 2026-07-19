import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const fromMock = vi.fn()
const supabaseMock = { from: fromMock }
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
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  }
  return builder
}

const appointmentRow = {
  date_start: '2026-07-20',
  date_end: '2026-07-21',
  time_start: '09:00:00',
  time_end: '10:00:00',
  closed_at: null,
}

function mockTables(overrides: { participants?: QueryResult; appointments?: QueryResult; responses?: QueryResult }) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'participants') {
      return createQueryBuilder(overrides.participants ?? { data: { id: 'participant-uuid' }, error: null })
    }
    if (table === 'appointments') {
      return createQueryBuilder(overrides.appointments ?? { data: appointmentRow, error: null })
    }
    if (table === 'responses') {
      return createQueryBuilder(overrides.responses ?? { data: null, error: null })
    }
    throw new Error(`unexpected table: ${table}`)
  })
}

const url = '/api/appointments/appt-uuid/participants/participant-uuid/responses'

describe('PUT .../responses', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('가능한 시간만 제출하면 200과 개수를 반환한다', async () => {
    mockTables({})

    const res = await request(app)
      .put(url)
      .send({ availableSlots: [{ date: '2026-07-20', time: '09:00' }], preferredSlots: [] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ availableCount: 1, preferredCount: 0 })
  })

  it('가능한 시간과 선호 시간을 함께 제출하면 200과 개수를 반환한다', async () => {
    mockTables({})

    const res = await request(app)
      .put(url)
      .send({
        availableSlots: [
          { date: '2026-07-20', time: '09:00' },
          { date: '2026-07-20', time: '09:30' },
        ],
        preferredSlots: [{ date: '2026-07-20', time: '09:00' }],
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ availableCount: 2, preferredCount: 1 })
  })

  it('약속 범위를 벗어난 슬롯이 있으면 400을 반환한다', async () => {
    mockTables({})

    const res = await request(app)
      .put(url)
      .send({ availableSlots: [{ date: '2026-07-22', time: '09:00' }], preferredSlots: [] })

    expect(res.status).toBe(400)
  })

  it('선호 시간이 가능한 시간의 부분집합이 아니면 400을 반환한다', async () => {
    mockTables({})

    const res = await request(app)
      .put(url)
      .send({
        availableSlots: [{ date: '2026-07-20', time: '09:00' }],
        preferredSlots: [{ date: '2026-07-20', time: '09:30' }],
      })

    expect(res.status).toBe(400)
  })

  it('가능한 시간이 0개면 400을 반환한다', async () => {
    mockTables({})

    const res = await request(app).put(url).send({ availableSlots: [], preferredSlots: [] })

    expect(res.status).toBe(400)
  })

  it('참여자를 찾을 수 없으면 404를 반환한다', async () => {
    mockTables({ participants: { data: null, error: null } })

    const res = await request(app)
      .put(url)
      .send({ availableSlots: [{ date: '2026-07-20', time: '09:00' }], preferredSlots: [] })

    expect(res.status).toBe(404)
  })

  it('마감된 약속이면 409를 반환한다', async () => {
    mockTables({ appointments: { data: { ...appointmentRow, closed_at: '2026-07-20T12:00:00.000Z' }, error: null } })

    const res = await request(app)
      .put(url)
      .send({ availableSlots: [{ date: '2026-07-20', time: '09:00' }], preferredSlots: [] })

    expect(res.status).toBe(409)
  })
})

describe('GET .../responses', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('저장된 값을 정규화된 시간과 함께 반환한다', async () => {
    mockTables({
      responses: {
        data: [
          { date: '2026-07-20', time: '09:00:00', is_preferred: true },
          { date: '2026-07-20', time: '09:30:00', is_preferred: false },
        ],
        error: null,
      },
    })

    const res = await request(app).get(url)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      availableSlots: [
        { date: '2026-07-20', time: '09:00' },
        { date: '2026-07-20', time: '09:30' },
      ],
      preferredSlots: [{ date: '2026-07-20', time: '09:00' }],
    })
  })

  it('참여자를 찾을 수 없으면 404를 반환한다', async () => {
    mockTables({ participants: { data: null, error: null } })

    const res = await request(app).get(url)

    expect(res.status).toBe(404)
  })
})
