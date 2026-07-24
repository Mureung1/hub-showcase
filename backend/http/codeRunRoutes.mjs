import {
  runDockerfileCode,
  runJavaScriptCode,
  runPythonCode,
  runShellCode,
} from '../modules/code-runner/codeRunner.mjs'

export async function handleCodeRunApiRequest({ method, url, bodyText }) {
  if (method === 'POST' && url === '/api/code/run') {
    try {
      const { code, language, css } = JSON.parse(bodyText || '{}')

      if (!code) {
        return { status: 400, body: { error: 'Code is required' } }
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
