import {
  runDockerfileCode,
  runJavaScriptCode,
  runPythonCode,
  runShellCode,
} from '../modules/code-runner/codeRunner.mjs'

const maxCodeLength = 20000
const rateLimitWindowMs = 60000
const rateLimitMaxRequests = 30
const requestLogByIp = new Map()

function isRateLimited(ip) {
  const key = ip ?? 'unknown'
  const now = Date.now()
  const timestamps = (requestLogByIp.get(key) ?? []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs,
  )

  if (timestamps.length >= rateLimitMaxRequests) {
    requestLogByIp.set(key, timestamps)
    return true
  }

  timestamps.push(now)
  requestLogByIp.set(key, timestamps)
  return false
}

export async function handleCodeRunApiRequest({ method, url, bodyText, ip }) {
  if (method === 'POST' && url === '/api/code/run') {
    if (isRateLimited(ip)) {
      return {
        status: 429,
        body: { error: 'rate_limited', message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      }
    }

    try {
      const { code, language, css } = JSON.parse(bodyText || '{}')

      if (!code) {
        return { status: 400, body: { error: 'Code is required' } }
      }

      if (code.length > maxCodeLength) {
        return { status: 413, body: { error: 'code_too_large', message: '코드가 너무 깁니다.' } }
      }

      if (!language || language === 'javascript' || language === 'jsx' || language === 'tsx') {
        const result = await runJavaScriptCode(code, {
          previewOnly: language === 'jsx' || language === 'tsx',
          css: typeof css === 'string' ? css : '',
          language,
        })
        return { status: 200, body: result }
      }

      if (language === 'shell') {
        const result = await runShellCode(code)
        return { status: 200, body: result }
      }

      if (language === 'dockerfile') {
        const result = await runDockerfileCode(code)
        return { status: 200, body: result }
      }

      if (language === 'python') {
        const result = await runPythonCode(code)
        return { status: 200, body: result }
      }

      return {
        status: 200,
        body: {
          success: false,
          logs: [],
          error: `Execution for language '${language}' is not implemented yet.`,
        },
      }
    } catch {
      return { status: 400, body: { error: 'Invalid JSON body' } }
    }
  }

  return null
}
