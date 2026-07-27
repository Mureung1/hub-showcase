import { apiUrl } from '../../../app/apiUrl'
import { generateMockCurriculum, type GeneratedCurriculumPlan } from '../model/curriculumGenerator'
import type { GeneratedCurriculumSnapshot } from '../model/useGeneratedCurriculumStore'

export type CurriculumRecommendationRequest = {
  goal: string
  followUpInstruction?: string
  previousPlan?: GeneratedCurriculumPlan
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
export const generatedCurriculumEndpoint = '/api/curriculum/generated'
export const curriculumHistoryEndpoint = '/api/curriculum/history'

export function resolveCurriculumRecommendationMode(value?: string): CurriculumRecommendationMode {
  const modeValue = arguments.length === 0
    ? import.meta.env.VITE_CURRICULUM_RECOMMENDATION_MODE ?? import.meta.env.VITE_ICU_API_MODE
    : value

  return modeValue === 'mock' ? 'mock' : 'server'
}

export function createFallbackCurriculumPlan(goal: string): GeneratedCurriculumPlan {
  return generateMockCurriculum(goal)
}

export async function recommendCurriculum(
  request: CurriculumRecommendationRequest,
  options: CurriculumRecommendationOptions = {},
): Promise<CurriculumRecommendationResponse> {
  const mode = resolveCurriculumRecommendationMode(options.mode)

  if (mode === 'server') {
    return requestServerCurriculumRecommendation(request, options.fetchImpl ?? fetch)
  }

  return { plan: createFallbackCurriculumPlan(request.goal) }
}

export async function getGeneratedCurriculum(
  options: CurriculumRecommendationOptions = {},
): Promise<{ generatedCurriculum: GeneratedCurriculumSnapshot | null }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(apiUrl(generatedCurriculumEndpoint))

  if (!response.ok) {
    throw new Error(`Failed to fetch generated curriculum (${response.status})`)
  }

  const body = (await response.json()) as { generatedCurriculum?: GeneratedCurriculumSnapshot | null }

  return { generatedCurriculum: body.generatedCurriculum ?? null }
}

export async function getCurriculumHistory(
  options: CurriculumRecommendationOptions = {},
): Promise<{ curriculums: GeneratedCurriculumSnapshot[] }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(apiUrl(curriculumHistoryEndpoint))

  if (!response.ok) {
    throw new Error(`Failed to fetch curriculum history (${response.status})`)
  }

  const body = (await response.json()) as { curriculums?: GeneratedCurriculumSnapshot[] }

  return { curriculums: body.curriculums ?? [] }
}

export async function saveGeneratedCurriculumApi(
  snapshot: GeneratedCurriculumSnapshot,
  options: CurriculumRecommendationOptions = {},
): Promise<{ generatedCurriculum: GeneratedCurriculumSnapshot }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(apiUrl(generatedCurriculumEndpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  })

  if (!response.ok) {
    throw new Error(`Failed to save generated curriculum (${response.status})`)
  }

  const body = (await response.json()) as { generatedCurriculum?: GeneratedCurriculumSnapshot }

  if (!body.generatedCurriculum) {
    throw new Error('Response did not include generatedCurriculum')
  }

  return { generatedCurriculum: body.generatedCurriculum }
}

export async function deleteCurriculumHistoryItemApi(
  id: string,
  options: CurriculumRecommendationOptions = {},
): Promise<{ ok: boolean }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(apiUrl(`/api/curriculum/generated/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete curriculum item (${response.status})`)
  }

  return { ok: true }
}

export async function resetGeneratedCurriculumApi(
  options: CurriculumRecommendationOptions = {},
): Promise<{ ok: boolean }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(apiUrl(generatedCurriculumEndpoint), {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to reset generated curriculum (${response.status})`)
  }

  return { ok: true }
}

async function requestServerCurriculumRecommendation(
  request: CurriculumRecommendationRequest,
  fetchImpl: typeof fetch,
): Promise<CurriculumRecommendationResponse> {
  const response = await fetchImpl(apiUrl(curriculumRecommendationEndpoint), {
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
