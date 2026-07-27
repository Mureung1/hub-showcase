import vm from 'node:vm'
import { transform } from 'esbuild'
import { assertSupportedReactPreviewImports } from './reactPreviewSource.mjs'
import {
  clearInterval as nodeClearInterval,
  clearTimeout as nodeClearTimeout,
  setInterval as nodeSetInterval,
  setTimeout as nodeSetTimeout,
} from 'node:timers'

/**
 * Minimal Node.js-based code sandbox for local learning feedback.
 * This is not a production isolation boundary; Judge Service will harden it later.
 */
export async function runJavaScriptCode(
  code,
  { previewOnly = false, css = '', language = 'jsx' } = {},
) {
  if (previewOnly) {
    return createReactPreviewRunResult(code, { css, language })
  }

  const maxLogEntries = 200
  const maxLogEntryLength = 2000
  const logs = []
  const pushLog = (line) => {
    if (logs.length >= maxLogEntries) {
      return
    }
    logs.push(line.length > maxLogEntryLength ? line.slice(0, maxLogEntryLength) + '...(truncated)' : line)
  }

  const virtualConsole = {
    log: (...args) => pushLog(args.map(String).join(' ')),
    error: (...args) => pushLog('[ERROR] ' + args.map(String).join(' ')),
    warn: (...args) => pushLog('[WARN] ' + args.map(String).join(' ')),
    info: (...args) => pushLog('[INFO] ' + args.map(String).join(' ')),
  }

  // Timers scheduled by sandboxed code are real Node timers; track and clear
  // them after this run so a runaway setInterval can't outlive the request.
  const activeTimerIds = new Set()
  const trackedSetTimeout = (handler, delay, ...args) => {
    const id = nodeSetTimeout(handler, delay, ...args)
    activeTimerIds.add(id)
    return id
  }
  const trackedSetInterval = (handler, delay, ...args) => {
    const id = nodeSetInterval(handler, delay, ...args)
    activeTimerIds.add(id)
    return id
  }
  const clearAllTrackedTimers = () => {
    for (const id of activeTimerIds) {
      nodeClearTimeout(id)
      nodeClearInterval(id)
    }
    activeTimerIds.clear()
  }

  const context = {
    console: virtualConsole,
    setTimeout: trackedSetTimeout,
    clearTimeout: nodeClearTimeout,
    setInterval: trackedSetInterval,
    clearInterval: nodeClearInterval,
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
  } finally {
    clearAllTrackedTimers()
  }
}

async function createReactPreviewRunResult(code, { css = '', language = 'jsx' } = {}) {
  const componentName = /function\s+([A-Z][A-Za-z0-9_]*)/.exec(code)?.[1] ?? 'App'

  try {
    assertSupportedReactPreviewImports(code)
    const transformed = await transform(createReactPreviewSource(code), {
      format: 'cjs',
      jsx: 'automatic',
      loader: language === 'tsx' ? 'tsx' : 'jsx',
      target: 'es2022',
    })

    return {
      success: true,
      logs: [componentName + ' preview bundle transformed'],
      result: null,
      preview: {
        kind: 'react',
        code: transformed.code,
        css,
        componentName,
      },
    }
  } catch (error) {
    return {
      success: false,
      logs: [],
      result: null,
      error: error.message || String(error),
    }
  }
}

function createReactPreviewSource(code) {
  let source = code
    .replace(/import\s+['"][^'"]+\.css['"];?/g, '')
    .replace(
      /import\s+.*?\s+from\s+['"](?!react(?:\/|['"]))(?!react-dom(?:\/|['"]))(?!@?vite\/)[^'"]+['"];?/g,
      '',
    )

  let previewComponentName =
    /export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/.exec(source)?.[1] ??
    /export\s+default\s+class\s+([A-Z][A-Za-z0-9_]*)/.exec(source)?.[1] ??
    /function\s+([A-Z][A-Za-z0-9_]*)/.exec(source)?.[1] ??
    'App'

  source = source.replace(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/, 'function $1')
  source = source.replace(/export\s+default\s+class\s+([A-Z][A-Za-z0-9_]*)/, 'class $1')
  source = source.replace(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/g, (_, name) => {
    previewComponentName = name
    return ''
  })
  source = source.replace(/export\s+\{[^}]+\}\s*;?/g, '')

  return source + '\nmodule.exports.default = ' + previewComponentName + ';'
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

    logs.push('$ ' + line)
  }

  return {
    success: true,
    logs: logs.length ? logs : ['Shell script completed.'],
    result: null,
  }
}

export async function runDockerfileCode(code) {
  const hasFrom = /^FROM\s+\S+/im.test(code)
  const hasWorkdir = /^WORKDIR\s+\S+/im.test(code)
  const hasCommand = /^(CMD|ENTRYPOINT)\s+/im.test(code)
  const logs = [
    '#1 [internal] load build definition from Dockerfile',
    '#1 transferring dockerfile: 512B done',
    hasFrom ? '#2 [base] resolve base image done' : '#2 [base] missing FROM instruction',
    hasWorkdir
      ? '#3 [workspace] set working directory done'
      : '#3 [workspace] WORKDIR not configured',
    hasCommand ? '#4 [runtime] command configured' : '#4 [runtime] CMD or ENTRYPOINT missing',
  ]
  const success = hasFrom && hasCommand

  return {
    success,
    logs,
    result: null,
    error: success
      ? undefined
      : 'Dockerfile must include FROM and CMD or ENTRYPOINT for this practice.',
  }
}

export async function runPythonCode(code) {
  const logs = []
  const printCalls = [...code.matchAll(/print\((['"])(.*?)\1\)/g)].map((match) => match[2])

  if (printCalls.length > 0) {
    logs.push(...printCalls)
  } else if (/FastAPI\(/.test(code)) {
    logs.push('FastAPI app object detected')
    logs.push('GET /learning-topics/{topic} route ready')
  } else if (/def\s+\w+\s*\(/.test(code)) {
    logs.push('Python function parsed successfully')
  }

  return {
    success: true,
    logs: logs.length ? logs : ['Python script completed.'],
    result: null,
  }
}
