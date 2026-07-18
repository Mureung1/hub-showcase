import { describe, expect, it, vi } from 'vitest'
import {
  createFallbackCurriculumPlan,
  curriculumRecommendationEndpoint,
  recommendCurriculum,
  resolveCurriculumRecommendationMode,
} from './curriculumClient'

describe('curriculumClient', () => {
  it('returns a mock curriculum recommendation by default', async () => {
    const result = await recommendCurriculum({ goal: '백엔드 개발자가 되고 싶어' })

    expect(result.plan.title).toBe('백엔드 개발자 커리큘럼')
    expect(result.plan.todayMission.fileName).toBe('main.py')
  })

  it('creates the same fallback plan used by mock screens', () => {
    expect(createFallbackCurriculumPlan('React를 배우고 싶어').todayMission.fileName).toBe(
      'index.html',
    )
  })


  it('resolves the server mode only when explicitly enabled', () => {
    expect(resolveCurriculumRecommendationMode('server')).toBe('server')
    expect(resolveCurriculumRecommendationMode('mock')).toBe('mock')
    expect(resolveCurriculumRecommendationMode(undefined)).toBe('mock')
  })
  it('posts to the server recommendation endpoint in server mode', async () => {
    const plan = createFallbackCurriculumPlan('FastAPI로 API 서버 만들고 싶어')
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ plan }),
    })) as unknown as typeof fetch

    await expect(
      recommendCurriculum(
        { goal: 'FastAPI로 API 서버 만들고 싶어' },
        { mode: 'server', fetchImpl },
      ),
    ).resolves.toEqual({ plan })
    expect(fetchImpl).toHaveBeenCalledWith(curriculumRecommendationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'FastAPI로 API 서버 만들고 싶어' }),
    })
  })

  it('rejects failed server recommendation requests', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
    })) as unknown as typeof fetch

    await expect(
      recommendCurriculum({ goal: 'React를 배우고 싶어' }, { mode: 'server', fetchImpl }),
    ).rejects.toThrow('Curriculum recommendation failed (500)')
  })
})

