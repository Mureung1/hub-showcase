import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, writeFileSync, chmodSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EOL, homedir, platform, release } from 'node:os'
import readline from 'node:readline'

type CommandName = 'prepare-runtime' | 'login' | 'verify' | 'report' | 'spike'

type GlobalSnapshot = {
  exists: boolean
  itemCount: number
  skippedCount: number
  hash: string
  newestMtimeIso: string | null
}

type CheckResult = {
  ok: boolean
  detail: string
}

type VerifyResult = {
  generatedAt: string
  os: string
  nodeVersion: string
  packagePin: string
  codexVersionOutput: string
  localCodexBin: string
  codexHome: string
  codexSqliteHome: string
  fakeGlobalTrap: CheckResult
  versionMatch: CheckResult
  authJsonExists: CheckResult
  appServerInitialize: CheckResult
  globalBefore: GlobalSnapshot
  globalAfter: GlobalSnapshot
  globalChanged: boolean
  command: string
}

const sourcePath = fileURLToPath(import.meta.url)
const packageRoot = resolve(dirname(sourcePath), '..')
const runtimeRoot = join(packageRoot, 'runtime')
const codexHome = join(runtimeRoot, 'codex-home')
const codexSqliteHome = join(runtimeRoot, 'sqlite')
const fakeBinDir = join(runtimeRoot, 'fake-bin')
const snapshotsDir = join(runtimeRoot, 'snapshots')
const lastResultPath = join(runtimeRoot, 'last-result.json')
const reportPath = join(packageRoot, 'spike-report.md')
const authJsonPath = join(codexHome, 'auth.json')

const expectedPackageVersion = '0.142.5'
const secretEnvKeys = ['CODEX_ACCESS_TOKEN', 'CODEX_API_KEY', 'OPENAI_API_KEY']

async function main() {
  const [rawCommand = 'spike', ...rest] = process.argv.slice(2)
  const command = rawCommand as CommandName
  const flags = new Set(rest)

  try {
    if (command === 'prepare-runtime') {
      prepareRuntime()
      console.log('Runtime prepared.')
      return
    }

    if (command === 'login') {
      prepareRuntime()
      runLogin(flags.has('--device-auth'))
      return
    }

    if (command === 'verify') {
      prepareRuntime()
      const before = snapshotGlobalCodexHome()
      const result = await runVerify('verify', before)
      finishVerify(result)
      return
    }

    if (command === 'report') {
      writeReport(readLastResult())
      console.log(`Report written: ${reportPath}`)
      return
    }

    if (command === 'spike') {
      await runSpike(flags)
      return
    }

    throw new Error(`Unknown command: ${rawCommand}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  }
}

async function runSpike(flags: Set<string>) {
  prepareRuntime()
  const before = snapshotGlobalCodexHome()
  const forceLogin = flags.has('--force-login')
  const deviceAuth = flags.has('--device-auth')
  const authExists = existsSync(authJsonPath)

  if (forceLogin || !authExists) {
    if (authExists && forceLogin) {
      console.log('Existing isolated auth.json found, but --force-login was requested.')
    }
    runLogin(deviceAuth)
  } else {
    console.log('Existing isolated auth.json found. Skipping login and running verify only.')
    console.log('To re-login, run `npm run spike -- --force-login` or `npm run login`.')
  }

  const result = await runVerify('spike', before)
  finishVerify(result)
}

function prepareRuntime() {
  mkdirSync(runtimeRoot, { recursive: true })
  mkdirSync(codexHome, { recursive: true })
  mkdirSync(codexSqliteHome, { recursive: true })
  mkdirSync(fakeBinDir, { recursive: true })
  mkdirSync(snapshotsDir, { recursive: true })

  writeFileSync(join(codexHome, 'config.toml'), [
    '# PROTOTYPE ONLY - runtime ownership spike',
    'cli_auth_credentials_store = "file"',
    '',
  ].join(EOL))

  const fakeCodexPath = join(fakeBinDir, process.platform === 'win32' ? 'codex.cmd' : 'codex')
  const fakeCodexBody = process.platform === 'win32'
    ? '@echo off\r\necho ERROR: fake global codex trap was invoked. Use the spike-local pinned binary. 1>&2\r\nexit /b 42\r\n'
    : '#!/usr/bin/env sh\nprintf "%s\\n" "ERROR: fake global codex trap was invoked. Use the spike-local pinned binary." >&2\nexit 42\n'
  writeFileSync(fakeCodexPath, fakeCodexBody)
  chmodSync(fakeCodexPath, 0o755)
}

function runLogin(deviceAuth: boolean) {
  const codexBin = getCodexBinPath()
  const args = deviceAuth ? ['login', '--device-auth'] : ['login']

  console.log(`Running local pinned Codex login: ${codexBin}`)
  console.log(`CODEX_HOME: ${codexHome}`)
  console.log('The runner does not store login output, OAuth URLs, or credential contents.')

  const result = spawnSyncInherit(codexBin, args)
  if (result !== 0) {
    throw new Error(`codex login exited with code ${result}`)
  }
}

async function runVerify(command: string, globalBefore: GlobalSnapshot): Promise<VerifyResult> {
  const packagePin = readCodexPackagePin()
  const localCodexBin = getCodexBinPath()
  const fakeGlobalTrap = checkFakeGlobalTrap()
  const codexVersionOutput = runCapture(localCodexBin, ['--version']).stdout.trim()
  const versionMatch = {
    ok: codexVersionOutput.includes(packagePin),
    detail: codexVersionOutput || 'no version output',
  }
  const authJsonExists = {
    ok: existsSync(authJsonPath),
    detail: existsSync(authJsonPath) ? 'auth.json exists in app-managed CODEX_HOME' : 'auth.json missing in app-managed CODEX_HOME',
  }

  const appServerInitialize = authJsonExists.ok
    ? await checkAppServerInitialize(localCodexBin)
    : { ok: false, detail: 'skipped because auth.json is missing' }

  const globalAfter = snapshotGlobalCodexHome()
  const globalChanged = globalBefore.hash !== globalAfter.hash || globalBefore.itemCount !== globalAfter.itemCount

  const result: VerifyResult = {
    generatedAt: new Date().toISOString(),
    os: `${platform()} ${release()}`,
    nodeVersion: process.version,
    packagePin,
    codexVersionOutput,
    localCodexBin,
    codexHome,
    codexSqliteHome,
    fakeGlobalTrap,
    versionMatch,
    authJsonExists,
    appServerInitialize,
    globalBefore,
    globalAfter,
    globalChanged,
    command,
  }

  writeFileSync(lastResultPath, `${JSON.stringify(result, null, 2)}\n`)
  writeReport(result)
  return result
}

function finishVerify(result: VerifyResult) {
  printSummary(result)

  const allOk = [
    result.fakeGlobalTrap,
    result.versionMatch,
    result.authJsonExists,
    result.appServerInitialize,
  ].every((check) => check.ok)

  if (!allOk) {
    throw new Error('Spike verification failed. See spike-report.md for the non-sensitive summary.')
  }
}

function readCodexPackagePin() {
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const pin = packageJson.dependencies?.['@openai/codex']

  if (pin !== expectedPackageVersion) {
    throw new Error(`Expected @openai/codex pin ${expectedPackageVersion}, found ${pin ?? 'missing'}`)
  }

  return pin
}

function getCodexBinPath() {
  const binName = process.platform === 'win32' ? 'codex.cmd' : 'codex'
  const codexBin = join(packageRoot, 'node_modules', '.bin', binName)

  if (!existsSync(codexBin)) {
    throw new Error('Local pinned Codex binary is missing. Run `npm install` in the spike directory first.')
  }

  return codexBin
}

function checkFakeGlobalTrap(): CheckResult {
  const result = runCapture('codex', ['--version'], { allowFailure: true })
  const ok = result.code === 42

  return {
    ok,
    detail: ok
      ? 'bare codex resolved to fake global trap and failed as expected'
      : `bare codex did not hit fake trap; exit code ${result.code}`,
  }
}

function checkAppServerInitialize(codexBin: string): Promise<CheckResult> {
  const child = spawn(codexBin, ['app-server', '--listen', 'stdio://'], {
    cwd: packageRoot,
    env: buildChildEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let stderrBytes = 0

  child.stderr.on('data', (chunk: Buffer) => {
    stderrBytes += chunk.length
  })

  const rl = readline.createInterface({ input: child.stdout })

  return waitForInitialize(child, rl)
    .then((detail) => {
      child.kill('SIGTERM')
      return { ok: true, detail: stderrBytes > 0 ? `${detail}; stderr observed but not stored` : detail }
    })
    .catch((error: Error) => {
      child.kill('SIGTERM')
      return { ok: false, detail: error.message }
    })
    .finally(() => {
      rl.close()
    })
}

function waitForInitialize(child: ReturnType<typeof spawn>, rl: readline.Interface) {
  return new Promise<string>((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('app-server initialize timed out'))
    }, 15000)

    const send = (message: unknown) => {
      child.stdin.write(`${JSON.stringify(message)}\n`)
    }

    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    child.once('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout)
        reject(new Error(`app-server exited before initialize completed with code ${code}`))
      } else if (signal && signal !== 'SIGTERM') {
        clearTimeout(timeout)
        reject(new Error(`app-server exited before initialize completed with signal ${signal}`))
      }
    })

    rl.on('line', (line) => {
      let message: { id?: number; result?: Record<string, unknown>; error?: { message?: string } }
      try {
        message = JSON.parse(line)
      } catch {
        return
      }

      if (message.id !== 1) {
        return
      }

      clearTimeout(timeout)

      if (message.error) {
        reject(new Error(`initialize returned error: ${message.error.message ?? 'unknown error'}`))
        return
      }

      send({ method: 'initialized', params: {} })
      setTimeout(() => {
        const keys = message.result ? Object.keys(message.result).sort().join(', ') : 'no result keys'
        resolvePromise(`initialize succeeded; result keys: ${keys}`)
      }, 100)
    })

    send({
      method: 'initialize',
      id: 1,
      params: {
        clientInfo: {
          name: 'semesterops_runtime_ownership_spike',
          title: 'SemesterOps Runtime Ownership Spike',
          version: '0.0.0',
        },
      },
    })
  })
}

function buildChildEnv() {
  const env: NodeJS.ProcessEnv = { ...process.env }

  for (const key of secretEnvKeys) {
    delete env[key]
  }

  env.CODEX_HOME = codexHome
  env.CODEX_SQLITE_HOME = codexSqliteHome
  env.PATH = `${fakeBinDir}${process.env.PATH ? `${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` : ''}`
  env.RUST_LOG = env.RUST_LOG ?? 'error'

  return env
}

function runCapture(command: string, args: string[], options: { allowFailure?: boolean } = {}) {
  const output = spawnSyncCapture(command, args)

  if (!options.allowFailure && output.code !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${output.code}`)
  }

  return output
}

function spawnSyncCapture(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    env: buildChildEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    throw result.error
  }

  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function spawnSyncInherit(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    env: buildChildEnv(),
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  return result.status ?? 1
}

function snapshotGlobalCodexHome(): GlobalSnapshot {
  const globalCodexHome = join(homedir(), '.codex')

  if (!existsSync(globalCodexHome)) {
    return { exists: false, itemCount: 0, skippedCount: 0, hash: 'missing', newestMtimeIso: null }
  }

  const hash = createHash('sha256')
  let itemCount = 0
  let skippedCount = 0
  let newestMtimeMs = 0

  const visit = (dir: string) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      skippedCount += 1
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      let stats
      try {
        stats = lstatSync(fullPath)
      } catch {
        skippedCount += 1
        continue
      }
      const relativePath = relative(globalCodexHome, fullPath)
      itemCount += 1
      newestMtimeMs = Math.max(newestMtimeMs, stats.mtimeMs)
      hash.update(`${relativePath}\t${stats.isDirectory() ? 'd' : 'f'}\t${stats.size}\t${Math.floor(stats.mtimeMs)}\n`)

      if (stats.isDirectory()) {
        visit(fullPath)
      }
    }
  }

  visit(globalCodexHome)

  const snapshot = {
    exists: true,
    itemCount,
    skippedCount,
    hash: hash.digest('hex').slice(0, 16),
    newestMtimeIso: newestMtimeMs > 0 ? new Date(newestMtimeMs).toISOString() : null,
  }

  const snapshotFile = join(snapshotsDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-global-summary.json`)
  writeFileSync(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`)

  return snapshot
}

function readLastResult(): VerifyResult | null {
  if (!existsSync(lastResultPath)) {
    return null
  }

  return JSON.parse(readFileSync(lastResultPath, 'utf8')) as VerifyResult
}

function writeReport(result: VerifyResult | null) {
  if (!result) {
    writeFileSync(reportPath, [
      '# SemesterOps Runtime Ownership Spike Report',
      '',
      '작성일: 2026-07-07  ',
      '상태: 미실행',
      '',
      '## 결과 요약',
      '',
      '| 항목 | 결과 |',
      '| --- | --- |',
      '| 실행 여부 | 아직 검증 결과가 없음 |',
      '| 민감정보 | 기록하지 않음 |',
      '',
    ].join(EOL))
    return
  }

  const status = [
    result.fakeGlobalTrap,
    result.versionMatch,
    result.authJsonExists,
    result.appServerInitialize,
  ].every((check) => check.ok) ? '성공' : '실패'

  const globalChangeText = result.globalChanged
    ? '변화 감지됨. 현재 Codex 세션 등 외부 요인 가능성이 있어 원인 단정 안 함'
    : '변화 없음'

  const lines = [
    '# SemesterOps Runtime Ownership Spike Report',
    '',
    `작성일: ${formatKoreanDate(result.generatedAt)}  `,
    `상태: ${status}`,
    '',
    '## 실행 환경',
    '',
    '| 항목 | 값 |',
    '| --- | --- |',
    `| OS | ${escapeTable(result.os)} |`,
    `| Node | ${escapeTable(result.nodeVersion)} |`,
    `| @openai/codex pin | ${escapeTable(result.packagePin)} |`,
    `| local Codex version | ${escapeTable(result.codexVersionOutput)} |`,
    `| local Codex binary | \`${escapeTable(result.localCodexBin)}\` |`,
    `| CODEX_HOME | \`${escapeTable(result.codexHome)}\` |`,
    `| CODEX_SQLITE_HOME | \`${escapeTable(result.codexSqliteHome)}\` |`,
    `| 실행 명령 | ${escapeTable(result.command)} |`,
    '',
    '## 결과 요약',
    '',
    '| 기준 | 결과 | 관찰 |',
    '| --- | --- | --- |',
    `| Binary ownership | ${mark(result.fakeGlobalTrap.ok)} | ${escapeTable(result.fakeGlobalTrap.detail)} |`,
    `| Version ownership | ${mark(result.versionMatch.ok)} | ${escapeTable(result.versionMatch.detail)} |`,
    `| State ownership | ${mark(true)} | app-managed CODEX_HOME과 CODEX_SQLITE_HOME을 child env에 지정 |`,
    `| Subscription auth proof | ${mark(result.authJsonExists.ok)} | ${escapeTable(result.authJsonExists.detail)} |`,
    `| App-server lifecycle | ${mark(result.appServerInitialize.ok)} | ${escapeTable(result.appServerInitialize.detail)} |`,
    '| Global operation safety | PASS | 전역 `~/.codex`에 rename/delete/chmod/reset 수행 없음 |',
    `| Global snapshot comparison | ${result.globalChanged ? 'OBSERVED_CHANGE' : 'NO_CHANGE'} | ${escapeTable(globalChangeText)} |`,
    '',
    '## 전역 상태 확인',
    '',
    '| 구분 | exists | item count | skipped | hash | newest mtime |',
    '| --- | --- | ---: | ---: | --- | --- |',
    `| before | ${String(result.globalBefore.exists)} | ${result.globalBefore.itemCount} | ${result.globalBefore.skippedCount} | ${result.globalBefore.hash} | ${result.globalBefore.newestMtimeIso ?? '-'} |`,
    `| after | ${String(result.globalAfter.exists)} | ${result.globalAfter.itemCount} | ${result.globalAfter.skippedCount} | ${result.globalAfter.hash} | ${result.globalAfter.newestMtimeIso ?? '-'} |`,
    '',
    '전역 `~/.codex`는 rename, delete, chmod, reset하지 않았고 파일 내용도 읽지 않았다. Snapshot은 파일명/크기/mtime 기반 aggregate hash만 사용했다.',
    '',
    '## 민감정보 처리',
    '',
    '| 항목 | 처리 |',
    '| --- | --- |',
    '| `auth.json` 내용 | 읽거나 기록하지 않음 |',
    '| OAuth URL | report 또는 runtime summary에 저장하지 않음 |',
    '| raw login log | 저장하지 않음 |',
    '| token 계열 환경변수 | child env에서 제거 |',
    '',
    '## 남은 리스크',
    '',
    '- app-server는 공식 문서상 experimental이므로 pinned version별 smoke test가 계속 필요하다.',
    '- macOS desktop packaging에서 native optional dependency가 누락되지 않는지 별도 packaging spike가 필요하다.',
    '- file auth store는 격리 증명을 위해 선택한 방식이며, 제품 UX에서는 keychain 기반 운영과 비교해야 한다.',
    '- 전역 snapshot 변화가 감지될 경우 현재 실행 중인 Codex app 자체의 로그 갱신과 spike 영향을 구분하기 어렵다.',
    '',
    '## 다음 단계',
    '',
    '- 성공 결과를 바탕으로 SemesterOps runtime adapter 인터페이스를 설계한다.',
    '- 다음 spike에서는 실제 학기 task가 아니라 `thread/start`와 취소/approval 흐름 같은 runtime lifecycle만 확장 검증한다.',
    '',
  ]

  writeFileSync(reportPath, lines.join(EOL))
}

function printSummary(result: VerifyResult) {
  console.log('Spike verification summary:')
  console.log(`- fake global trap: ${result.fakeGlobalTrap.ok ? 'ok' : 'failed'}`)
  console.log(`- version match: ${result.versionMatch.ok ? 'ok' : 'failed'} (${result.codexVersionOutput})`)
  console.log(`- isolated auth.json: ${result.authJsonExists.ok ? 'present' : 'missing'}`)
  console.log(`- app-server initialize: ${result.appServerInitialize.ok ? 'ok' : 'failed'}`)
  console.log(`- global ~/.codex changed: ${result.globalChanged ? 'yes' : 'no'}`)
  console.log(`- report: ${reportPath}`)
}

function mark(ok: boolean) {
  return ok ? 'PASS' : 'FAIL'
}

function escapeTable(value: string) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function formatKoreanDate(iso: string) {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

main()
