import { generateMockCurriculum, type GeneratedCurriculumPlan } from '../model/curriculumGenerator'

export type CurriculumRecommendationRequest = {
  goal: string
}

export type CurriculumRecommendationResponse = {
  plan: GeneratedCurriculumPlan
}

export type CurriculumRecommendationMode = 'mock' | 'server'

type CurriculumRecommendationOptions = {
  mode?: CurriculumRecommendationMode
  fetchImpl?: typeof fetch
}

export const curriculumRecommendationEndpoint = '/api/curriculum/recommend'

export function resolveCurriculumRecommendationMode(
  value = import.meta.env.VITE_CURRICULUM_RECOMMENDATION_MODE ?? import.meta.env.VITE_ICU_API_MODE,
): CurriculumRecommendationMode {
  return value === 'server' ? 'server' : 'mock'
}

export function createFallbackCurriculumPlan(goal: string): GeneratedCurriculumPlan {
  return generateMockCurriculum(goal)
}

export async function recommendCurriculum(
  request: CurriculumRecommendationRequest,
  options: CurriculumRecommendationOptions = {},
): Promise<CurriculumRecommendationResponse> {
  const mode = options.mode ?? resolveCurriculumRecommendationMode()

  if (mode === 'server') {
    return requestServerCurriculumRecommendation(request, options.fetchImpl ?? fetch)
  }

  return { plan: createFallbackCurriculumPlan(request.goal) }
}

async function requestServerCurriculumRecommendation(
  request: CurriculumRecommendationRequest,
  fetchImpl: typeof fetch,
): Promise<CurriculumRecommendationResponse> {
  const response = await fetchImpl(curriculumRecommendationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorMessage = await readServerErrorMessage(response)
    throw new Error(errorMessage ?? `Curriculum recommendation failed (${response.status})`)
  }

  const body = (await response.json()) as Partial<CurriculumRecommendationResponse>

  if (!body.plan) {
    throw new Error('Curriculum recommendation response did not include a plan')
  }

  return { plan: body.plan }
}

async function readServerErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    return typeof body.message === 'string' && body.message.trim().length > 0 ? body.message : null
  } catch {
    return null
  }
}
