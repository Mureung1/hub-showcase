import { describe, expect, it, vi } from 'vitest'
import {
  createFallbackCurriculumPlan,
  curriculumRecommendationEndpoint,
  recommendCurriculum,
  resolveCurriculumRecommendationMode,
} from './curriculumClient'

describe('curriculumClient', () => {
  it('returns a mock curriculum recommendation by default', async () => {
    const result = await recommendCurriculum({ goal: 'I want to learn backend development' })

    expect(result.plan.id).toBe('backend-curriculum-plan')
    expect(result.plan.todayMission.fileName).toBe('main.py')
  })

  it('creates the same fallback plan used by mock screens', () => {
    expect(createFallbackCurriculumPlan('I want to learn React').todayMission.fileName).toBe(
      'App.jsx',
    )
  })

  it('resolves explicit server mode and defaults to mock mode', () => {
    expect(resolveCurriculumRecommendationMode('server')).toBe('server')
    expect(resolveCurriculumRecommendationMode('mock')).toBe('mock')
    expect(resolveCurriculumRecommendationMode(undefined)).toBe('mock')
  })

  it('posts to the server recommendation endpoint in server mode', async () => {
    const plan = createFallbackCurriculumPlan('I want to build a FastAPI server')
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ plan }),
    })) as unknown as typeof fetch

    await expect(
      recommendCurriculum(
        { goal: 'I want to build a FastAPI server' },
        { mode: 'server', fetchImpl },
      ),
    ).resolves.toEqual({ plan })
    expect(fetchImpl).toHaveBeenCalledWith(curriculumRecommendationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'I want to build a FastAPI server' }),
    })
  })

  it('keeps follow-up requests tied to the previous plan in server mode', async () => {
    const plan = createFallbackCurriculumPlan('I want to build a FastAPI server')
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ plan }),
    })) as unknown as typeof fetch

    await recommendCurriculum(
      {
        goal: 'I want to build a FastAPI server',
        followUpInstruction: 'Make this a three-week practice plan.',
        previousPlan: plan,
      },
      { mode: 'server', fetchImpl },
    )

    expect(fetchImpl).toHaveBeenCalledWith(curriculumRecommendationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: 'I want to build a FastAPI server',
        followUpInstruction: 'Make this a three-week practice plan.',
        previousPlan: plan,
      }),
    })
  })

  it('uses server error messages when recommendation requests fail', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ message: 'Model response could not be parsed.' }),
    })) as unknown as typeof fetch

    await expect(
      recommendCurriculum({ goal: 'I want to learn React' }, { mode: 'server', fetchImpl }),
    ).rejects.toThrow('Model response could not be parsed.')
  })

  it('falls back to a status error when failed responses have no JSON message', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json')
      },
    })) as unknown as typeof fetch

    await expect(
      recommendCurriculum({ goal: 'I want to learn React' }, { mode: 'server', fetchImpl }),
    ).rejects.toThrow('Curriculum recommendation failed (500)')
  })
})
