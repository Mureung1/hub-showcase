export type CodeRunLanguage =
  'javascript' | 'jsx' | 'tsx' | 'shell' | 'dockerfile' | 'python' | string

export type ReactPreviewBundle = {
  kind: 'react'
  code: string
  css: string
  componentName: string
}

export type CodeRunResult = {
  success: boolean
  logs: string[]
  error?: string
  result?: string | null
  preview?: ReactPreviewBundle
}

export const codeRunEndpoint = '/api/code/run'

export type ExecuteCodeOptions = {
  css?: string
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

export async function executeCode(
  code: string,
  language: CodeRunLanguage,
  options: ExecuteCodeOptions = {},
): Promise<CodeRunResult> {
  const response = await (options.fetchImpl ?? fetch)(codeRunEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, css: options.css ?? '' }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`코드 실행 요청에 실패했습니다. (${response.status})`)
  }

  return (await response.json()) as CodeRunResult
}
