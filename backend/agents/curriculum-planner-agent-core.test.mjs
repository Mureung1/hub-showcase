import { describe, expect, it } from 'vitest'
import {
  createAgentConfig,
  createGeneratedCurriculumPlan,
  extractJson,
  normalizeAgentOutput,
} from './curriculum-planner-agent-core.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: '백엔드 개발자',
    levels: [
      {
        levelId: 'be-01',
        title: '서버의 기본 동작 이해',
        goal: 'HTTP와 서버 기본을 이해합니다.',
        estimatedWeeks: 3,
        modules: [
          {
            moduleId: 'be-01-01',
            title: 'HTTP 기본',
            topics: ['HTTP 메서드', '상태 코드'],
            practiceIdeas: ['GET 요청을 처리하는 작은 서버를 작성합니다.'],
            resources: [
              {
                label: 'MDN HTTP',
                url: 'https://developer.mozilla.org/ko/docs/Web/HTTP',
                type: 'official-doc',
              },
            ],
          },
          {
            moduleId: 'be-01-02',
            title: '서버 프레임워크 기초',
            topics: ['라우팅'],
            practiceIdeas: ['라우터를 작성합니다.'],
            resources: [],
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

  it('maps a normalized recommendation to the React curriculum plan contract', () => {
    const recommendation = normalizeAgentOutput({
      tracks,
      output: {
        trackId: 'backend',
        levelId: 'be-01',
        moduleIds: ['be-01-01', 'be-01-02'],
        title: '백엔드 시작하기',
        summary: '서버 기초부터 시작합니다.',
        todayMission: {
          title: 'HTTP 실습',
          detail: 'GET 요청을 처리합니다.',
          durationMinutes: 30,
          fileName: 'main.py',
        },
        rationale: '백엔드 목표와 가장 가까운 단계입니다.',
      },
    })

    expect(
      createGeneratedCurriculumPlan({
        goal: '백엔드 개발자가 되고 싶어',
        recommendation,
        tracks,
      }),
    ).toMatchObject({
      id: 'backend-curriculum-plan',
      goal: '백엔드 개발자가 되고 싶어',
      title: '백엔드 시작하기',
      estimatedDuration: '3주 로드맵',
      focusRole: '백엔드 개발자',
      todayMission: { fileName: 'main.py' },
      steps: [
        { id: 'be-01-01', detail: 'HTTP 메서드, 상태 코드를 순서대로 학습합니다.' },
        { id: 'be-01-02', detail: '라우팅를 순서대로 학습합니다.' },
      ],
      sources: [{ title: 'MDN HTTP', type: 'official_docs', urlLabel: 'developer.mozilla.org' }],
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
