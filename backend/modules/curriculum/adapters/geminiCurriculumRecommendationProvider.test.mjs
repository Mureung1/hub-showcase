import { describe, expect, it } from 'vitest'
import {
  createDryRunPayload,
  createKnowledgeContext,
  extractJson,
} from './geminiCurriculumRecommendationProvider.mjs'
import { createAgentConfig } from '../../../shared/env.mjs'

const tracks = [
  {
    trackId: 'backend',
    trackName: 'Backend Development',
    description: 'Learn how to design servers.',
    levels: [
      {
        levelId: 'be-01',
        levelNumber: 1,
        title: 'Server Basics',
        goal: 'Understand HTTP.',
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
        goal: 'I want to learn backend development',
        tracks,
        config: createAgentConfig({ GEMINI_API_KEY: 'test-key' }),
      }),
    ).toMatchObject({
      provider: 'developer',
      model: 'gemini-flash-latest',
      input: {
        userGoal: 'I want to learn backend development',
        knowledgeContext: [],
        constraints: { moduleCount: 3 },
      },
    })
  })

  it('creates a compact knowledge context for model grounding', () => {
    const longText = 'Docker '.repeat(120)

    expect(
      createKnowledgeContext([
        {
          topic: 'docker',
          docTitle: 'Docker Docs',
          sectionHeading: 'Images',
          url: 'https://docs.docker.com/',
          chunkText: longText,
        },
      ]),
    ).toEqual([
      {
        topic: 'docker',
        docTitle: 'Docker Docs',
        sectionHeading: 'Images',
        url: 'https://docs.docker.com/',
        chunkText: longText.slice(0, 500),
      },
    ])
  })
})
