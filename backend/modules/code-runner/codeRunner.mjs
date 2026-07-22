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

export async function runShellCode(code) {
  const logs = []
  const lines = code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  for (const line of lines) {
    if (line.startsWith('echo ')) {
      logs.push(line.slice(5).replace(/^['"]|['"]$/g, ''))
      continue
    }

    if (line === 'pwd') {
      logs.push('/workspace/icu-practice')
      continue
    }

    if (line === 'ls' || line === 'ls -la') {
      logs.push('total 24')
      logs.push('drwxr-xr-x  4 learner learner 4096 .')
      logs.push('-rw-r--r--  1 learner learner  420 ops-checklist.sh')
      logs.push('-rw-r--r--  1 learner learner  216 mission-notes.md')
      continue
    }

    if (line === 'ps aux | head') {
      logs.push('USER       PID %CPU %MEM COMMAND')
      logs.push('learner      1  0.0  0.1 node /workspace/server.js')
      logs.push('learner     12  0.0  0.0 sh ops-checklist.sh')
      continue
    }

    logs.push(`$ ${line}`)
  }

  return {
    success: true,
    logs: logs.length ? logs : ['Shell script completed.'],
    result: null,
  }
}
