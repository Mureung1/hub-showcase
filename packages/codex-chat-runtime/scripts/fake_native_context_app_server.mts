import {
  appendFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

type JsonObject = Record<string, unknown>

const scenario = process.argv[2] ?? 'nominal'
const configuredJournalPath =
  process.env.AY_PLE_NATIVE_CONTEXT_PROBE_JOURNAL
if (
  !configuredJournalPath ||
  !path.isAbsolute(configuredJournalPath)
) {
  throw new Error('fake native context journal is required')
}
const journalPath: string = configuredJournalPath

const journal = {
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  environment: Object.fromEntries(
    [
      'AY_PLE_NATIVE_CONTEXT_PROBE_JOURNAL',
      'CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG',
      'CODEX_HOME',
      'CODEX_SQLITE_HOME',
      'HOME',
      'LANG',
      'LC_ALL',
      'PATH',
      'TMPDIR',
    ].map((key) => [key, process.env[key] ?? null]),
  ),
  messages: [] as JsonObject[],
  pid: process.pid,
  signals: [] as string[],
  stdinEnded: false,
}

function saveJournal(): void {
  writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, 'utf8')
}

function send(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function initializeResult(id: unknown): JsonObject {
  return {
    id,
    result: {
      codexHome: process.env.CODEX_HOME,
      platformFamily: 'unix',
      platformOs: 'macos',
      serverInfo: {
        name: 'fake-native-context-app-server',
        version: '0.144.4',
      },
      userAgent: 'fake-native-context-app-server/0.144.4',
    },
  }
}

function configResult(id: unknown): JsonObject {
  return {
    id,
    result: {
      config: {
        model: 'private-model-must-not-cross',
        model_instructions_file: null,
        project_root_markers: [],
      },
      layers: [
        {
          config: { secret: 'must-not-cross' },
          name: { type: 'sessionFlags' },
          version: 'private-version',
        },
      ],
      origins: {},
    },
  }
}

function skill(
  cwd: string,
  input: {
    readonly name: string
    readonly scope: 'system' | 'repo'
    readonly relativeRoot: readonly string[]
  },
): JsonObject {
  return {
    description: `${input.name} description`,
    enabled: true,
    name: input.name,
    path: path.join(cwd, ...input.relativeRoot, 'SKILL.md'),
    scope: input.scope,
  }
}

function skillsResult(id: unknown, cwd: string): JsonObject {
  return {
    id,
    result: {
      data: [
        {
          cwd,
          errors: [],
          skills: [
            skill(cwd, {
              name: 'bundled-system-skill',
              scope: 'system',
              relativeRoot: ['.system', 'bundled-system-skill'],
            }),
            skill(cwd, {
              name: 'ay-ple-first-assignment',
              scope: 'repo',
              relativeRoot: [
                '.agents',
                'skills',
                'ay-ple-first-assignment',
              ],
            }),
          ],
        },
      ],
    },
  }
}

function onInitialize(message: JsonObject): void {
  if (scenario === 'response-hang' || scenario === 'ignore-term') return
  if (scenario === 'wrong-codex-home') {
    const response = initializeResult(message.id)
    const result = response.result as JsonObject
    result.codexHome = '/hostile/codex-home'
    send(response)
    return
  }
  if (scenario === 'wrong-id') {
    send(initializeResult('wrong-id'))
    return
  }
  if (scenario === 'duplicate') {
    const response = initializeResult(message.id)
    process.stdout.write(
      `${JSON.stringify(response)}\n${JSON.stringify(response)}\n`,
    )
    return
  }
  if (scenario === 'error') {
    send({
      id: message.id,
      error: {
        code: -32000,
        message: 'private provider error must not cross',
      },
    })
    return
  }
  if (scenario === 'malformed') {
    process.stdout.write('{not-json}\n')
    return
  }
  if (scenario === 'partial-eof') {
    process.stdout.write('{"id":')
    process.stdout.end()
    process.exitCode = 0
    return
  }
  if (scenario === 'early-eof') {
    process.stdout.end()
    process.exitCode = 0
    return
  }
  if (scenario === 'oversized-line') {
    process.stdout.write(`${'x'.repeat(2 * 1024 * 1024)}\n`)
    return
  }
  if (scenario === 'stderr-error') {
    appendFileSync(2, 'private-stderr-'.repeat(16 * 1024))
    send({
      id: message.id,
      error: {
        code: -32000,
        message: 'private provider error must not cross',
      },
    })
    return
  }
  send(initializeResult(message.id))
  if (scenario === 'invalid-notification') {
    send({ method: 'remoteControl/status/changed', params: null })
    return
  }
  send({
    method: 'remoteControl/status/changed',
    params: {
      environmentId: null,
      installationId: 'fake-installation',
      serverName: 'fake-server',
      status: 'disabled',
    },
  })
}

function handle(message: JsonObject): void {
  journal.messages.push(message)
  saveJournal()
  const method = message.method
  if (method === 'initialize') {
    onInitialize(message)
    return
  }
  if (method === 'initialized') return
  if (method === 'config/read') {
    if (scenario === 'config-hang') return
    send(configResult(message.id))
    return
  }
  if (method === 'skills/list') {
    const params = message.params
    const cwds =
      isJsonObject(params) && Array.isArray(params.cwds)
        ? params.cwds
        : []
    const cwd = cwds[0]
    if (typeof cwd !== 'string') {
      throw new Error('invalid fake skills/list cwd')
    }
    send(skillsResult(message.id, cwd))
    return
  }
  throw new Error(`unexpected method: ${String(method)}`)
}

process.on('SIGTERM', () => {
  journal.signals.push('SIGTERM')
  saveJournal()
  if (scenario !== 'ignore-term') process.exit(143)
})

saveJournal()
const lines = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})
lines.on('line', (line) => {
  const message = JSON.parse(line) as unknown
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    throw new Error('fake request must be an object')
  }
  handle(message as JsonObject)
})
lines.on('close', () => {
  journal.stdinEnded = true
  saveJournal()
  if (
    scenario === 'ignore-eof' ||
    scenario === 'ignore-term' ||
    scenario === 'response-hang'
  ) {
    setInterval(() => undefined, 1000)
  }
})
