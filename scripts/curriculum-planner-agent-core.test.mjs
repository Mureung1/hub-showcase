import { describe, expect, it } from 'vitest'
import { createAgentConfig, extractJson, normalizeAgentOutput } from './curriculum-planner-agent-core.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: '백엔드 개발자',
    levels: [
      {
        levelId: 'be-01',
        title: '서버의 기본 동작 이해',
        goal: 'HTTP와 서버 기본을 이해합니다.',
        modules: [
          {
            moduleId: 'be-01-01',
            title: 'HTTP 기본',
            practiceIdeas: ['GET 요청을 처리하는 작은 서버를 작성합니다.'],
          },
          {
            moduleId: 'be-01-02',
            title: '서버 프레임워크 기초',
            practiceIdeas: ['라우터를 작성합니다.'],
          },
        ],
      },
    ],
  },
]

describe('curriculum planner agent core', () => {
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

  it('normalizes model output against known track data', () => {
    expect(
      normalizeAgentOutput({
        tracks,
        output: {
          trackId: 'backend',
          levelId: 'be-01',
          moduleIds: ['be-01-01'],
          title: '백엔드 시작하기',
          summary: '서버 기초부터 시작합니다.',
          todayMission: { durationMinutes: 25 },
        },
      }),
    ).toMatchObject({
      trackId: 'backend',
      trackName: '백엔드 개발자',
      levelId: 'be-01',
      levelTitle: '서버의 기본 동작 이해',
      moduleIds: ['be-01-01'],
      todayMission: {
        title: 'HTTP 기본 실습',
        durationMinutes: 25,
        fileName: 'main.py',
      },
    })
  })

  it('rejects unknown track ids', () => {
    expect(() =>
      normalizeAgentOutput({
        tracks,
        output: { trackId: 'mobile', levelId: 'be-01', moduleIds: ['be-01-01'] },
      }),
    ).toThrow('Unknown trackId from Gemini: mobile')
  })
})

