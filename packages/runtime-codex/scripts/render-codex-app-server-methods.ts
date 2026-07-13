import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePackageCodexBinPath } from '../src/raw-client.js'

export type CodexMethodDirection =
  | 'clientRequest'
  | 'serverRequest'
  | 'serverNotification'
  | 'clientNotification'

export type CodexMethodIntegration =
  | 'schema-only'
  | 'raw-wrapper'
  | 'client-host'
  | 'web-adapter'
  | 'product-ui'

export type CodexMethodAdoption =
  | 'unreviewed'
  | 'baseline'
  | 'later'
  | 'case-driven'
  | 'excluded'

export type CodexMethodDecision = {
  integration?: CodexMethodIntegration
  adoption?: CodexMethodAdoption
  note?: string
}

export type CodexMethodDecisions = Record<string, CodexMethodDecision>

export type CodexProtocolSources = Record<CodexMethodDirection, string>

export type RenderCodexAppServerMethodsInput = {
  codexVersion: string
  stableSources: CodexProtocolSources
  experimentalSources: CodexProtocolSources
  decisions: CodexMethodDecisions
}

type CodexMethodRow = {
  method: string
  direction: CodexMethodDirection
  maturity: 'stable' | 'experimental'
}

const directionOrder: CodexMethodDirection[] = [
  'clientRequest',
  'serverRequest',
  'serverNotification',
  'clientNotification',
]

const directionLabels: Record<CodexMethodDirection, string> = {
  clientRequest: 'Client 요청',
  serverRequest: 'Server 요청',
  serverNotification: 'Server 알림',
  clientNotification: 'Client 알림',
}

const integrations = new Set<CodexMethodIntegration>([
  'schema-only',
  'raw-wrapper',
  'client-host',
  'web-adapter',
  'product-ui',
])

const adoptions = new Set<CodexMethodAdoption>([
  'unreviewed',
  'baseline',
  'later',
  'case-driven',
  'excluded',
])

export function parseCodexMethodDecisions(
  value: unknown,
): CodexMethodDecisions {
  if (!isRecord(value)) {
    throw new Error('Codex method decisions must be a JSON object')
  }

  const decisions: CodexMethodDecisions = {}

  for (const [method, rawDecision] of Object.entries(value)) {
    if (!isRecord(rawDecision)) {
      throw new Error(`Decision for ${method} must be a JSON object`)
    }

    for (const field of Object.keys(rawDecision)) {
      if (field !== 'integration' && field !== 'adoption' && field !== 'note') {
        throw new Error(`Unknown decision field for ${method}: ${field}`)
      }
    }

    const { integration, adoption, note } = rawDecision

    if (
      integration !== undefined &&
      (typeof integration !== 'string' ||
        !integrations.has(integration as CodexMethodIntegration))
    ) {
      throw new Error(`Invalid integration for ${method}: ${String(integration)}`)
    }

    if (
      adoption !== undefined &&
      (typeof adoption !== 'string' ||
        !adoptions.has(adoption as CodexMethodAdoption))
    ) {
      throw new Error(`Invalid adoption for ${method}: ${String(adoption)}`)
    }

    if (note !== undefined && typeof note !== 'string') {
      throw new Error(`Invalid note for ${method}: expected a string`)
    }

    decisions[method] = {
      integration: integration as CodexMethodIntegration | undefined,
      adoption: adoption as CodexMethodAdoption | undefined,
      note,
    }
  }

  return decisions
}

export function assertCodexBinaryVersionOutput(
  output: string,
  expectedVersion: string,
): void {
  const actualVersion = output.match(/\b\d+\.\d+\.\d+\b/)?.[0]

  if (!actualVersion) {
    throw new Error(`Could not read Codex binary version from: ${output}`)
  }

  if (actualVersion !== expectedVersion) {
    throw new Error(
      `Codex binary version ${actualVersion} does not match package pin ${expectedVersion}`,
    )
  }
}

export function renderCodexAppServerMethods(
  input: RenderCodexAppServerMethodsInput,
): string {
  const stableRows = readRows(input.stableSources, 'stable')
  const allExperimentalRows = readRows(
    input.experimentalSources,
    'experimental',
  )
  assertUniqueMethodDirections([...stableRows, ...allExperimentalRows])
  const stableMethods = new Set(stableRows.map((row) => row.method))
  const experimentalRows = allExperimentalRows.filter(
    (row) => !stableMethods.has(row.method),
  )
  const rows = [...stableRows, ...experimentalRows]
  const knownMethods = new Set(rows.map((row) => row.method))

  for (const method of Object.keys(input.decisions)) {
    if (!knownMethods.has(method)) {
      throw new Error(`Decision references unknown Codex method: ${method}`)
    }
  }

  const lines = [
    '# Codex App Server 전체 raw method 목록',
    '',
    '분류: 활성',
    '',
    '성숙도: 구현됨',
    '',
    '> 이 문서는 generated artifact다. 직접 수정하지 않고 `npm run generate:codex-methods -w @ay-ple/runtime-codex`로 다시 생성한다.',
    '',
    'Pinned generated schema가 전체 raw method 목록을 소유하고, [codex-method-decisions.json](../../packages/runtime-codex/codex-method-decisions.json)은 AY-PLE가 검토한 method의 연결 단계와 채택 판단만 덧붙이는 sparse overlay다. JSON에 없는 method도 `schema-only`·`unreviewed` 기본값으로 이 문서에 나타난다.',
    '',
    '`stable`은 기본 generated schema에 존재하고 `experimental`은 `generate-ts --experimental`에서만 추가되는 method다. `연결 단계`는 제품용 Codex Client 경로에서 명시적으로 구현한 가장 먼 단계를 뜻하며, generic notification transport나 developer-only Runtime Harness가 method를 우연히 통과시키는 것은 승격 근거로 보지 않는다.',
    '',
    '| 항목 | 값 |',
    '| --- | --- |',
    `| Codex 패키지 | \`@openai/codex@${escapeTableCell(input.codexVersion)}\` |`,
    `| Stable method 수 | ${stableRows.length} |`,
    `| Experimental-only method 수 | ${experimentalRows.length} |`,
    `| 전체 method 수 | ${rows.length} |`,
    '',
    '| 연결 단계 | 의미 |',
    '| --- | --- |',
    '| `schema-only` | Pinned schema에서만 확인했으며 제품용 wrapper가 없다. |',
    '| `raw-wrapper` | `packages/runtime-codex`의 generated-schema-backed wrapper가 있다. |',
    '| `client-host` | Headless Codex Client Host Interface에 연결됐다. |',
    '| `web-adapter` | Browser-safe adapter로 노출됐다. |',
    '| `product-ui` | 제품 React shell에서 사용할 수 있다. |',
    '',
    '| 채택 | 의미 |',
    '| --- | --- |',
    '| `unreviewed` | AY-PLE 채택 여부를 아직 판단하지 않았다. |',
    '| `baseline` | Codex Client Baseline에 포함한다. |',
    '| `later` | 유효하지만 baseline 이후에 다룬다. |',
    '| `case-driven` | 구체적인 제품 use case가 생길 때 검토한다. |',
    '| `excluded` | AY-PLE에서 사용하지 않기로 결정했다. |',
    '',
  ]

  for (const direction of directionOrder) {
    lines.push(`## ${directionLabels[direction]}`, '')
    lines.push(
      '| Method 식별자 | 성숙도 | 연결 단계 | 채택 | 비고 |',
      '| --- | --- | --- | --- | --- |',
    )

    for (const row of rows.filter((candidate) => candidate.direction === direction)) {
      const decision = input.decisions[row.method] ?? {}
      lines.push(
        `| \`${row.method}\` | ${row.maturity} | ${decision.integration ?? 'schema-only'} | ${decision.adoption ?? 'unreviewed'} | ${escapeTableCell(decision.note ?? '')} |`,
      )
    }

    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

function readRows(
  sources: CodexProtocolSources,
  maturity: CodexMethodRow['maturity'],
): CodexMethodRow[] {
  return directionOrder.flatMap((direction) => {
    const methods = readMethods(sources[direction], `${maturity} ${direction}`)

    return [...methods]
      .sort((left, right) => left.localeCompare(right))
      .map((method) => ({ method, direction, maturity }))
  })
}

function readMethods(source: string, sourceName: string): Set<string> {
  const propertyCount = [
    ...source.matchAll(/(?:["']method["']|\bmethod\b)\s*:/g),
  ].length
  const matches = [
    ...source.matchAll(
      /(?:["']method["']|\bmethod\b)\s*:\s*(["'])([^"']+)\1/g,
    ),
  ]

  if (propertyCount !== matches.length) {
    throw new Error(
      `Could not extract every method from ${sourceName} schema: found ${propertyCount} method properties but captured ${matches.length} literal methods`,
    )
  }

  if (matches.length === 0) {
    throw new Error(`No Codex methods found in ${sourceName} schema`)
  }

  return new Set(
    matches.map((match) => match[2]),
  )
}

function assertUniqueMethodDirections(rows: CodexMethodRow[]): void {
  const directionsByMethod = new Map<string, CodexMethodDirection>()

  for (const row of rows) {
    const existingDirection = directionsByMethod.get(row.method)

    if (existingDirection && existingDirection !== row.direction) {
      throw new Error(
        `Codex method appears in multiple message directions: ${row.method}`,
      )
    }

    directionsByMethod.set(row.method, row.direction)
  }
}

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll(/\r?\n/g, '<br>')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const scriptPath = fileURLToPath(import.meta.url)
const packageRoot = resolve(dirname(scriptPath), '..')
const workspaceRoot = resolve(packageRoot, '../..')
const generatedProtocolDir = join(
  packageRoot,
  'src',
  'internal',
  'codex-app-server-protocol',
  'generated',
)
const decisionsPath = join(packageRoot, 'codex-method-decisions.json')
const outputPath = join(
  workspaceRoot,
  'docs',
  'architecture',
  'codex-app-server-method-inventory.md',
)

const protocolFileNames: Record<CodexMethodDirection, string> = {
  clientRequest: 'ClientRequest.ts',
  serverRequest: 'ServerRequest.ts',
  serverNotification: 'ServerNotification.ts',
  clientNotification: 'ClientNotification.ts',
}

export function generateCodexAppServerMethodInventory(): void {
  const packageJson = parseJsonFile(join(packageRoot, 'package.json'))
  const codexVersion = readCodexVersion(packageJson)
  const decisions = parseCodexMethodDecisions(parseJsonFile(decisionsPath))
  const codexBinPath = resolvePackageCodexBinPath(packageRoot)
  const experimentalDir = mkdtempSync(
    join(tmpdir(), 'ay-ple-codex-app-server-experimental-'),
  )

  try {
    verifyCodexBinaryVersion(codexBinPath, codexVersion)
    generateExperimentalProtocol(experimentalDir, codexBinPath)
    const markdown = renderCodexAppServerMethods({
      codexVersion,
      stableSources: readProtocolSources(generatedProtocolDir),
      experimentalSources: readProtocolSources(experimentalDir),
      decisions,
    })

    writeFileSync(outputPath, markdown)
  } finally {
    rmSync(experimentalDir, { recursive: true, force: true })
  }

  console.log(`Generated Codex app-server method inventory at ${outputPath}`)
}

function readProtocolSources(dir: string): CodexProtocolSources {
  return Object.fromEntries(
    directionOrder.map((direction) => [
      direction,
      readFileSync(join(dir, protocolFileNames[direction]), 'utf8'),
    ]),
  ) as CodexProtocolSources
}

function verifyCodexBinaryVersion(
  codexBinPath: string,
  expectedVersion: string,
): void {
  const result = spawnSync(codexBinPath, ['--version'], {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    throw result.error
  }

  const output = [result.stdout, result.stderr]
    .filter((part): part is string => typeof part === 'string')
    .filter((part) => part.trim().length > 0)
    .join('\n')

  if (result.status !== 0) {
    throw new Error(
      `codex --version failed with code ${result.status}${output ? `\n${output}` : ''}`,
    )
  }

  assertCodexBinaryVersionOutput(output, expectedVersion)
}

function generateExperimentalProtocol(
  outputDir: string,
  codexBinPath: string,
): void {
  const result = spawnSync(
    codexBinPath,
    ['app-server', 'generate-ts', '--experimental', '--out', outputDir],
    {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter((part): part is string => typeof part === 'string')
      .filter((part) => part.trim().length > 0)
      .join('\n')
    throw new Error(
      `codex app-server experimental schema generation failed with code ${result.status}${detail ? `\n${detail}` : ''}`,
    )
  }
}

function parseJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function readCodexVersion(packageJson: unknown): string {
  if (!isRecord(packageJson) || !isRecord(packageJson.dependencies)) {
    throw new Error('runtime-codex package.json must declare dependencies')
  }

  const version = packageJson.dependencies['@openai/codex']

  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('@openai/codex dependency must use an exact semver version')
  }

  return version
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  generateCodexAppServerMethodInventory()
}
