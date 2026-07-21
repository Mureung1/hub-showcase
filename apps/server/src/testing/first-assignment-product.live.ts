import { constants as fsConstants } from 'node:fs'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createCodexChatRuntime,
  verifyCodexChatRuntimeBundle,
  type CodexProductCapableRuntime,
} from '@ay-ple/codex-chat-runtime'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  decodeProductBootstrap,
  decodeProductOperationFrame,
  decodeProductReviewResponse,
  decodeProductWorkspaceActivationResponse,
  decodeProductWorkspaceResponse,
  type ProductOperationFrame,
  type ReadyProductWorkspace,
} from '@ay-ple/product-contract'

import { materializeE2eSemesterWorkspace } from '../../../../scripts/semester-workspace-materializer.mjs'
import { ASSIGNMENT_REVIEW_QUESTION } from '../state-patch-review.js'
import {
  LiveSignalInterruptedError,
  runWithLiveSignalAbort,
} from './live-signal.js'

const SERVER_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const REPOSITORY_ROOT = path.resolve(SERVER_ROOT, '../..')
const RUNTIME_ROOT = path.join(
  REPOSITORY_ROOT,
  'packages',
  'codex-chat-runtime',
  '.artifacts',
  'production-runtime-darwin-arm64',
)
const EXIT = { passed: 0, harness_error: 1, failed: 2, blocked: 3 } as const
const COMMAND_TIMEOUT_MS = 30 * 60_000

type IsolatedAuthSeed = {
  readonly root: string
  readonly authBytes: Buffer
}

class LivePrerequisiteError extends Error {
  constructor(
    readonly prerequisite:
      | 'isolated_codex_home'
      | 'provider_account'
      | 'external_provider',
  ) {
    super(prerequisite)
  }
}

type LiveFailureStage =
  | 'activation'
  | 'action_admission'
  | 'review_not_reached'
  | 'pre_review_state'
  | 'review_decision'
  | 'activity_contract'
  | 'terminal_contract'
  | 'durable_outcome'
  | 'fixture_material'
  | 'http_response'
  | 'interrupted'
  | 'timeout'

type LiveTerminalDiagnostic = {
  readonly status: Extract<
    ProductOperationFrame,
    { type: 'operation.terminal' }
  >['status']
  readonly validationOutcome: Extract<
    ProductOperationFrame,
    { type: 'operation.terminal' }
  >['validationOutcome']
  readonly failureCode?: string
}

class LiveTraceFailedError extends Error {
  constructor(
    readonly stage: LiveFailureStage,
    readonly terminal: LiveTerminalDiagnostic | null = null,
    readonly missingActivities: readonly ProductOperationFrame['type'][] = [],
  ) {
    super(stage)
  }
}

async function main(): Promise<void> {
  let result:
    | { readonly status: 'passed'; readonly gate: 'first_assignment_product' }
    | { readonly status: 'blocked'; readonly prerequisite: string }
    | {
        readonly status: 'failed'
        readonly gate: 'first_assignment_product'
        readonly stage: LiveFailureStage
        readonly terminal: LiveTerminalDiagnostic | null
        readonly missingActivities: readonly ProductOperationFrame['type'][]
      }
    | { readonly status: 'harness_error' }
  let exitCode: number
  try {
    await runWithLiveSignalAbort(
      async (signal, abort) => {
        const authSeed = await validateArguments(process.argv.slice(2))
        signal.throwIfAborted()
        await within(runLiveTrace(authSeed, signal), abort)
      },
    )
    result = { status: 'passed', gate: 'first_assignment_product' }
    exitCode = EXIT.passed
  } catch (error) {
    if (error instanceof LivePrerequisiteError) {
      result = { status: 'blocked', prerequisite: error.prerequisite }
      exitCode = EXIT.blocked
    } else if (
      error instanceof LiveTraceFailedError ||
      error instanceof LiveSignalInterruptedError
    ) {
      result = {
        status: 'failed',
        gate: 'first_assignment_product',
        stage:
          error instanceof LiveSignalInterruptedError
            ? 'interrupted'
            : error.stage,
        terminal:
          error instanceof LiveSignalInterruptedError ? null : error.terminal,
        missingActivities:
          error instanceof LiveSignalInterruptedError
            ? []
            : error.missingActivities,
      }
      exitCode = EXIT.failed
    } else {
      result = { status: 'harness_error' }
      exitCode = EXIT.harness_error
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`)
  process.exitCode = exitCode
}

async function runLiveTrace(
  authSeed: IsolatedAuthSeed,
  signal: AbortSignal,
): Promise<void> {
  process.env.DOTENV_CONFIG_QUIET = 'true'
  const commandRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-first-assignment-live-'),
  )
  let materialized:
    | Awaited<ReturnType<typeof materializeE2eSemesterWorkspace>>
    | undefined
  let runtime: CodexProductCapableRuntime | undefined
  try {
    await chmod(commandRoot, 0o700)
    materialized = await materializeE2eSemesterWorkspace()
    signal.throwIfAborted()
    const roots = await createFreshRoots(commandRoot)
    assertDisjointRoots([
      authSeed.root,
      materialized.workspaceRoot,
      ...Object.values(roots),
    ])
    await copyIsolatedAuth(authSeed.authBytes, roots.codexHome)
    signal.throwIfAborted()
    const evidence = await verifyCodexChatRuntimeBundle(RUNTIME_ROOT)
    runtime = await createCodexChatRuntime({
      runtimeRoot: RUNTIME_ROOT,
      workspace: roots.legacyWorkspace,
      environment: {
        home: roots.home,
        codexHome: roots.codexHome,
        codexSqliteHome: roots.codexSqliteHome,
        tempDirectory: roots.tempDirectory,
      },
    })
    const { withTestServer } = await import('./test-server.js')
    await withTestServer(
      {
        codexChat: {
          ...evidence,
          createRuntime: async () => runtime!,
        },
        semesterWorkspace: {
          appDataRoot: roots.appDataRoot,
          packageRoot: roots.packageRoot,
          chooseDirectory: async () => materialized.workspaceRoot,
        },
      },
      async (baseUrl) => {
        const activation = decodeProductWorkspaceActivationResponse(
          await jsonBody(
            await postJson(
              `${baseUrl}/api/product/workspaces/activate`,
              {},
              signal,
            ),
          ),
        )
        if (activation.status !== 'activated') {
          throw new LiveTraceFailedError('activation')
        }
        const courseResponse = decodeProductWorkspaceResponse(
          await jsonBody(
            await postJson(`${baseUrl}/api/product/courses`, {
              displayName: '문제해결글쓰기',
            }, signal),
          ),
        )
        const workspace = courseResponse.workspace
        const readiness = decodeProductBootstrap(
          await jsonBody(
            await fetch(`${baseUrl}/api/product/bootstrap`, { signal }),
          ),
        ).accountReadiness
        if (readiness.state !== 'ready') {
          throw new LivePrerequisiteError('provider_account')
        }
        await runAssignmentAction(baseUrl, workspace, signal)
      },
    )
  } finally {
    const failures: unknown[] = []
    try {
      await runtime?.close()
    } catch (error) {
      failures.push(error)
    }
    const rootCleanup = await Promise.allSettled([
      ...(materialized ? [materialized.cleanup()] : []),
      rm(commandRoot, { recursive: true, force: true }),
    ])
    failures.push(
      ...rootCleanup.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      ),
    )
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Live trace cleanup failed')
    }
  }
}

async function runAssignmentAction(
  baseUrl: string,
  workspace: ReadyProductWorkspace,
  signal: AbortSignal,
): Promise<void> {
  const selected = [
    requireMaterial(workspace, 'lms-outline-notice.txt'),
    requireMaterial(workspace, 'problem-solving-syllabus.txt'),
  ].map(({ id, digest }) => ({ id, digest }))
  const action = await postJson(
    `${baseUrl}/api/product/actions/first-assignment`,
    {
      courseId: workspace.course.id,
      recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
      arguments: FIRST_ASSIGNMENT_ARGUMENTS,
      materials: selected,
    },
    signal,
  )
  if (action.status !== 200 || !action.body) {
    throw new LiveTraceFailedError('action_admission')
  }
  const trace = new NdjsonTrace(action.body.getReader())
  const review = await trace.until(
    (frame): frame is Extract<ProductOperationFrame, { type: 'review.requested' }> =>
      frame.type === 'review.requested',
  )
  assertLiveReview(review, selected)
  const before = decodeProductBootstrap(
    await jsonBody(await fetch(`${baseUrl}/api/product/bootstrap`, { signal })),
  )
  if (
    before.workspace?.state !== 'ready' ||
    before.workspace.confirmedRevision !== 0 ||
    before.history.assignments.length !== 0 ||
    before.history.userConfirmations.length !== 0
  ) {
    throw new LiveTraceFailedError('pre_review_state')
  }
  const decision = decodeProductReviewResponse(
    await jsonBody(
      await postJson(
        `${baseUrl}/api/product/reviews/${review.interactionId}`,
        {
          patchId: review.patchId,
          decisionKey: review.decisionKey,
          decision: 'accept',
        },
        signal,
      ),
    ),
  )
  if (
    decision.decision !== 'accepted' ||
    decision.outcome !== 'applied' ||
    decision.confirmedRevision !== 1 ||
    decision.continuation !== 'continued'
  ) {
    throw new LiveTraceFailedError('review_decision')
  }
  const frames = await trace.rest()
  const terminal = assertLiveActivities(frames, review)
  const after = decodeProductBootstrap(
    await jsonBody(await fetch(`${baseUrl}/api/product/bootstrap`, { signal })),
  )
  assertLiveOutcome(after, workspace, selected, terminal.runId)
}

type SelectedMaterial = { readonly id: string; readonly digest: string }
type ReviewRequestedFrame = Extract<
  ProductOperationFrame,
  { type: 'review.requested' }
>
type AssignmentTerminalFrame = Extract<
  ProductOperationFrame,
  { type: 'operation.terminal' }
> & { readonly runId: string }

function assertLiveReview(
  review: ReviewRequestedFrame,
  selected: readonly SelectedMaterial[],
): void {
  const selectedById = new Map(selected.map((material) => [material.id, material]))
  const evidenceFields = new Set(review.patch.evidence.map(({ field }) => field))
  if (
    review.patch.status !== 'pending' ||
    review.patch.changes.operation !== 'assignment.upsert' ||
    review.patch.changes.values.title !== '개요 작성하기' ||
    review.patch.changes.values.dueAt !== '2026-07-12T23:59:00+09:00' ||
    review.patch.changes.values.submissionMethod !== 'LMS 과제함 업로드' ||
    !sameStringSet(evidenceFields, ['title', 'dueAt', 'submissionMethod']) ||
    JSON.stringify(review.questions) !==
      JSON.stringify([ASSIGNMENT_REVIEW_QUESTION]) ||
    review.patch.evidence.some((evidence) => {
      const material = selectedById.get(evidence.rawMaterialId)
      return material === undefined || material.digest !== evidence.digest
    }) ||
    !sameStringSet(
      new Set(review.patch.evidence.map(({ rawMaterialId }) => rawMaterialId)),
      selected.map(({ id }) => id),
    )
  ) {
    throw new LiveTraceFailedError('activity_contract')
  }
}

function assertLiveActivities(
  frames: readonly ProductOperationFrame[],
  review: ReviewRequestedFrame,
): AssignmentTerminalFrame {
  const terminalEvidence = terminalDiagnostic(frames)
  throwIfProviderBlocked(terminalEvidence)
  const expectedOrder: readonly ProductOperationFrame['type'][] = [
    'operation.preparing',
    'operation.accepted',
    'skill.requested',
    'mcp_call.started',
    'mcp_call.completed',
    'plan.delta',
    'plan.completed',
    'review.requested',
    'review.resolved',
    'agent_message.completed',
    'operation.terminal',
  ]
  const missingActivities = missingOrderedActivities(frames, expectedOrder)
  const skillObserved = frames.some(
    (frame) =>
      frame.type === 'skill.requested' &&
      frame.skill.name === 'ay-ple-first-assignment' &&
      frame.skill.version === FIRST_ASSIGNMENT_RECIPE_VERSION,
  )
  const proposalObserved = frames.some(
    (frame) =>
      frame.type === 'mcp_call.completed' &&
      frame.tool === 'propose_state_patch' &&
      frame.patch.id === review.patchId,
  )
  const reviewResolved = frames.some(
    (frame) =>
      frame.type === 'review.resolved' &&
      frame.interactionId === review.interactionId &&
      frame.patchId === review.patchId &&
      frame.decisionKey === review.decisionKey &&
      frame.outcome === 'accepted',
  )
  if (
    missingActivities.length > 0 ||
    !skillObserved ||
    !proposalObserved ||
    !reviewResolved
  ) {
    throw new LiveTraceFailedError(
      'activity_contract',
      terminalEvidence,
      missingActivities,
    )
  }
  const terminal = frames.at(-1)
  if (
    terminal?.type !== 'operation.terminal' ||
    !('runId' in terminal) ||
    typeof terminal.runId !== 'string' ||
    terminal.status !== 'completed' ||
    terminal.validationOutcome !== 'passed'
  ) {
    throw new LiveTraceFailedError('terminal_contract', terminalEvidence)
  }
  return terminal as AssignmentTerminalFrame
}

function assertLiveOutcome(
  bootstrap: ReturnType<typeof decodeProductBootstrap>,
  initialWorkspace: ReadyProductWorkspace,
  selected: readonly SelectedMaterial[],
  runId: string,
): void {
  const assignment = bootstrap.history.assignments[0]
  const patch = bootstrap.history.statePatches[0]
  const confirmation = bootstrap.history.userConfirmations[0]
  const run = bootstrap.history.modelingRuns[0]
  if (
    bootstrap.operationStatus !== 'idle' ||
    bootstrap.workspace?.state !== 'ready' ||
    bootstrap.workspace.confirmedRevision !== 1 ||
    bootstrap.workspace.course?.id !== initialWorkspace.course.id ||
    bootstrap.history.assignments.length !== 1 ||
    assignment?.courseId !== initialWorkspace.course.id ||
    assignment.title !== '개요 작성하기' ||
    assignment.dueAt !== '2026-07-12T23:59:00+09:00' ||
    assignment.submissionMethod !== 'LMS 과제함 업로드' ||
    !sameStringSet(
      new Set(assignment.evidence.map(({ materialId }) => materialId)),
      selected.map(({ id }) => id),
    ) ||
    bootstrap.history.statePatches.length !== 1 ||
    patch?.status !== 'applied' ||
    patch.applyOutcome.type !== 'applied' ||
    patch.applyOutcome.assignmentId !== assignment.id ||
    patch.applyOutcome.resultingRevision !== 1 ||
    bootstrap.history.userConfirmations.length !== 1 ||
    confirmation?.patchId !== patch.id ||
    confirmation.decision !== 'accepted' ||
    confirmation.outcome !== 'applied' ||
    confirmation.assignmentId !== assignment.id ||
    confirmation.resultingRevision !== 1 ||
    bootstrap.history.modelingRuns.length !== 1 ||
    run?.id !== runId ||
    run.status !== 'completed' ||
    run.validationOutcome !== 'passed' ||
    run.recovery !== null ||
    run.recipe.name !== 'first-assignment' ||
    run.recipe.version !== FIRST_ASSIGNMENT_RECIPE_VERSION ||
    run.recipe.requestedSkillName !== 'ay-ple-first-assignment' ||
    !sameStringSet(
      new Set(run.sources.map(({ materialId }) => materialId)),
      selected.map(({ id }) => id),
    ) ||
    !sameStringSet(
      new Set(run.sources.map(({ digest }) => digest)),
      selected.map(({ digest }) => digest),
    )
  ) {
    throw new LiveTraceFailedError('durable_outcome')
  }
}

function missingOrderedActivities(
  frames: readonly ProductOperationFrame[],
  expected: readonly ProductOperationFrame['type'][],
): ProductOperationFrame['type'][] {
  const missing: ProductOperationFrame['type'][] = []
  let cursor = -1
  for (const type of expected) {
    const next = frames.findIndex(
      (frame, index) => index > cursor && frame.type === type,
    )
    if (next === -1) missing.push(type)
    else cursor = next
  }
  return missing
}

function sameStringSet(
  actual: ReadonlySet<string>,
  expectedValues: readonly string[],
): boolean {
  const expected = new Set(expectedValues)
  return actual.size === expected.size && [...actual].every((value) => expected.has(value))
}

async function validateArguments(
  args: readonly string[],
): Promise<IsolatedAuthSeed> {
  if (args.length !== 2 || args[0] !== '--codex-home') {
    throw new LivePrerequisiteError('isolated_codex_home')
  }
  const candidate = args[1]!
  if (!path.isAbsolute(candidate)) {
    throw new LivePrerequisiteError('isolated_codex_home')
  }
  try {
    const stats = await lstat(candidate)
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      stats.uid !== process.getuid?.() ||
      (stats.mode & 0o777) !== 0o700
    ) {
      throw new LivePrerequisiteError('isolated_codex_home')
    }
    const resolved = await realpath(candidate)
    if (resolved !== path.resolve(candidate)) {
      throw new LivePrerequisiteError('isolated_codex_home')
    }
    const roster = (await readdir(resolved)).sort()
    if (roster.join('\n') !== 'auth.json\nconfig.toml') {
      throw new LivePrerequisiteError('isolated_codex_home')
    }
    const [authBytes] = await Promise.all([
      readPrivateFile(path.join(resolved, 'auth.json')),
      readPrivateFile(path.join(resolved, 'config.toml')),
    ])
    const auth = JSON.parse(authBytes.toString('utf8'))
    if (typeof auth !== 'object' || auth === null || Array.isArray(auth)) {
      throw new LivePrerequisiteError('isolated_codex_home')
    }
    return { root: resolved, authBytes }
  } catch (error) {
    if (error instanceof LivePrerequisiteError) throw error
    throw new LivePrerequisiteError('isolated_codex_home')
  }
}

async function readPrivateFile(file: string): Promise<Buffer> {
  const handle = await open(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.uid !== process.getuid?.() ||
      (stats.mode & 0o777) !== 0o600 ||
      (await realpath(file)) !== file
    ) {
      throw new LivePrerequisiteError('isolated_codex_home')
    }
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}

async function createFreshRoots(commandRoot: string) {
  const candidates = {
    legacyWorkspace: path.join(commandRoot, 'legacy-workspace'),
    home: path.join(commandRoot, 'home'),
    codexHome: path.join(commandRoot, 'codex-home'),
    codexSqliteHome: path.join(commandRoot, 'codex-sqlite-home'),
    tempDirectory: path.join(commandRoot, 'temp'),
    appDataRoot: path.join(commandRoot, 'app-data'),
    packageRoot: path.join(commandRoot, 'package'),
  }
  await Promise.all(
    Object.values(candidates).map((directory) =>
      mkdir(directory, { recursive: true, mode: 0o700 }),
    ),
  )
  const entries = await Promise.all(
    Object.entries(candidates).map(async ([key, directory]) => [
      key,
      await realpath(directory),
    ]),
  )
  return Object.fromEntries(entries) as typeof candidates
}

function assertDisjointRoots(roots: readonly string[]): void {
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      if (rootsOverlap(roots[left]!, roots[right]!)) {
        throw new LiveTraceFailedError('activation')
      }
    }
  }
}

function rootsOverlap(left: string, right: string): boolean {
  return rootContains(left, right) || rootContains(right, left)
}

function rootContains(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  )
}

async function copyIsolatedAuth(
  authBytes: Buffer,
  codexHome: string,
): Promise<void> {
  await createPrivateFile(path.join(codexHome, 'auth.json'), authBytes)
  await createPrivateFile(
    path.join(codexHome, 'config.toml'),
    Buffer.from(
      [
        'cli_auth_credentials_store = "file"',
        'approval_policy = "never"',
        'sandbox_mode = "read-only"',
        '',
      ].join('\n'),
      'utf8',
    ),
  )
}

async function createPrivateFile(file: string, bytes: Buffer): Promise<void> {
  const handle = await open(
    file,
    fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_WRONLY |
      fsConstants.O_NOFOLLOW,
    0o600,
  )
  try {
    await handle.writeFile(bytes)
  } finally {
    await handle.close()
  }
}

function requireMaterial(workspace: ReadyProductWorkspace, relativePath: string) {
  const material = workspace.materials.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  if (!material) throw new LiveTraceFailedError('fixture_material')
  return material
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

async function jsonBody(response: Response): Promise<unknown> {
  if (!response.ok) throw new LiveTraceFailedError('http_response')
  return response.json()
}

class NdjsonTrace {
  private readonly frames: ProductOperationFrame[] = []
  private readonly decoder = new TextDecoder()
  private buffer = ''
  private done = false

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {}

  async until<T extends ProductOperationFrame>(
    predicate: (frame: ProductOperationFrame) => frame is T,
  ): Promise<T> {
    while (true) {
      const existing = this.frames.find(predicate)
      if (existing) return existing
      await this.readNext()
      if (this.done) {
        const terminal = terminalDiagnostic(this.frames)
        throwIfProviderBlocked(terminal)
        throw new LiveTraceFailedError(
          'review_not_reached',
          terminal,
        )
      }
    }
  }

  async rest(): Promise<readonly ProductOperationFrame[]> {
    while (!this.done) await this.readNext()
    return this.frames
  }

  private async readNext(): Promise<void> {
    const chunk = await this.reader.read()
    if (chunk.done) {
      this.done = true
      this.buffer += this.decoder.decode()
      if (this.buffer.trim().length > 0) this.frames.push(decodeLine(this.buffer))
      return
    }
    this.buffer += this.decoder.decode(chunk.value, { stream: true })
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.length > 0) this.frames.push(decodeLine(line))
    }
  }
}

function decodeLine(line: string): ProductOperationFrame {
  return decodeProductOperationFrame(JSON.parse(line) as unknown)
}

function terminalDiagnostic(
  frames: readonly ProductOperationFrame[],
): LiveTerminalDiagnostic | null {
  const terminal = [...frames]
    .reverse()
    .find(
      (frame): frame is Extract<
        ProductOperationFrame,
        { type: 'operation.terminal' }
      > => frame.type === 'operation.terminal',
    )
  return terminal
    ? {
        status: terminal.status,
        validationOutcome: terminal.validationOutcome,
        ...('failureCode' in terminal
          ? { failureCode: terminal.failureCode }
          : {}),
      }
    : null
}

function throwIfProviderBlocked(
  terminal: LiveTerminalDiagnostic | null,
): void {
  const code = terminal?.failureCode
  if (code === 'unauthorized' || code === 'usage_limit_exceeded') {
    throw new LivePrerequisiteError('provider_account')
  }
  if (
    code === 'server_overloaded' ||
    code === 'internal_server_error' ||
    code === 'http_connection_failed' ||
    code === 'response_stream_connection_failed' ||
    code === 'response_stream_disconnected' ||
    code === 'response_too_many_failed_attempts'
  ) {
    throw new LivePrerequisiteError('external_provider')
  }
}

async function within<T>(promise: Promise<T>, abort: () => void): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  const timeoutError = new LiveTraceFailedError('timeout')
  try {
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(timeoutError), COMMAND_TIMEOUT_MS)
        }),
      ])
    } catch (error) {
      if (error === timeoutError) {
        abort()
        try {
          await promise
        } catch (cleanupError) {
          if (cleanupError instanceof AggregateError) throw cleanupError
        }
      }
      throw error
    }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

await main()
