import { describe, expect, it, vi } from 'vitest'
import { curriculumRecommendationPath, handleCurriculumApiRequest } from './curriculumRoutes.mjs'

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

const dockerKnowledgeChunks = [
  {
    id: 'docker-1',
    sourceType: 'official-doc',
    topic: 'docker',
    docTitle: 'Docker Docs',
    sectionHeading: 'Images',
    url: 'https://docs.docker.com/',
    chunkText: 'Docker backend HTTP container',
  },
]

describe('curriculum routes', () => {
  it('returns the React plan contract for valid recommendation requests', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await expect(
      handleCurriculumApiRequest({
        method: 'POST',
        url: curriculumRecommendationPath,
        bodyText: JSON.stringify({ goal: ' I want to learn backend development ' }),
        tracks,
        config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
        recommendationProvider,
        knowledgeChunks: dockerKnowledgeChunks,
        logger: { error: vi.fn() },
      }),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        plan: {
          id: expect.stringMatching(/^backend-\d+-[a-z0-9]+$/),
          goal: 'I want to learn backend development',
          todayMission: { fileName: 'main.py' },
          steps: [{ id: 'be-01-01' }],
        },
      },
    })

    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeContext: [expect.objectContaining({ id: 'docker-1', topic: 'docker' })],
      }),
    )
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
      knowledgeChunks: dockerKnowledgeChunks,
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 400, body: { error: 'invalid_goal' } })
    expect(recommendationProvider).not.toHaveBeenCalled()
  })

  it('returns a configuration error when the server is missing the model API key', async () => {
    const result = await handleCurriculumApiRequest({
      method: 'POST',
      url: curriculumRecommendationPath,
      bodyText: JSON.stringify({ goal: 'I want to learn React' }),
      tracks,
      config: {},
      recommendationProvider: vi.fn(async () => {
        throw new Error('GEMINI_API_KEY is missing')
      }),
      logger: { error: vi.fn() },
    })

    expect(result).toMatchObject({ status: 500, body: { error: 'agent_configuration_error' } })
  })

  it('persists recommended curriculum plan to repository and supports GET/DELETE /api/curriculum/generated', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)
    const generatedCurriculumRepository = {
      stored: null,
      getLatest() {
        return this.stored
      },
      save(snapshot) {
        this.stored = snapshot
        return snapshot
      },
      reset() {
        this.stored = null
      },
    }

    const recommendResult = await handleCurriculumApiRequest({
      method: 'POST',
      url: curriculumRecommendationPath,
      bodyText: JSON.stringify({ goal: 'Learn Express APIs' }),
      tracks,
      config: { provider: 'developer', model: 'gemini-flash-latest', apiKey: 'test-key' },
      recommendationProvider,
      generatedCurriculumRepository,
      logger: { error: vi.fn() },
    })

    expect(recommendResult).toMatchObject({ status: 200 })
    expect(generatedCurriculumRepository.getLatest()).toMatchObject({
      goal: 'Learn Express APIs',
      plan: { id: expect.stringMatching(/^backend-\d+-[a-z0-9]+$/) },
    })

    const getResult = await handleCurriculumApiRequest({
      method: 'GET',
      url: '/api/curriculum/generated',
      generatedCurriculumRepository,
    })

    expect(getResult).toMatchObject({
      status: 200,
      body: {
        generatedCurriculum: {
          goal: 'Learn Express APIs',
          plan: { id: expect.stringMatching(/^backend-\d+-[a-z0-9]+$/) },
        },
      },
    })

    const deleteResult = await handleCurriculumApiRequest({
      method: 'DELETE',
      url: '/api/curriculum/generated',
      generatedCurriculumRepository,
    })

    expect(deleteResult).toMatchObject({ status: 200, body: { ok: true } })
    expect(generatedCurriculumRepository.getLatest()).toBeNull()
  })
})
