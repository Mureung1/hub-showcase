export type CodeRunResult = {
  success: boolean
  logs: string[]
  error?: string
  result?: string | null
}

export const codeRunEndpoint = '/api/code/run'

export async function executeCode(code: string, language: string, fetchImpl: typeof fetch = fetch): Promise<CodeRunResult> {
  const response = await fetchImpl(codeRunEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language }),
  })

  if (!response.ok) {
    throw new Error(`코드 실행에 실패했습니다. (${response.status})`)
  }

  return (await response.json()) as CodeRunResult
}
