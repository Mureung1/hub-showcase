import assert from 'node:assert/strict'
import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import { createServer } from 'node:http'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import {
  controlledPythonEnvironment,
  createLocalProviderEnvironment,
  delay,
  terminateDetachedProcessGroup,
  waitForJsonFile,
  waitForProcessGroupExit,
  withinDuration,
  writeLocalProviderConfig,
} from './local-provider-test-support.js'
import { verifyProductionBundle } from './production-bundle.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type SpawnedCodexChatRuntime,
} from './runtime.js'
import {
  EXTERNAL_PRODUCTION_RUNTIME_ROOT_FOR_TEST as ARTIFACT_ROOT,
  initializeGitRootForTest,
} from './runtime-test-support.js'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const execFileAsync = promisify(execFile)
const LOCAL_PROVIDER = join(
  PACKAGE_ROOT,
  'scripts',
  'official_local_provider.py',
)
test('runs the production bridge against exact Codex and the official local provider', async () => {
  const bundle = await verifyProductionBundle(ARTIFACT_ROOT)
  const root = await mkdtemp(join(tmpdir(), 'ay-ple-exact-local-provider-'))
  let provider: LocalProvider | undefined
  let runtime: SpawnedCodexChatRuntime | undefined
  try {
    const workspace = join(root, 'runtime-workspace')
    await mkdir(workspace)
    await initializeGitRootForTest(workspace)
    const canonicalWorkspace = await realpath(workspace)
    const skillPath = join(
      canonicalWorkspace,
      '.agents',
      'skills',
      'ay-ple-first-assignment',
      'SKILL.md',
    )
    const skillBody = 'EXACT_SKILL_BODY_SENTINEL'
    const actionText = [
      'ActionInvocation: organize_sources',
      'Selected SemesterWorkspace file references:',
      '- "materials/assignment-notice.md"',
    ].join('\n')
    await Promise.all([
      mkdir(dirname(skillPath), { recursive: true }),
      mkdir(join(canonicalWorkspace, 'materials'), { recursive: true }),
    ])
    await Promise.all([
      writeFile(
        skillPath,
        [
          '---',
          'name: ay-ple-first-assignment',
          'description: Exact local-provider test Skill.',
          '---',
          '',
          skillBody,
          '',
        ].join('\n'),
        'utf8',
      ),
      writeFile(
        join(canonicalWorkspace, 'materials', 'assignment-notice.md'),
        '# Assignment notice\n',
        'utf8',
      ),
    ])
    const environment = await createLocalProviderEnvironment(root)
    provider = await startLocalProvider(bundle, root)
    await writeLocalProviderConfig(environment.codexHome, provider.url)

    runtime = await startVerifiedCodexChatRuntime({
      bundle,
      workspace: canonicalWorkspace,
      environment,
      disableManagedConfigForTest: true,
      deadlines: {
        responseMs: 10_000,
        streamIdleMs: 10_000,
        streamTotalMs: 30_000,
        gracefulCloseMs: 2_000,
        terminateMs: 2_000,
        postKillMs: 2_000,
      },
    })
    const processGroupId = requirePid(runtime.child)
    assert.deepEqual(
      await within(
        runtime.runtime.readEffectiveConfig({
          signal: new AbortController().signal,
        }),
      ),
      {
        projectRootMarkers: ['.git'],
        globalInstructionsFile: null,
        mcpServers: [],
      },
    )
    const thread = await within(runtime.runtime.startThread())

    const nominal = await within(
      runtime.runtime.startTurn({
        threadId: thread.threadId,
        text: 'Run the exact local-provider T0.',
      }),
    )
    const nominalEvents = await within(collect(nominal.events))
    assertNativeTurn(nominalEvents, thread.threadId, nominal.turnId, {
      status: 'completed',
      text: 'hello exact runtime',
    })

    const interrupted = await within(
      runtime.runtime.startTurn({
        threadId: thread.threadId,
        text: 'Start a turn that will be interrupted.',
      }),
    )
    await waitForProviderRequestCount(provider.journalPath, 2)
    await within(
      runtime.runtime.interrupt({
        threadId: thread.threadId,
        turnId: interrupted.turnId,
      }),
    )
    const interruptedEvents = await within(collect(interrupted.events))
    assert.deepEqual(interruptedEvents.at(-1), {
      type: 'turn.completed',
      threadId: thread.threadId,
      turnId: interrupted.turnId,
      status: 'interrupted',
    })

    const followUp = await within(
      runtime.runtime.startTurn({
        threadId: thread.threadId,
        text: 'Continue on the same native thread.',
      }),
    )
    assert.notEqual(followUp.turnId, nominal.turnId)
    assert.notEqual(followUp.turnId, interrupted.turnId)
    const followUpEvents = await within(collect(followUp.events))
    assertNativeTurn(followUpEvents, thread.threadId, followUp.turnId, {
      status: 'completed',
      text: 'after interrupt',
    })

    const action = await within(
      runtime.runtime.startProductTurn({
        threadId: thread.threadId,
        permissionProfile: 'workspace_write',
        skill: {
          name: 'ay-ple-first-assignment',
          path: skillPath,
        },
        text: actionText,
      }),
    )
    const actionEvents = await within(collect(action.events))
    assertNativeTurn(actionEvents, thread.threadId, action.turnId, {
      status: 'completed',
      text: 'skill action',
    })

    await within(runtime.runtime.close())
    await within(runtime.closed)
    assert.equal(runtime.child.exitCode, 0)
    assert.equal(runtime.child.signalCode, null)
    await waitForProcessGroupExit(processGroupId)
    runtime = undefined

    const policy = await probeEffectivePolicy(
      bundle,
      environment,
      canonicalWorkspace,
      thread.threadId,
    )
    assert.equal(policy.approvalPolicy, 'never')
    assert.deepEqual(policy.sandbox, {
      networkAccess: false,
      type: 'readOnly',
    })
    assert.equal(policy.threadId, thread.threadId)

    const journal = await provider.close()
    provider = undefined
    assert.deepEqual(journal.requests.slice(0, 3).map(
      (request) => request.userTexts.at(-1),
    ), [
      'Run the exact local-provider T0.',
      'Start a turn that will be interrupted.',
      'Continue on the same native thread.',
    ])
    const actionRequest = journal.requests[3]
    assert.ok(actionRequest)
    const skillIndex = actionRequest.userTexts.findIndex((text) =>
      text.startsWith('<skill>'),
    )
    const textIndex = actionRequest.userTexts.indexOf(actionText)
    assert.notEqual(skillIndex, -1)
    assert.notEqual(textIndex, -1)
    const skillBlock = actionRequest.userTexts[skillIndex] as string
    assert.match(
      skillBlock,
      /<name>ay-ple-first-assignment<\/name>/u,
    )
    assert.equal(skillBlock.includes(`<path>${skillPath}</path>`), true)
    assert.equal(skillBlock.includes(skillBody), true)
    assert.equal(
      actionRequest.userTexts.some((text) => text.startsWith('<mention>')),
      false,
    )
  } finally {
    await runtime?.runtime.close().catch(() => undefined)
    await provider?.close().catch(() => undefined)
    await rm(root, { recursive: true, force: true })
  }
})

test('discovers the built Interaction Adapter from a tracked trusted Git project', async () => {
  const bundle = await verifyProductionBundle(ARTIFACT_ROOT)
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'ay-ple-project-mcp-declaration-')),
  )
  const brokerRequests: unknown[] = []
  const broker = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      body += chunk
    })
    request.on('end', () => {
      const parsedBody = JSON.parse(body) as { readonly kind?: unknown }
      brokerRequests.push({
        authorization: request.headers.authorization,
        body: parsedBody,
        runtimeBinding: request.headers['x-ay-ple-runtime-binding'],
      })
      response.writeHead(200, { 'content-type': 'application/json' })
      if (parsedBody.kind === 'lifecycle_open') {
        response.write(
          `${JSON.stringify({
            protocolVersion: 1,
            kind: 'lifecycle_accepted',
          })}\n`,
        )
        return
      }
      response.end(
        JSON.stringify({
          protocolVersion: 1,
          kind: 'handshake_accepted',
        }),
      )
    })
  })
  let provider: LocalProvider | undefined
  let runtime: SpawnedCodexChatRuntime | undefined
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      broker.once('error', rejectListen)
      broker.listen(0, '127.0.0.1', () => {
        broker.off('error', rejectListen)
        resolveListen()
      })
    })
    const address = broker.address()
    if (typeof address !== 'object' || address === null) {
      throw new Error('Interaction Broker did not bind a TCP address')
    }

    const workspace = join(root, 'semester-workspace')
    await mkdir(join(workspace, '.codex'), { recursive: true })
    await initializeGitRootForTest(workspace)
    const adapter = resolve(PACKAGE_ROOT, '..', 'interaction-mcp', 'dist', 'stdio.js')
    const adapterCommand = relative(workspace, adapter)
    assert.equal(adapterCommand.startsWith('/'), false)
    const declaration = [
      '[mcp_servers.ay_ple_interaction]',
      `command = ${JSON.stringify(adapterCommand)}`,
      'env_vars = [',
      '  "AY_PLE_INTERACTION_BROKER_URL",',
      '  "AY_PLE_INTERACTION_BROKER_TOKEN",',
      '  "AY_PLE_INTERACTION_RUNTIME_BINDING",',
      ']',
      'enabled_tools = ["propose_state_patch"]',
      'required = true',
      '',
    ].join('\n')
    await writeFile(
      join(workspace, '.codex', 'config.toml'),
      declaration,
      'utf8',
    )
    await execFileAsync('/usr/bin/git', [
      '-C',
      workspace,
      'add',
      '--',
      '.codex/config.toml',
    ])
    assert.equal(
      (
        await execFileAsync('/usr/bin/git', [
          '-C',
          workspace,
          'ls-files',
          '--error-unmatch',
          '--',
          '.codex/config.toml',
        ])
      ).stdout.trim(),
      '.codex/config.toml',
    )

    const environment = await createLocalProviderEnvironment(root)
    provider = await startLocalProvider(bundle, root)
    await writeLocalProviderConfig(environment.codexHome, provider.url)
    const canonicalWorkspace = await realpath(workspace)
    await writeFile(
      join(environment.codexHome, 'config.toml'),
      [
        await readFile(join(environment.codexHome, 'config.toml'), 'utf8'),
        `[projects.${JSON.stringify(canonicalWorkspace)}]`,
        'trust_level = "trusted"',
        '',
      ].join('\n'),
      'utf8',
    )

    const token = 'A'.repeat(43)
    const runtimeBinding = `runtime_${'1'.repeat(32)}`
    runtime = await startVerifiedCodexChatRuntime({
      bundle,
      workspace: canonicalWorkspace,
      environment,
      childEnvironment: {
        AY_PLE_INTERACTION_BROKER_TOKEN: token,
        AY_PLE_INTERACTION_BROKER_URL:
          `http://127.0.0.1:${address.port}/api/_private/interaction-mcp`,
        AY_PLE_INTERACTION_RUNTIME_BINDING: runtimeBinding,
      },
      disableManagedConfigForTest: true,
      deadlines: {
        responseMs: 20_000,
        streamIdleMs: 10_000,
        streamTotalMs: 30_000,
        gracefulCloseMs: 2_000,
        terminateMs: 2_000,
        postKillMs: 2_000,
      },
    })
    assert.deepEqual(
      await within(
        runtime.runtime.readEffectiveConfig({
          signal: new AbortController().signal,
        }),
      ),
      {
        projectRootMarkers: ['.git'],
        globalInstructionsFile: null,
        mcpServers: [
          {
            name: 'ay_ple_interaction',
            command: adapterCommand,
            args: [],
            envVars: [
              {
                name: 'AY_PLE_INTERACTION_BROKER_URL',
                source: null,
              },
              {
                name: 'AY_PLE_INTERACTION_BROKER_TOKEN',
                source: null,
              },
              {
                name: 'AY_PLE_INTERACTION_RUNTIME_BINDING',
                source: null,
              },
            ],
            cwd: null,
            toolTimeoutSec: null,
            env: {},
            enabled: true,
            required: true,
            enabledTools: ['propose_state_patch'],
            disabledTools: [],
          },
        ],
      },
    )
    await within(runtime.runtime.startThread())
    assert.deepEqual(brokerRequests, [
      {
        authorization: `Bearer ${token}`,
        body: {
          protocolVersion: 1,
          kind: 'handshake',
          serverName: 'ay_ple_interaction',
          capabilities: ['propose_state_patch'],
        },
        runtimeBinding,
      },
      {
        authorization: `Bearer ${token}`,
        body: {
          protocolVersion: 1,
          kind: 'lifecycle_open',
        },
        runtimeBinding,
      },
    ])
  } finally {
    await runtime?.runtime.close().catch(() => undefined)
    await provider?.close().catch(() => undefined)
    await new Promise<void>((resolveClose) => broker.close(() => resolveClose()))
    await rm(root, { recursive: true, force: true })
  }
})

test('records exact trust despite a trusted ancestor and reloads only exact native context', async () => {
  const bundle = await verifyProductionBundle(ARTIFACT_ROOT)
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'ay-ple-native-project-context-')),
  )
  let provider: LocalProvider | undefined
  let runtime: SpawnedCodexChatRuntime | undefined
  try {
    const workspace = join(root, 'semester-workspace')
    const insideMarker = join(workspace, 'workspace-write-marker.txt')
    const outsideSentinel = join(root, 'sibling-sentinel.txt')
    const outsideSentinelContent = 'sibling-sentinel-original\n'
    const projectInstructions = join(workspace, 'project-instructions.md')
    const workspaceSkillRoot = join(
      workspace,
      '.agents',
      'skills',
      'semester-workspace-skill',
    )
    const hostileSkillRoot = join(
      root,
      '.agents',
      'skills',
      'hostile-ancestor-skill',
    )
    const hostileProjectInstructions = join(
      root,
      'hostile-project-instructions.md',
    )
    await Promise.all([
      mkdir(join(root, '.codex')),
      mkdir(join(workspace, '.codex'), { recursive: true }),
      mkdir(workspaceSkillRoot, { recursive: true }),
      mkdir(hostileSkillRoot, { recursive: true }),
    ])
    await initializeGitRootForTest(root)
    await initializeGitRootForTest(workspace)
    await Promise.all([
      writeFile(
        join(root, 'AGENTS.md'),
        '# HOSTILE_ANCESTOR_INSTRUCTIONS\n',
        'utf8',
      ),
      writeFile(
        hostileProjectInstructions,
        '# HOSTILE_ANCESTOR_PROJECT_INSTRUCTIONS\n',
        'utf8',
      ),
      writeFile(
        join(root, '.codex', 'config.toml'),
        `model_instructions_file = "${hostileProjectInstructions}"\n`,
        'utf8',
      ),
      writeFile(
        join(workspace, 'AGENTS.md'),
        '# EXACT_WORKSPACE_INSTRUCTIONS\n',
        'utf8',
      ),
      writeFile(
        projectInstructions,
        '# EXACT_PROJECT_MODEL_INSTRUCTIONS\n',
        'utf8',
      ),
      writeFile(
        join(workspace, '.codex', 'config.toml'),
        `model_instructions_file = "${projectInstructions}"\n`,
        'utf8',
      ),
      writeFile(
        join(workspaceSkillRoot, 'SKILL.md'),
        [
          '---',
          'name: semester-workspace-skill',
          'description: Exact workspace Skill.',
          '---',
          '',
          '# Semester workspace Skill',
          '',
        ].join('\n'),
        'utf8',
      ),
      writeFile(
        join(hostileSkillRoot, 'SKILL.md'),
        [
          '---',
          'name: hostile-ancestor-skill',
          'description: Must not cross the Git boundary.',
          '---',
          '',
          '# Hostile ancestor Skill',
          '',
        ].join('\n'),
        'utf8',
      ),
      writeFile(outsideSentinel, outsideSentinelContent, 'utf8'),
    ])

    const environment = await createLocalProviderEnvironment(root)
    const canonicalRoot = await realpath(root)
    const canonicalWorkspace = await realpath(workspace)
    provider = await startLocalProvider(bundle, root, {
      insideMarker,
      outsideSentinel,
      workspace: canonicalWorkspace,
    })
    await writeLocalProviderConfig(environment.codexHome, provider.url)
    const configPath = join(environment.codexHome, 'config.toml')
    await writeFile(
      configPath,
      [
        await readFile(configPath, 'utf8'),
        `[projects."${canonicalRoot}"]`,
        'trust_level = "trusted"',
        '',
      ].join('\n'),
      'utf8',
    )
    runtime = await startVerifiedCodexChatRuntime({
      bundle,
      workspace: canonicalWorkspace,
      environment,
      disableManagedConfigForTest: true,
      deadlines: {
        responseMs: 10_000,
        streamIdleMs: 10_000,
        streamTotalMs: 30_000,
        gracefulCloseMs: 2_000,
        terminateMs: 2_000,
        postKillMs: 2_000,
      },
    })

    const thread = await within(runtime.runtime.startThread())
    const signal = new AbortController().signal
    const [config, skills] = await Promise.all([
      runtime.runtime.readEffectiveConfig({ signal }),
      runtime.runtime.listEffectiveSkills({ signal }),
    ])
    assert.deepEqual(config, {
      projectRootMarkers: ['.git'],
      globalInstructionsFile: projectInstructions,
      mcpServers: [],
    })
    assert.deepEqual(skills, [
      {
        name: 'semester-workspace-skill',
        enabled: true,
        sourceRoot: workspaceSkillRoot,
      },
    ])

    const turn = await within(
      runtime.runtime.startProductTurn({
        threadId: thread.threadId,
        permissionProfile: 'workspace_write',
        text: 'Observe the exact native project context.',
      }),
    )
    const events = await within(collect(turn.events))
    assert.deepEqual(events.at(-1), {
      type: 'turn.completed',
      threadId: thread.threadId,
      turnId: turn.turnId,
      status: 'completed',
    })
    assert.equal(await readFile(insideMarker, 'utf8'), 'workspace-write-ok\n')
    assert.equal(
      await readFile(outsideSentinel, 'utf8'),
      outsideSentinelContent,
    )

    await within(runtime.runtime.close())
    await within(runtime.closed)
    runtime = undefined

    const policy = await probeEffectivePolicy(
      bundle,
      environment,
      canonicalWorkspace,
      thread.threadId,
    )
    assert.equal(policy.approvalPolicy, 'never')
    assert.deepEqual(policy.sandbox, {
      networkAccess: false,
      type: 'readOnly',
    })

    const persistedConfig = await readFile(
      configPath,
      'utf8',
    )
    assert.match(
      persistedConfig,
      new RegExp(
        `\\[projects\\."${escapeRegExp(canonicalRoot)}"\\][^[]*trust_level = "trusted"`,
        's',
      ),
    )
    assert.match(
      persistedConfig,
      new RegExp(
        `\\[projects\\."${escapeRegExp(canonicalWorkspace)}"\\][^[]*trust_level = "trusted"`,
        's',
      ),
    )
    const journal = await provider.close()
    provider = undefined
    const sandboxEvidence = parseJsonObjectLine(
      journal.requests.flatMap((request) => request.functionOutputs),
    )
    const { outsideWriteError, ...sandboxOutcome } = sandboxEvidence
    assert.equal(
      typeof outsideWriteError === 'string' && outsideWriteError.length > 0,
      true,
    )
    assert.deepEqual(sandboxOutcome, {
      cwd: canonicalWorkspace,
      insideWrite: true,
      outsidePreserved: true,
      outsideWriteBlocked: true,
    })
    const nativeContext = JSON.stringify(journal.requests[0])
    assert.match(nativeContext, /EXACT_WORKSPACE_INSTRUCTIONS/u)
    assert.match(nativeContext, /EXACT_PROJECT_MODEL_INSTRUCTIONS/u)
    assert.doesNotMatch(nativeContext, /HOSTILE_ANCESTOR_INSTRUCTIONS/u)
    assert.doesNotMatch(
      nativeContext,
      /HOSTILE_ANCESTOR_PROJECT_INSTRUCTIONS/u,
    )
  } finally {
    await runtime?.runtime.close().catch(() => undefined)
    await provider?.close().catch(() => undefined)
    await rm(root, { recursive: true, force: true })
  }
})

test('preserves explicit untrusted at workspace-write thread start', async () => {
  const bundle = await verifyProductionBundle(ARTIFACT_ROOT)
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'ay-ple-explicit-untrusted-')),
  )
  let provider: LocalProvider | undefined
  let runtime: SpawnedCodexChatRuntime | undefined
  try {
    const workspace = join(root, 'semester-workspace')
    const projectInstructions = join(workspace, 'project-instructions.md')
    const workspaceSkillRoot = join(
      workspace,
      '.agents',
      'skills',
      'semester-workspace-skill',
    )
    await Promise.all([
      mkdir(join(workspace, '.codex'), { recursive: true }),
      mkdir(workspaceSkillRoot, { recursive: true }),
    ])
    await initializeGitRootForTest(workspace)
    await Promise.all([
      writeFile(
        join(workspace, 'AGENTS.md'),
        '# EXPLICIT_UNTRUSTED_AGENTS_INSTRUCTIONS\n',
        'utf8',
      ),
      writeFile(
        projectInstructions,
        '# EXPLICIT_UNTRUSTED_PROJECT_INSTRUCTIONS\n',
        'utf8',
      ),
      writeFile(
        join(workspace, '.codex', 'config.toml'),
        `model_instructions_file = "${projectInstructions}"\n`,
        'utf8',
      ),
      writeFile(
        join(workspaceSkillRoot, 'SKILL.md'),
        [
          '---',
          'name: semester-workspace-skill',
          'description: Exact untrusted workspace Skill.',
          '---',
          '',
          '# Semester workspace Skill',
          '',
        ].join('\n'),
        'utf8',
      ),
    ])

    const environment = await createLocalProviderEnvironment(root)
    provider = await startLocalProvider(bundle, root)
    await writeLocalProviderConfig(environment.codexHome, provider.url)
    const canonicalWorkspace = await realpath(workspace)
    const configPath = join(environment.codexHome, 'config.toml')
    const explicitUntrustedConfig = [
      await readFile(configPath, 'utf8'),
      `[projects."${canonicalWorkspace}"]`,
      'trust_level = "untrusted"',
      '',
    ].join('\n')
    await writeFile(configPath, explicitUntrustedConfig, 'utf8')

    runtime = await startVerifiedCodexChatRuntime({
      bundle,
      workspace: canonicalWorkspace,
      environment,
      disableManagedConfigForTest: true,
      deadlines: {
        responseMs: 10_000,
        streamIdleMs: 10_000,
        streamTotalMs: 30_000,
        gracefulCloseMs: 2_000,
        terminateMs: 2_000,
        postKillMs: 2_000,
      },
    })
    const thread = await within(runtime.runtime.startThread())
    const signal = new AbortController().signal
    const [config, skills] = await Promise.all([
      runtime.runtime.readEffectiveConfig({ signal }),
      runtime.runtime.listEffectiveSkills({ signal }),
    ])
    assert.deepEqual(config, {
      projectRootMarkers: ['.git'],
      globalInstructionsFile: null,
      mcpServers: [],
    })
    assert.deepEqual(skills, [
      {
        name: 'semester-workspace-skill',
        enabled: true,
        sourceRoot: workspaceSkillRoot,
      },
    ])

    const turn = await within(
      runtime.runtime.startProductTurn({
        threadId: thread.threadId,
        permissionProfile: 'workspace_write',
        text: 'Observe the explicit untrusted project boundary.',
      }),
    )
    const events = await within(collect(turn.events))
    assert.deepEqual(events.at(-1), {
      type: 'turn.completed',
      threadId: thread.threadId,
      turnId: turn.turnId,
      status: 'completed',
    })

    await within(runtime.runtime.close())
    await within(runtime.closed)
    runtime = undefined
    assert.equal(await readFile(configPath, 'utf8'), explicitUntrustedConfig)

    const journal = await provider.close()
    provider = undefined
    const nativeContext = JSON.stringify(journal.requests[0])
    assert.match(nativeContext, /EXPLICIT_UNTRUSTED_AGENTS_INSTRUCTIONS/u)
    assert.doesNotMatch(
      nativeContext,
      /EXPLICIT_UNTRUSTED_PROJECT_INSTRUCTIONS/u,
    )
  } finally {
    await runtime?.runtime.close().catch(() => undefined)
    await provider?.close().catch(() => undefined)
    await rm(root, { recursive: true, force: true })
  }
})

interface VerifiedBundle {
  readonly codexPathDirectory: string
  readonly nativeExecutable: string
  readonly pythonExecutable: string
  readonly sitePackages: string
}

interface PolicyEvidence {
  readonly approvalPolicy: string
  readonly sandbox: {
    readonly networkAccess: boolean
    readonly type: string
  }
  readonly threadId: string
}

interface ProviderJournal {
  readonly requests: ReadonlyArray<{
    readonly developerTexts: readonly string[]
    readonly functionOutputs: readonly string[]
    readonly instructions: string | null
    readonly method: string
    readonly path: string
    readonly userTexts: readonly string[]
  }>
}

interface LocalProvider {
  readonly journalPath: string
  readonly url: string
  close(): Promise<ProviderJournal>
}

async function probeEffectivePolicy(
  bundle: VerifiedBundle,
  environment: CodexChatRuntimeEnvironment,
  workspace: string,
  threadId: string,
): Promise<PolicyEvidence> {
  const child = spawn(
    bundle.pythonExecutable,
    [
      '-B',
      LOCAL_PROVIDER,
      'policy',
      '--codex-bin',
      bundle.nativeExecutable,
      '--workspace',
      workspace,
      '--codex-home',
      environment.codexHome,
      '--codex-sqlite-home',
      environment.codexSqliteHome,
      '--home',
      environment.home,
      '--temp-directory',
      environment.tempDirectory,
      '--thread-id',
      threadId,
    ],
    {
      cwd: workspace,
      detached: true,
      env: {
        ...controlledPythonEnvironment(bundle, environment.tempDirectory),
        CODEX_HOME: environment.codexHome,
        CODEX_SQLITE_HOME: environment.codexSqliteHome,
        HOME: environment.home,
        TMPDIR: environment.tempDirectory,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  child.stdin.end()
  const result = await waitForChild(child)
  if (result.code !== 0) {
    throw new Error(`Policy probe failed: ${result.stderr}`)
  }
  return JSON.parse(result.stdout) as PolicyEvidence
}

async function startLocalProvider(
  bundle: VerifiedBundle,
  root: string,
  sandbox?: {
    readonly insideMarker: string
    readonly outsideSentinel: string
    readonly workspace: string
  },
): Promise<LocalProvider> {
  const providerRoot = join(root, 'provider')
  await mkdir(providerRoot)
  const readyPath = join(providerRoot, 'ready.json')
  const journalPath = join(providerRoot, 'journal.json')
  const child = spawn(
    bundle.pythonExecutable,
    [
      '-B',
      LOCAL_PROVIDER,
      sandbox === undefined ? 'serve' : 'serve-sandbox',
      '--ready-file',
      readyPath,
      '--journal-file',
      journalPath,
      ...(sandbox === undefined
        ? []
        : [
            '--workspace',
            sandbox.workspace,
            '--inside-marker',
            sandbox.insideMarker,
            '--outside-sentinel',
            sandbox.outsideSentinel,
          ]),
    ],
    {
      cwd: providerRoot,
      detached: true,
      env: controlledPythonEnvironment(bundle, providerRoot),
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-16_384)
  })
  let ready: { readonly url: string }
  try {
    ready = await waitForJsonFile<{ readonly url: string }>({
      child,
      exitedMessage: 'Local provider exited before publishing readiness',
      filePath: readyPath,
      retryReadError: () => true,
      timeoutMessage: 'Timed out waiting for local provider readiness',
      timeoutMs: 10_000,
    })
  } catch (error) {
    await terminateAndReap(child).catch(() => undefined)
    throw error
  }
  let closePromise: Promise<ProviderJournal> | undefined
  return {
    journalPath,
    url: ready.url,
    close: () => {
      closePromise ??= (async () => {
        if (child.exitCode === null && child.signalCode === null) {
          child.stdin.end('close\n')
        }
        const result = await waitForChild(child, stderr)
        if (result.code !== 0) {
          throw new Error(`Local provider failed: ${result.stderr}`)
        }
        return JSON.parse(await readFile(journalPath, 'utf8')) as ProviderJournal
      })()
      return closePromise
    },
  }
}

function assertNativeTurn(
  events: ReadonlyArray<Record<string, unknown>>,
  threadId: string,
  turnId: string,
  expected: { readonly status: string; readonly text: string },
): void {
  const agentEvents = events.filter(
    (event) =>
      event.type === 'agent_message.delta' ||
      event.type === 'agent_message.completed',
  )
  const completedEvents = agentEvents.filter(
    (event) => event.type === 'agent_message.completed',
  )
  const terminalEvents = events.filter(
    (event) => event.type === 'turn.completed',
  )
  assert.equal(completedEvents.length, 1)
  assert.equal(terminalEvents.length, 1)
  assert.equal(
    events.every(
      (event) => event.threadId === threadId && event.turnId === turnId,
    ),
    true,
  )
  assert.equal(events.at(-1), terminalEvents[0])
  const itemId = completedEvents[0]?.itemId
  assert.equal(typeof itemId, 'string')
  assert.notEqual(itemId, '')
  assert.equal(agentEvents.every((event) => event.itemId === itemId), true)
  assert.equal(agentEvents.at(-1), completedEvents[0])
  assert.equal(
    events
      .filter((event) => event.type === 'agent_message.delta')
      .map((event) => event.delta)
      .join(''),
    expected.text,
  )
  assert.deepEqual(
    completedEvents[0],
    {
      type: 'agent_message.completed',
      threadId,
      turnId,
      itemId,
      text: expected.text,
    },
  )
  assert.deepEqual(events.at(-1), {
    type: 'turn.completed',
    threadId,
    turnId,
    status: expected.status,
  })
}

async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = []
  for await (const value of values) collected.push(value)
  return collected
}

async function within<T>(value: Promise<T>): Promise<T> {
  return withinDuration(
    value,
    30_000,
    'Exact local-provider operation timed out',
  )
}

async function waitForProviderRequestCount(
  journalPath: string,
  count: number,
): Promise<void> {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const journal = JSON.parse(
        await readFile(journalPath, 'utf8'),
      ) as ProviderJournal
      if (journal.requests.length >= count) return
    } catch {
      // The controller publishes the journal atomically after it starts.
    }
    await delay(10)
  }
  throw new Error(`Timed out waiting for provider request ${count}`)
}

async function waitForChild(
  child: ChildProcessWithoutNullStreams,
  priorStderr = '',
): Promise<{ readonly code: number | null; readonly stderr: string; readonly stdout: string }> {
  let stdout = ''
  let stderr = priorStderr
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    stdout = `${stdout}${chunk}`.slice(-64_000)
  })
  child.stderr.on('data', (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-64_000)
  })
  if (child.exitCode !== null || child.signalCode !== null) {
    if (child.signalCode !== null) {
      await ensureAuxiliaryGroupExit(child)
      throw new Error(`Child exited from ${child.signalCode}: ${stderr}`)
    }
    await ensureAuxiliaryGroupExit(child)
    return { code: child.exitCode, stderr, stdout }
  }
  let result: {
    readonly code: number | null
    readonly signal: NodeJS.Signals | null
  }
  try {
    result = await within(
      new Promise<{
        readonly code: number | null
        readonly signal: NodeJS.Signals | null
      }>((resolvePromise, reject) => {
        child.once('error', reject)
        child.once('close', (code, signal) =>
          resolvePromise({ code, signal }),
        )
      }),
    )
  } catch (error) {
    await terminateAndReap(child)
    throw error
  }
  if (result.signal !== null) {
    await ensureAuxiliaryGroupExit(child)
    throw new Error(`Child exited from ${result.signal}: ${stderr}`)
  }
  try {
    await waitForProcessGroupExit(requirePid(child))
  } catch (error) {
    await terminateAndReap(child)
    throw error
  }
  return { code: result.code, stderr, stdout }
}

async function ensureAuxiliaryGroupExit(
  child: ChildProcessWithoutNullStreams,
): Promise<void> {
  try {
    await waitForProcessGroupExit(requirePid(child))
  } catch (error) {
    await terminateAndReap(child)
    throw error
  }
}

async function terminateAndReap(
  child: ChildProcessWithoutNullStreams,
): Promise<void> {
  await terminateDetachedProcessGroup({
    child,
    childCloseTimeoutMessage: 'Auxiliary child did not close',
    processGroupId: requirePid(child),
  })
}

function requirePid(child: ChildProcessWithoutNullStreams): number {
  if (child.pid === undefined) throw new Error('Runtime child has no pid')
  return child.pid
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function parseJsonObjectLine(outputs: readonly string[]): Record<string, unknown> {
  for (const output of outputs) {
    for (const line of output.split('\n')) {
      const candidate = line.trim()
      if (!candidate.startsWith('{') || !candidate.endsWith('}')) continue
      let value: unknown
      try {
        value = JSON.parse(candidate) as unknown
      } catch {
        continue
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        return value as Record<string, unknown>
      }
    }
  }
  throw new Error('Sandbox command did not publish JSON evidence')
}
