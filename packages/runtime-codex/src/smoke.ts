import { pathToFileURL } from 'node:url'
import { runCodexInitializeSmoke, type CodexRawClientOptions } from './index.js'

async function main(): Promise<void> {
  const timeoutMs = process.env.CODEX_SMOKE_TIMEOUT_MS
    ? Number(process.env.CODEX_SMOKE_TIMEOUT_MS)
    : undefined

  if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || timeoutMs < 1)) {
    throw new Error('CODEX_SMOKE_TIMEOUT_MS must be a positive integer')
  }

  const options: CodexRawClientOptions = {
    codexBinPath: process.env.CODEX_BIN_PATH,
    cwd: process.env.CODEX_SMOKE_CWD,
    codexHome: process.env.CODEX_HOME,
    codexSqliteHome: process.env.CODEX_SQLITE_HOME,
    timeoutMs,
  }
  const result = await runCodexInitializeSmoke(options)

  if (!result.ok) {
    console.error('Codex app-server initialize smoke failed.')
    console.error(`Reason: ${result.error}`)
    console.error(`Codex binary: ${result.codexBinPath}`)
    console.error(`CODEX_HOME: ${result.runtimeHome.codexHome}`)
    console.error(`CODEX_SQLITE_HOME: ${result.runtimeHome.codexSqliteHome}`)
    console.error('No OAuth/login command was run.')
    console.error(`Debug events observed: ${result.debugLog.length}`)
    process.exitCode = 1
    return
  }

  console.log('Codex app-server initialize smoke succeeded.')
  console.log(`Codex binary: ${result.codexBinPath}`)
  console.log(`CODEX_HOME: ${result.runtimeHome.codexHome}`)
  console.log(`CODEX_SQLITE_HOME: ${result.runtimeHome.codexSqliteHome}`)
  console.log(`User agent: ${result.response.userAgent}`)
  console.log(`Platform: ${result.response.platformFamily}/${result.response.platformOs}`)
  console.log(`Debug events observed: ${result.debugLog.length}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
