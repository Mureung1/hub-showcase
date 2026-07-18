import { describe, expect, it, vi } from 'vitest'
import { recommendCurriculum } from './recommendCurriculum.mjs'

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

describe('recommendCurriculum use case', () => {
  it('returns a generated curriculum plan from a provider recommendation', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await expect(
      recommendCurriculum({
        goal: ' 백엔드 개발자가 되고 싶어 ',
        tracks,
        config: { apiKey: 'test-key' },
        recommendationProvider,
      }),
    ).resolves.toMatchObject({
      id: 'backend-curriculum-plan',
      goal: '백엔드 개발자가 되고 싶어',
      todayMission: { fileName: 'main.py' },
    })

    expect(recommendationProvider).toHaveBeenCalledWith({
      goal: '백엔드 개발자가 되고 싶어',
      tracks,
      config: { apiKey: 'test-key' },
    })
  })

  it('rejects empty goals', async () => {
    await expect(
      recommendCurriculum({ goal: ' ', tracks, config: {}, recommendationProvider: vi.fn() }),
    ).rejects.toThrow('Curriculum goal is required')
  })
})