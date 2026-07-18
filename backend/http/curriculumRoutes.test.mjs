import { describe, expect, it, vi } from 'vitest'
import { curriculumRecommendationPath, handleCurriculumApiRequest } from './curriculumRoutes.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: '백엔드 개발자',
    levels: [
      {
        levelId: 'be-01',
        title: '서버의 기본 동작 이해',
        goal: 'HTTP 요청-응답 흐름을 이해합니다.',
        estimatedWeeks: 3,
        modules: [
          {
            moduleId: 'be-01-01',
            title: 'HTTP 기본',
            topics: ['HTTP 메서드'],
            practiceIdeas: ['GET 요청을 처리합니다.'],
            resources: [],
          },
        ],
      },
    ],
  },
]

const recommendation = {
  trackId: 'backend',
  levelId: 'be-01',
  moduleIds: ['be-01-01'],
  title: '백엔드 시작하기',
  summary: '서버 기초부터 시작합니다.',
  todayMission: {
    title: 'HTTP 실습',
    detail: 'GET 요청을 처리합니다.',
    durationMinutes: 30,
    fileName: 'main.py',
  },
}

describe('curriculum routes', () => {
  it('returns the React plan contract for valid recommendation requests', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await expect(
      handleCurriculumApiRequest({
        method: 'POST',
        url: curriculumRecommendationPath,
        bodyText: JSON.stringify({ goal: ' 백엔드 개발자가 되고 싶어 ' }),
        tracks,
        config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
        recommendationProvider,
        logger: { error: vi.fn() },
      }),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        plan: {
          id: 'backend-curriculum-plan',
          goal: '백엔드 개발자가 되고 싶어',
          todayMission: { fileName: 'main.py' },
          steps: [{ id: 'be-01-01' }],
        },
      },
    })
  })

  it('rejects empty goals before calling the provider', async () => {
    const recommendationProvider = vi.fn()

    const result = await handleCurriculumApiRequest({
      method: 'POST',
      url: curriculumRecommendationPath,
      bodyText: JSON.stringify({ goal: ' ' }),
      tracks,
      config: {},
      recommendationProvider,
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 400, body: { error: 'invalid_goal' } })
    expect(recommendationProvider).not.toHaveBeenCalled()
  })

  it('returns a configuration error when the server is missing the model API key', async () => {
    const result = await handleCurriculumApiRequest({
      method: 'POST',
      url: curriculumRecommendationPath,
      bodyText: JSON.stringify({ goal: 'React를 배우고 싶어' }),
      tracks,
      config: {},
      recommendationProvider: vi.fn(async () => {
        throw new Error('GEMINI_API_KEY is missing')
      }),
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 500, body: { error: 'agent_configuration_error' } })
  })
})