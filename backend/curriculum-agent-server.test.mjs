import { describe, expect, it, vi } from 'vitest'
import { curriculumRecommendationPath, handleCurriculumApiRequest } from './curriculum-agent-server.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: '백엔드 개발자',
    description: '서버를 설계하고 운영하는 능력을 기른다.',
    levels: [
      {
        levelId: 'be-01',
        levelNumber: 1,
        title: '서버의 기본 동작 이해',
        goal: 'HTTP 요청-응답 흐름을 이해합니다.',
        estimatedWeeks: 3,
        modules: [
          {
            moduleId: 'be-01-01',
            title: 'HTTP 기본',
            topics: ['HTTP 메서드', '상태 코드'],
            practiceIdeas: ['GET 요청을 처리합니다.'],
            resources: [
              { label: 'MDN HTTP', url: 'https://developer.mozilla.org/ko/docs/Web/HTTP', type: 'official-doc' },
            ],
          },
        ],
      },
    ],
  },
]

const recommendation = {
  trackId: 'backend',
  trackName: '백엔드 개발자',
  levelId: 'be-01',
  levelTitle: '서버의 기본 동작 이해',
  moduleIds: ['be-01-01'],
  title: '백엔드 시작하기',
  summary: '서버 기초부터 시작합니다.',
  todayMission: {
    title: 'HTTP 실습',
    detail: 'GET 요청을 처리합니다.',
    durationMinutes: 30,
    fileName: 'main.py',
  },
  rationale: '백엔드 목표와 가장 가까운 단계입니다.',
}

describe('curriculum agent server', () => {
  it('returns the React plan contract for valid recommendation requests', async () => {
    const runAgent = vi.fn(async () => recommendation)

    await expect(
      handleCurriculumApiRequest({
        method: 'POST',
        url: curriculumRecommendationPath,
        bodyText: JSON.stringify({ goal: ' 백엔드 개발자가 되고 싶어 ' }),
        tracks,
        config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
        runAgent,
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

    expect(runAgent).toHaveBeenCalledWith({
      goal: '백엔드 개발자가 되고 싶어',
      tracks,
      config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
    })
  })

  it('rejects empty goals before calling the agent', async () => {
    const runAgent = vi.fn()

    const result = await handleCurriculumApiRequest({
      method: 'POST',
      url: curriculumRecommendationPath,
      bodyText: JSON.stringify({ goal: ' ' }),
      tracks,
      config: {},
      runAgent,
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 400, body: { error: 'invalid_goal' } })
    expect(runAgent).not.toHaveBeenCalled()
  })

  it('returns a configuration error when the server is missing the model API key', async () => {
    const result = await handleCurriculumApiRequest({
      method: 'POST',
      url: curriculumRecommendationPath,
      bodyText: JSON.stringify({ goal: 'React를 배우고 싶어' }),
      tracks,
      config: {},
      runAgent: vi.fn(async () => {
        throw new Error('GEMINI_API_KEY is missing')
      }),
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 500, body: { error: 'agent_configuration_error' } })
  })
})
