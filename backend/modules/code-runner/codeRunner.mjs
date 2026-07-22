import vm from 'node:vm'

/**
 * Minimal Node.js-based code sandbox for local learning feedback.
 * This is not a production isolation boundary; Judge Service will harden it later.
 */
export async function runJavaScriptCode(code, { previewOnly = false } = {}) {
  if (previewOnly) {
    return createPreviewRunResult(code)
  }

  const logs = []

  const virtualConsole = {
    log: (...args) => logs.push(args.map(String).join(' ')),
    error: (...args) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
    warn: (...args) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
    info: (...args) => logs.push(`[INFO] ${args.map(String).join(' ')}`),
  }

  const context = {
    console: virtualConsole,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  }

  vm.createContext(context)

  try {
    const result = vm.runInContext(code, context, { timeout: 3000 })
    return {
      success: true,
      logs,
      result: result !== undefined ? String(result) : null,
    }
  } catch (error) {
    return {
      success: false,
      logs,
      error: error.message || String(error),
    }
  }
}

function createPreviewRunResult(code) {
  const componentName = /function\s+([A-Z][A-Za-z0-9_]*)/.exec(code)?.[1] ?? 'App'
  const hasReturn = /return\s*\(/.test(code) || /return\s+</.test(code)

  return {
    success: hasReturn,
    logs: hasReturn
      ? [`${componentName} preview rendered`, 'JSX transpilation is deferred to the Judge Service phase.']
      : [],
    result: null,
    error: hasReturn ? undefined : 'Preview target did not include a renderable return block.',
  }
}
