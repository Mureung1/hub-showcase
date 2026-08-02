import { describe, expect, it, vi } from 'vitest'
import { recommendCurriculum } from './recommendCurriculum.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: 'Backend Development',
    levels: [
      {
        levelId: 'be-01',
        title: 'Server Basics',
        goal: 'Understand HTTP request and response flow.',
        estimatedWeeks: 3,
        modules: [
          {
            moduleId: 'be-01-01',
            title: 'HTTP Basics',
            topics: ['HTTP methods'],
            practiceIdeas: ['Handle a GET request.'],
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
  title: 'Start Backend',
  summary: 'Start from server fundamentals.',
  todayMission: {
    title: 'HTTP Practice',
    detail: 'Handle a GET request.',
    durationMinutes: 30,
    fileName: 'main.py',
  },
}

describe('recommendCurriculum use case', () => {
  it('returns a generated curriculum plan from a provider recommendation', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await expect(
      recommendCurriculum({
        goal: ' I want to learn backend development ',
        tracks,
        config: { apiKey: 'test-key' },
        recommendationProvider,
      }),
    ).resolves.toMatchObject({
      id: expect.stringMatching(/^backend-\d+-[a-z0-9]+$/),
      goal: 'I want to learn backend development',
      todayMission: { fileName: 'main.py' },
    })

    expect(recommendationProvider).toHaveBeenCalledWith({
      goal: 'I want to learn backend development',
      tracks,
      config: { apiKey: 'test-key' },
      knowledgeContext: [],
    })
  })

  it('passes matching knowledge chunks to the recommendation provider', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await recommendCurriculum({
      goal: 'Docker image basics',
      tracks,
      config: { apiKey: 'test-key' },
      recommendationProvider,
      knowledgeChunks: [
        {
          id: 'docker-1',
          sourceType: 'official-doc',
          topic: 'docker',
          docTitle: 'Docker Docs',
          sectionHeading: 'Images',
          url: 'https://docs.docker.com/',
          chunkText: 'Docker image container build registry',
        },
      ],
    })

    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeContext: [
          expect.objectContaining({
            id: 'docker-1',
            topic: 'docker',
            docTitle: 'Docker Docs',
          }),
        ],
      }),
    )
  })

  it('keeps the existing plan id and passes real progress into follow-up recommendations', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)
    const previousPlan = {
      id: 'backend-existing-plan',
      goal: 'I want to learn backend development',
      title: 'Backend Basics',
      summary: 'Learn HTTP fundamentals first.',
      estimatedDuration: '3 weeks',
      focusRole: 'Backend Development',
      todayMission: {
        title: 'HTTP Practice',
        detail: 'Handle a GET request.',
        durationMinutes: 30,
        fileName: 'main.py',
        mode: 'python',
      },
      steps: [
        {
          id: 'be-01-01',
          title: 'HTTP Basics',
          detail: 'Understand request and response flow.',
          outcome: 'Can explain HTTP lifecycle.',
          durationLabel: '1 week',
        },
      ],
      sources: [],
    }
    const progressContext = {
      missionId: 'generated-mission-backend-existing-plan',
      activeStepOffset: 1,
      completedStepIds: ['be-01-01'],
      completedAt: null,
      lastTestResult: { passed: 3, total: 3, ranAt: '2026-07-29T12:00:00.000Z' },
    }

    const plan = await recommendCurriculum({
      goal: previousPlan.goal,
      followUpInstruction: 'Continue from yesterday.',
      previousPlan,
      progressContext,
      tracks,
      config: { apiKey: 'test-key' },
      recommendationProvider,
    })

    expect(plan.id).toBe('backend-existing-plan')
    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        previousPlan,
        progressContext,
      }),
    )
  })

  it('rejects empty goals', async () => {
    await expect(
      recommendCurriculum({ goal: ' ', tracks, config: {}, recommendationProvider: vi.fn() }),
    ).rejects.toThrow('Curriculum goal is required')
  })

  it('boosts knowledge chunks whose topic matches the inferred track for the goal', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await recommendCurriculum({
      goal: 'FastAPI 백엔드 서버 만들기',
      tracks,
      config: { apiKey: 'test-key' },
      recommendationProvider,
      knowledgeChunks: [
        {
          id: 'react-1',
          sourceType: 'official-doc',
          topic: 'react',
          docTitle: 'React Quick Start',
          sectionHeading: 'Components',
          url: 'https://ko.react.dev/learn',
          chunkText: 'React 컴포넌트를 만들고 중첩하는 방법을 배웁니다.',
        },
        {
          id: 'backend-1',
          sourceType: 'official-doc',
          topic: 'backend',
          docTitle: 'FastAPI Path Parameters',
          sectionHeading: 'Path Parameters',
          url: 'https://fastapi.tiangolo.com/tutorial/path-params/',
          chunkText: 'FastAPI 경로 매개변수를 사용해 URL 경로에서 값을 추출하는 방법을 배웁니다.',
        },
      ],
    })

    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeContext: [expect.objectContaining({ id: 'backend-1' })],
      }),
    )
  })

  it('does not crash when no knowledge chunks exist for the inferred track', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await expect(
      recommendCurriculum({
        goal: '자료구조와 알고리즘 기초 다지기',
        tracks,
        config: { apiKey: 'test-key' },
        recommendationProvider,
        knowledgeChunks: [],
      }),
    ).resolves.toBeDefined()

    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({ knowledgeContext: [] }),
    )
  })
})
