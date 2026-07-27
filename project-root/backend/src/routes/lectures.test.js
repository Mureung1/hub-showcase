import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import createApp from '../app.js'

// supabase를 module mock이 아니라 app 생성 시 인자로 직접 주입한다 (timetables.test.js와 동일한 방식).
const supabase = { auth: { getUser: vi.fn() }, from: vi.fn() }
const app = createApp(supabase)

function makeLectureQueryBuilder({ data, error }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // 실제 supabase-js 빌더는 메서드를 몇 번 체이닝하든 그 자체가 thenable이라 바로 await 가능하다.
    then: (resolve) => resolve({ data, error }),
  }
}

describe('GET /api/lectures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('year, semester가 없으면 400을 반환한다', async () => {
    const res = await request(app).get('/api/lectures')

    expect(res.status).toBe(400)
  })

  it('required_course_report에 신고가 없으면 lecture.required 값을 그대로 반환한다', async () => {
    const lectureBuilder = makeLectureQueryBuilder({
      data: [
        {
          id: 1,
          year: 2026,
          semester: '2026-2',
          name: '자료구조',
          professor: '김구진',
          credit: 3,
          category: '전공필수',
          department: '컴퓨터학부',
          required: true,
          prerequisite: null,
          pair_group: null,
          tier: null,
          grade: '2',
          lecture_time: [{ day: '화', start_time: '09:00', end_time: '10:30' }],
        },
      ],
      error: null,
    })
    const reportBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    supabase.from.mockReturnValueOnce(lectureBuilder).mockReturnValueOnce(reportBuilder)

    const res = await request(app).get('/api/lectures?year=2026&semester=2026-2')

    expect(res.status).toBe(200)
    expect(res.body[0].required).toBe(true)
  })

  it('required_course_report에 크라우드소싱 신고가 있으면 required를 true로 덮어쓴다', async () => {
    const lectureBuilder = makeLectureQueryBuilder({
      data: [
        {
          id: 2,
          year: 2026,
          semester: '2026-2',
          name: '전공영어',
          professor: '이교수',
          credit: 3,
          category: '전공선택',
          department: '통계학과',
          required: false,
          prerequisite: null,
          pair_group: null,
          tier: null,
          grade: '2',
          lecture_time: [{ day: '수', start_time: '09:00', end_time: '10:30' }],
        },
      ],
      error: null,
    })
    const reportBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ department: '통계학과', course_name: '전공영어' }],
        error: null,
      }),
    }
    supabase.from.mockReturnValueOnce(lectureBuilder).mockReturnValueOnce(reportBuilder)

    const res = await request(app).get('/api/lectures?year=2026&semester=2026-2')

    expect(res.status).toBe(200)
    expect(res.body[0].required).toBe(true)
    expect(reportBuilder.in).toHaveBeenCalledWith('department', ['통계학과'])
  })
})

describe('POST /api/lectures/required-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('인증 토큰이 없으면 401을 반환한다', async () => {
    const res = await request(app)
      .post('/api/lectures/required-report')
      .send({ department: '통계학과', courseName: '전공영어' })

    expect(res.status).toBe(401)
  })

  it('department, courseName이 없으면 400을 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const res = await request(app)
      .post('/api/lectures/required-report')
      .set('Authorization', 'Bearer test-token')
      .send({})

    expect(res.status).toBe(400)
  })

  it('정상 신고 시 required_course_report에 insert하고 200을 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const insertBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }
    supabase.from.mockReturnValueOnce(insertBuilder)

    const res = await request(app)
      .post('/api/lectures/required-report')
      .set('Authorization', 'Bearer test-token')
      .send({ department: '통계학과', courseName: '전공영어' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(insertBuilder.insert).toHaveBeenCalledWith({
      department: '통계학과',
      course_name: '전공영어',
      user_id: 'user-1',
    })
  })

  it('이미 같은 신고가 있어도(23505) 에러 없이 200을 반환한다', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const insertBuilder = {
      insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } }),
    }
    supabase.from.mockReturnValueOnce(insertBuilder)

    const res = await request(app)
      .post('/api/lectures/required-report')
      .set('Authorization', 'Bearer test-token')
      .send({ department: '통계학과', courseName: '전공영어' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
