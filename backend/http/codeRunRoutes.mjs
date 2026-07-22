import { runDockerfileCode, runJavaScriptCode, runPythonCode, runShellCode } from '../modules/code-runner/codeRunner.mjs'

export async function handleCodeRunApiRequest({ method, url, bodyText }) {
  if (method === 'POST' && url === '/api/code/run') {
    try {
      const { code, language } = JSON.parse(bodyText || '{}')

      if (!code) {
        return { status: 400, body: { error: 'Code is required' } }
      }

      if (!language || language === 'javascript' || language === 'jsx') {
        const result = await runJavaScriptCode(code, { previewOnly: language === 'jsx' })
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
    } catch (e) {
      return { status: 400, body: { error: 'Invalid JSON body' } }
    }
  }

  return null
}
