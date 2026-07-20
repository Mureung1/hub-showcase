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
      id: 'backend-curriculum-plan',
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

  it('rejects empty goals', async () => {
    await expect(
      recommendCurriculum({ goal: ' ', tracks, config: {}, recommendationProvider: vi.fn() }),
    ).rejects.toThrow('Curriculum goal is required')
  })
})
