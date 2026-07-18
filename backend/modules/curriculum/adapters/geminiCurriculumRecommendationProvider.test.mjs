import { describe, expect, it } from 'vitest'
import { createDryRunPayload, extractJson } from './geminiCurriculumRecommendationProvider.mjs'
import { createAgentConfig } from '../../../shared/env.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: '백엔드 개발자',
    description: '서버를 설계합니다.',
    levels: [
      {
        levelId: 'be-01',
        levelNumber: 1,
        title: '서버의 기본 동작 이해',
        goal: 'HTTP를 이해합니다.',
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

describe('gemini curriculum recommendation provider', () => {
  it('creates provider config with developer defaults', () => {
    expect(createAgentConfig({ GEMINI_API_KEY: 'test-key' })).toEqual({
      provider: 'developer',
      model: 'gemini-flash-latest',
      apiKey: 'test-key',
    })
  })

  it('extracts JSON from fenced model output', () => {
    expect(extractJson('```json\n{"trackId":"backend"}\n```')).toBe('{"trackId":"backend"}')
  })

  it('creates a dry run payload with catalog constraints', () => {
    expect(
      createDryRunPayload({
        goal: '백엔드 개발자가 되고 싶어',
        tracks,
        config: createAgentConfig({ GEMINI_API_KEY: 'test-key' }),
      }),
    ).toMatchObject({
      provider: 'developer',
      model: 'gemini-flash-latest',
      input: {
        userGoal: '백엔드 개발자가 되고 싶어',
        constraints: { moduleCount: 3 },
      },
    })
  })
})