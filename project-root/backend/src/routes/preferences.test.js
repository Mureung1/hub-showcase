import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import createPreferencesRouter from './preferences.js'

// timetables.js/lectures.js와 같은 이유로 DI 방식으로 mock gemini 클라이언트를 주입한다.
const gemini = { models: { generateContent: vi.fn() } }

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/preferences', createPreferencesRouter(gemini))
  return app
}

describe('POST /api/preferences/parse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('freeText가 없으면 400을 반환한다', async () => {
    const app = buildApp()
    const res = await request(app).post('/api/preferences/parse').send({})

    expect(res.status).toBe(400)
  })

  it('Gemini가 추출한 조건을 그대로 반환한다', async () => {
    const app = buildApp()
    gemini.models.generateContent.mockResolvedValue({
      text: JSON.stringify({
        freeDays: ['수'],
        avoidMorning: true,
        targetCredit: null,
        teamPreferred: null,
      }),
    })

    const res = await request(app)
      .post('/api/preferences/parse')
      .send({ freeText: '수요일엔 오후 수업만 듣고 싶어요' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      freeDays: ['수'],
      avoidMorning: true,
      targetCredit: null,
      teamPreferred: null,
    })
    expect(gemini.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-flash-latest' })
    )
  })

  it('Gemini 호출이 실패하면 502를 반환한다', async () => {
    const app = buildApp()
    gemini.models.generateContent.mockRejectedValue(new Error('network error'))

    const res = await request(app)
      .post('/api/preferences/parse')
      .send({ freeText: '아무 텍스트' })

    expect(res.status).toBe(502)
  })

  it('gemini 클라이언트가 없으면(키 미설정) 503을 반환한다', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/preferences', createPreferencesRouter(null))

    const res = await request(app)
      .post('/api/preferences/parse')
      .send({ freeText: '아무 텍스트' })

    expect(res.status).toBe(503)
  })
})
