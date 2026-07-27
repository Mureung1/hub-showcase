export type TutorMessageRole = 'user' | 'tutor'

export type TutorHistoryEntry = {
  role: TutorMessageRole
  text: string
}

export type AskTutorRequest = {
  question: string
  code: string
  fileName: string
  missionTitle: string
  missionDetail: string
  history: TutorHistoryEntry[]
}

export type AskTutorResponse = {
  answer: string
}

export const tutorAskEndpoint = '/api/tutor/ask'

export type AskTutorOptions = {
  signal?: AbortSignal
}

export async function askTutor(
  request: AskTutorRequest,
  fetchImpl: typeof fetch = fetch,
  options: AskTutorOptions = {},
): Promise<AskTutorResponse> {
  const response = await fetchImpl(tutorAskEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`튜터 질문 요청에 실패했습니다. (${response.status})`)
  }

  return (await response.json()) as AskTutorResponse
}
