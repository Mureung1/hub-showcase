import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import createApp from '../app.js'

// supabase를 module mock이 아니라 app 생성 시 인자로 직접 주입한다.
const supabase = { auth: { getUser: vi.fn() }, from: vi.fn() }
const app = createApp(supabase)

describe('POST /api/timetables/share', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('인증 토큰이 없으면 401을 반환한다', async () => {
    const res = await request(app)
      .post('/api/timetables/share')
      .send({ year: 2026, semester: '2026-2' })

    expect(res.status).toBe(401)
  })

  it('확정된 시간표가 있으면 is_shared를 true로 바꾸고 200을 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 42 }, error: null }),
    }
    const updateBuilder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    supabase.from.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(updateBuilder)

    const res = await request(app)
      .post('/api/timetables/share')
      .set('Authorization', 'Bearer test-token')
      .send({ year: 2026, semester: '2026-2' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 42 })
    expect(updateBuilder.update).toHaveBeenCalledWith({ is_shared: true })
  })

  it('공유할 확정 시간표가 없으면 404를 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    supabase.from.mockReturnValueOnce(selectBuilder)

    const res = await request(app)
      .post('/api/timetables/share')
      .set('Authorization', 'Bearer test-token')
      .send({ year: 2026, semester: '2026-2' })

    expect(res.status).toBe(404)
  })
})

describe('POST /api/timetables/:id/recommend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('인증 토큰이 없으면 401을 반환한다', async () => {
    const res = await request(app).post('/api/timetables/42/recommend')

    expect(res.status).toBe(401)
  })

  it('처음 추천하면 추천을 기록하고 누적 추천 수를 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const insertBuilder = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    const countBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 13, error: null }),
    }
    supabase.from.mockReturnValueOnce(insertBuilder).mockReturnValueOnce(countBuilder)

    const res = await request(app)
      .post('/api/timetables/42/recommend')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ recommendCount: 13 })
    expect(insertBuilder.insert).toHaveBeenCalledWith({ timetable_id: '42', user_id: 'user-1' })
  })

  it('같은 사용자가 이미 추천했으면 409를 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const insertBuilder = {
      insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } }),
    }
    supabase.from.mockReturnValueOnce(insertBuilder)

    const res = await request(app)
      .post('/api/timetables/42/recommend')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(409)
  })
})

describe('GET /api/timetables/shared', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('인증 토큰이 없으면 401을 반환한다', async () => {
    const res = await request(app).get('/api/timetables/shared')

    expect(res.status).toBe(401)
  })

  it('공유된 시간표 목록을 강의/추천 정보와 함께 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const rows = [
      {
        id: 1,
        label: '추천 시간표 1',
        timetable_lecture: [
          {
            lecture: {
              id: 101,
              name: '자료구조',
              professor: '김구진',
              credit: 3,
              category: '전공필수',
              department: '컴퓨터학부',
              required: true,
              lecture_time: [{ day: '화', start_time: '09:00', end_time: '10:30' }],
            },
          },
        ],
        timetable_recommend: [{ user_id: 'user-2' }],
      },
    ]
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    supabase.from.mockReturnValueOnce(selectBuilder)

    const res = await request(app)
      .get('/api/timetables/shared')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: 1,
        label: '추천 시간표 1',
        lectures: [
          {
            id: 101,
            name: '자료구조',
            professor: '김구진',
            credit: 3,
            category: '전공필수',
            department: '컴퓨터학부',
            required: true,
            times: [{ day: '화', start: '09:00', end: '10:30' }],
          },
        ],
        recommendCount: 1,
        recommendedByMe: false,
      },
    ])
    expect(selectBuilder.eq).toHaveBeenCalledWith('is_shared', true)
  })
})
