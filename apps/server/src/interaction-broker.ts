import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'
import path from 'node:path'

import {
  INTERACTION_BROKER_BODY_MAX_BYTES,
  INTERACTION_BROKER_PROTOCOL_VERSION,
  decodeInteractionBrokerRequest,
  decodeProposeStatePatchResult,
  type InteractionBrokerErrorCode,
  type InteractionBrokerResponse,
  type ProposeStatePatchRequest,
  type TextQuoteEvidenceRef,
} from '@ay-ple/interaction-mcp'
import {
  decodeProductReviewFrame,
  type BrowserSafeSemanticReview,
  type BrowserSafeTextQuoteEvidence,
  type ProductReviewFrame,
  type ProductReviewResult,
} from '@ay-ple/product-contract'
import express, {
  type Request,
  type Response,
  type Router,
} from 'express'

const uniqueFileMaxBytes = 1024 * 1024
const aggregateFileMaxBytes = 8 * 1024 * 1024
const contextMaxBytes = 4 * 1024
const defaultLifecycleDeadlineMs = 5_000
const safeMessages: Record<InteractionBrokerErrorCode, string> = {
  invalid_request: 'The interaction request is invalid.',
  forbidden: 'The interaction request is not authorized.',
  busy: 'Another interaction is already pending.',
  evidence_invalid: 'The interaction evidence is invalid.',
  interaction_interrupted: 'The interaction was interrupted.',
  runtime_inactive: 'The product Turn is not active.',
  broker_unavailable: 'The interaction broker is unavailable.',
}

export type ActiveInteractionProductTurn = {
  readonly operationId: string
  readonly nativeThreadId: string
  readonly nativeTurnId: string
}

export type InteractionUiAdapter = {
  publish(frame: ProductReviewFrame): void | Promise<void>
}

export type CreateInteractionBrokerOptions = {
  readonly workspaceRoot: string
  readonly activeProductTurn: () =>
    | ActiveInteractionProductTurn
    | undefined
  readonly uiAdapter: InteractionUiAdapter
  readonly interruptProductTurn?: (
    turn: ActiveInteractionProductTurn,
  ) => void | Promise<void>
  readonly teardownRuntime?: () => void | Promise<void>
  readonly lifecycleDeadlineMs?: number
  /** Test-only fault injection at the filesystem boundary. */
  readonly evidenceReadTestHook?: (
    phase: 'before_open' | 'after_open_stat',
    relativePath: string,
  ) => void | Promise<void>
}

export type InteractionBrokerCredentials = {
  readonly token: string
  readonly binding: string
}

export type InteractionAdapterStatus = {
  readonly ready: Promise<void>
  readonly lost: Promise<void>
  isLost(): boolean
}

export type InteractionBroker = {
  readonly router: Router
  readonly adapterStatus: InteractionAdapterStatus
  credentials(): InteractionBrokerCredentials
  settle(
    interactionId: string,
    result: ProductReviewResult,
  ): Promise<void>
  browserDisconnected(): Promise<void>
  turnInterrupted(): Promise<boolean>
  turnTerminal(): Promise<void>
  runtimeTerminal(): Promise<void>
  runtimeReplaced(): Promise<void>
  adapterLost(): Promise<void>
  appShutdown(): Promise<void>
}

type PendingInteraction = {
  readonly interactionId: string
  readonly turn: ActiveInteractionProductTurn
  readonly heldResponse: Response
  readonly responseReady: Deferred<InteractionBrokerResponse>
  readonly completion: Deferred<
    { readonly ok: true } | { readonly ok: false }
  >
  published: boolean
  state:
    | 'preflight'
    | 'pending'
    | 'settling'
    | 'delivering'
    | 'failed'
    | 'settled'
}

type EvidenceSnapshot = {
  readonly bytes: Buffer
  readonly text: string
}

type FileIdentity = {
  readonly device: number
  readonly inode: number
}

type EvidenceCandidate = {
  readonly path: string
  readonly relativePath: string
  readonly identity: FileIdentity
}

export class InteractionSettlementError extends Error {
  readonly code: 'conflict' | 'delivery_failed'

  constructor(code: InteractionSettlementError['code']) {
    super(code)
    this.name = 'InteractionSettlementError'
    this.code = code
  }
}

export async function createInteractionBroker(
  options: CreateInteractionBrokerOptions,
): Promise<InteractionBroker> {
  const workspace = await requireExactWorkspaceRoot(
    options.workspaceRoot,
  )
  const workspaceRoot = workspace.path
  const credentials = Object.freeze({
    token: randomBytes(32).toString('base64url'),
    binding: `runtime_${randomBytes(16).toString('hex')}`,
  })
  let credentialActive = true
  let intakeOpen = true
  let handshakeAccepted = false
  let lifecycleResponse: Response | undefined
  let lifecycleAccepted = false
  let lifecycleCloseExpected = false
  let adapterLostLatched = false
  let pending: PendingInteraction | undefined
  let terminalPromise: Promise<void> | undefined
  const adapterReady = deferred<void>()
  const adapterLost = deferred<void>()
  const adapterStatus: InteractionAdapterStatus = Object.freeze({
    ready: adapterReady.promise,
    lost: adapterLost.promise,
    isLost: () => adapterLostLatched,
  })
  const router = express.Router()

  router.post('/', (request, response) => {
    void handleHttpRequest(request, response)
  })

  const broker: InteractionBroker = {
    router,
    adapterStatus,
    credentials: () => credentials,
    async settle(interactionId, result) {
      const current = pending
      if (
        !current ||
        current.interactionId !== interactionId ||
        current.state !== 'pending'
      ) {
        throw new InteractionSettlementError('conflict')
      }
      if (!sameTurn(options.activeProductTurn(), current.turn)) {
        await failPending(current, 'runtime_terminated', {
          abortDelivery: true,
        })
        throw new InteractionSettlementError('conflict')
      }
      const decoded = decodeProposeStatePatchResult(result)
      current.state = 'settling'
      current.responseReady.resolve({
        protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
        kind: 'capability_result',
        capability: 'propose_state_patch',
        result: decoded,
      })
      const completion = await current.completion.promise
      if (!completion.ok) {
        throw new InteractionSettlementError('delivery_failed')
      }
    },
    browserDisconnected: async () => {
      await failCallContinuity('transport_failed')
    },
    turnInterrupted: () => failCallContinuity('turn_interrupted'),
    turnTerminal: async () => {
      const current = pending
      if (current) {
        await failPending(current, 'runtime_terminated', {
          abortDelivery: true,
        })
      }
    },
    runtimeTerminal: () => terminate('runtime_terminated', false),
    runtimeReplaced: () => terminate('runtime_terminated', true),
    adapterLost: latchAdapterLoss,
    appShutdown: () => terminate('runtime_terminated', true),
  }
  return broker

  async function handleHttpRequest(
    request: Request,
    response: Response,
  ): Promise<void> {
    if (!isLoopbackPeer(request.socket.remoteAddress)) {
      await writeResponse(response, errorResponse('forbidden'), 403)
      return
    }
    if (!authenticate(request, credentials, credentialActive)) {
      await writeResponse(response, errorResponse('forbidden'), 403)
      return
    }
    if (!intakeOpen) {
      await writeResponse(
        response,
        errorResponse('broker_unavailable'),
        503,
      )
      return
    }

    let decoded
    try {
      const body = await readRequestBody(request)
      decoded = decodeInteractionBrokerRequest(
        JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)),
      )
    } catch {
      if (!response.destroyed) {
        await writeResponse(
          response,
          errorResponse('invalid_request'),
          400,
        )
      }
      return
    }

    if (decoded.kind === 'handshake') {
      handshakeAccepted = true
      await writeResponse(
        response,
        {
          protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
          kind: 'handshake_accepted',
        },
        200,
      )
      return
    }

    if (!handshakeAccepted) {
      await writeResponse(
        response,
        errorResponse('broker_unavailable'),
        503,
      )
      return
    }
    if (decoded.kind === 'lifecycle_open') {
      if (lifecycleResponse) {
        await writeResponse(response, errorResponse('busy'), 409)
        return
      }
      lifecycleResponse = response
      const onLifecycleClose = () => {
        if (lifecycleResponse === response) {
          lifecycleResponse = undefined
          lifecycleAccepted = false
        }
        if (!lifecycleCloseExpected && !response.writableFinished) {
          void latchAdapterLoss()
        }
      }
      response.once('close', onLifecycleClose)
      response.once('error', onLifecycleClose)
      const accepted = await writeLifecycleAccepted(response)
      if (!accepted) {
        void latchAdapterLoss()
        return
      }
      lifecycleAccepted = true
      adapterReady.resolve()
      return
    }
    if (
      !lifecycleResponse ||
      !lifecycleAccepted ||
      adapterLostLatched
    ) {
      await writeResponse(
        response,
        errorResponse('broker_unavailable'),
        503,
      )
      return
    }
    if (pending) {
      await writeResponse(response, errorResponse('busy'), 409)
      return
    }
    const turn = options.activeProductTurn()
    if (!turn || !isActiveTurn(turn)) {
      await writeResponse(
        response,
        errorResponse('runtime_inactive'),
        409,
      )
      return
    }

    const interactionId =
      `interaction_${randomUUID().replaceAll('-', '')}`
    const responseReady = deferred<InteractionBrokerResponse>()
    const completion = deferred<
      { readonly ok: true } | { readonly ok: false }
    >()
    const current: PendingInteraction = {
      interactionId,
      turn: { ...turn },
      heldResponse: response,
      responseReady,
      completion,
      published: false,
      state: 'preflight',
    }
    pending = current
    let aborted = false
    const onAbort = () => {
      aborted = true
      void failPending(current, 'transport_failed', {
        abortDelivery: true,
        interrupt: true,
      })
    }
    request.once('aborted', onAbort)
    response.once('close', () => {
      if (!response.writableFinished) onAbort()
    })

    let requested: ProductReviewFrame & { readonly type: 'review.requested' }
    try {
      const review = await resolveReviewEvidence(
        workspaceRoot,
        workspace.identity,
        decoded.request,
        options.evidenceReadTestHook,
      )
      requested = {
        type: 'review.requested',
        operationId: turn.operationId,
        interactionId,
        review,
      }
      decodeProductReviewFrame(requested)
    } catch {
      rejectBeforePublication(current)
      await writeResponse(
        response,
        errorResponse('evidence_invalid'),
        400,
      )
      return
    }
    if (
      pending !== current ||
      current.state !== 'preflight' ||
      !intakeOpen ||
      !sameTurn(options.activeProductTurn(), current.turn)
    ) {
      if (current.state === 'preflight') {
        await failPending(current, 'runtime_terminated', {
          abortDelivery: true,
        })
      }
      const terminalResponse = await current.responseReady.promise
      if (!response.destroyed) {
        await writeResponse(
          response,
          terminalResponse,
          terminalResponse.kind === 'error'
            ? statusForError(terminalResponse.code)
            : 503,
        )
      }
      return
    }
    try {
      await publishUi(requested)
    } catch {
      rejectBeforePublication(current)
      await boundedLifecycleCall(() =>
        options.interruptProductTurn?.(current.turn),
      ).catch(() => undefined)
      await writeResponse(
        response,
        errorResponse('broker_unavailable'),
        503,
      )
      return
    }
    current.published = true
    current.state = 'pending'

    const brokerResponse = await current.responseReady.promise
    if (aborted || response.destroyed) {
      await failPending(current, 'transport_failed', {
        abortDelivery: true,
        interrupt: true,
      })
      return
    }
    let outboundResponse = brokerResponse
    if (brokerResponse.kind === 'capability_result') {
      if ((current as PendingInteraction).state === 'settling') {
        current.state = 'delivering'
      } else {
        outboundResponse = errorResponse('interaction_interrupted')
      }
    }
    const status = outboundResponse.kind === 'error'
      ? statusForError(outboundResponse.code)
      : 200
    const delivered = await writeResponse(
      response,
      outboundResponse,
      status,
    )
    if (
      outboundResponse.kind === 'capability_result' &&
      (current as PendingInteraction).state === 'delivering'
    ) {
      if (!delivered) {
        await failPending(current, 'transport_failed', {
          abortDelivery: true,
          interrupt: true,
        })
        return
      }
      current.state = 'settled'
      if (pending === current) pending = undefined
      try {
        const resolved = {
          type: 'review.resolved',
          operationId: current.turn.operationId,
          interactionId: current.interactionId,
          result: outboundResponse.result,
        } satisfies ProductReviewFrame
        decodeProductReviewFrame(resolved)
        await publishUi(resolved)
        current.completion.resolve({ ok: true })
      } catch {
        current.completion.resolve({ ok: false })
      }
      return
    }
    if (pending === current) pending = undefined
  }

  async function failCallContinuity(
    reason: Extract<
      ProductReviewFrame,
      { readonly type: 'review.failed' }
    >['reason'],
  ): Promise<boolean> {
    const current = pending
    if (!current) return false
    await failPending(current, reason, {
      abortDelivery: true,
      interrupt: true,
    })
    return true
  }

  function rejectBeforePublication(current: PendingInteraction): void {
    if (pending === current) pending = undefined
    current.state = 'failed'
    current.completion.resolve({ ok: false })
  }

  async function failPending(
    current: PendingInteraction,
    reason: Extract<
      ProductReviewFrame,
      { readonly type: 'review.failed' }
    >['reason'],
    actions: {
      readonly abortDelivery?: boolean
      readonly interrupt?: boolean
    } = {},
  ): Promise<void> {
    if (current.state === 'failed' || current.state === 'settled') return
    if (
      actions.abortDelivery &&
      (current.state === 'settling' || current.state === 'delivering')
    ) {
      current.heldResponse.destroy()
    }
    current.state = 'failed'
    if (pending === current) pending = undefined
    current.responseReady.resolve(errorResponse('interaction_interrupted'))
    current.completion.resolve({ ok: false })
    const followups: Promise<void>[] = []
    if (current.published) {
      const failed = {
        type: 'review.failed',
        operationId: current.turn.operationId,
        interactionId: current.interactionId,
        reason,
      } satisfies ProductReviewFrame
      decodeProductReviewFrame(failed)
      followups.push(publishUi(failed).catch(() => undefined))
    }
    if (actions.interrupt) {
      followups.push(
        boundedLifecycleCall(() =>
          options.interruptProductTurn?.(current.turn),
        ).catch(() => undefined),
      )
    }
    await Promise.all(followups)
  }

  function terminate(
    reason: 'runtime_terminated' | 'transport_failed',
    teardown: boolean,
  ): Promise<void> {
    if (terminalPromise) return terminalPromise
    lifecycleCloseExpected = true
    terminalPromise = (async () => {
      intakeOpen = false
      const current = pending
      const pendingFailure = current
        ? failPending(current, reason, { abortDelivery: true })
        : Promise.resolve()
      credentialActive = false
      const lifecycleClose = closeLifecycle()
      const runtimeTeardown = teardown
        ? boundedLifecycleCall(options.teardownRuntime).catch(() => undefined)
        : Promise.resolve()
      await Promise.all([
        pendingFailure,
        lifecycleClose,
        runtimeTeardown,
      ])
    })()
    return terminalPromise
  }

  function latchAdapterLoss(): Promise<void> {
    if (!adapterLostLatched && !lifecycleCloseExpected) {
      adapterLostLatched = true
      adapterLost.resolve()
    }
    return terminate('transport_failed', true)
  }

  function closeLifecycle(): Promise<void> {
    const response = lifecycleResponse
    lifecycleResponse = undefined
    lifecycleAccepted = false
    if (!response || response.destroyed || response.writableEnded) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        response.off('close', finish)
        response.off('error', finish)
        resolve()
      }
      response.once('close', finish)
      response.once('error', finish)
      response.end(finish)
    })
  }

  function publishUi(frame: ProductReviewFrame): Promise<void> {
    return boundedLifecycleCall(() => options.uiAdapter.publish(frame))
  }

  function boundedLifecycleCall(
    call: (() => void | Promise<void>) | undefined,
  ): Promise<void> {
    if (!call) return Promise.resolve()
    const deadlineMs =
      options.lifecycleDeadlineMs ?? defaultLifecycleDeadlineMs
    return settleWithin(Promise.resolve().then(call), deadlineMs)
  }
}

async function resolveReviewEvidence(
  workspaceRoot: string,
  workspaceRootIdentity: FileIdentity,
  request: ProposeStatePatchRequest,
  testHook:
    | CreateInteractionBrokerOptions['evidenceReadTestHook']
    | undefined,
): Promise<BrowserSafeSemanticReview> {
  await assertWorkspaceRootIdentity(
    workspaceRoot,
    workspaceRootIdentity,
  )
  const snapshots = new Map<string, EvidenceSnapshot>()
  let aggregateBytes = 0
  const changes: BrowserSafeSemanticReview['changes'][number][] = []

  for (const change of request.changes) {
    const evidence: BrowserSafeTextQuoteEvidence[] = []
    for (const reference of change.evidence ?? []) {
      const resolvedPath = await resolveContainedPath(
        workspaceRoot,
        workspaceRootIdentity,
        reference.relativePath,
      )
      let snapshot = snapshots.get(resolvedPath.path)
      if (!snapshot) {
        snapshot = await readEvidenceSnapshot(
          resolvedPath,
          testHook,
        )
        aggregateBytes += snapshot.bytes.byteLength
        if (aggregateBytes > aggregateFileMaxBytes) {
          throw new EvidenceError()
        }
        snapshots.set(resolvedPath.path, snapshot)
      }
      evidence.push(projectEvidence(reference, snapshot))
    }
    const projected = {
      label: change.label,
      description: change.description,
      ...(Object.hasOwn(change, 'before') ? { before: change.before } : {}),
      ...(Object.hasOwn(change, 'after') ? { after: change.after } : {}),
      ...(change.evidence
        ? { evidence }
        : {}),
    }
    changes.push(projected)
  }
  const review = {
    summary: request.summary,
    question: request.question,
    changes,
  }
  await assertWorkspaceRootIdentity(
    workspaceRoot,
    workspaceRootIdentity,
  )
  return review
}

async function resolveContainedPath(
  workspaceRoot: string,
  workspaceRootIdentity: FileIdentity,
  relativePath: string,
): Promise<EvidenceCandidate> {
  const candidate = path.resolve(workspaceRoot, relativePath)
  const relativeCandidate = path.relative(workspaceRoot, candidate)
  if (
    relativeCandidate.length === 0 ||
    relativeCandidate.startsWith(`..${path.sep}`) ||
    relativeCandidate === '..' ||
    path.isAbsolute(relativeCandidate)
  ) {
    throw new EvidenceError()
  }
  const candidateStats = await lstat(candidate).catch(() => {
    throw new EvidenceError()
  })
  if (!candidateStats.isFile() || candidateStats.isSymbolicLink()) {
    throw new EvidenceError()
  }
  const resolved = await realpath(candidate).catch(() => {
    throw new EvidenceError()
  })
  const relative = path.relative(workspaceRoot, resolved)
  if (
    resolved !== candidate ||
    relative.length === 0 ||
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    throw new EvidenceError()
  }
  await assertWorkspaceRootIdentity(
    workspaceRoot,
    workspaceRootIdentity,
  )
  return {
    path: resolved,
    relativePath,
    identity: {
      device: candidateStats.dev,
      inode: candidateStats.ino,
    },
  }
}

async function readEvidenceSnapshot(
  candidate: EvidenceCandidate,
  testHook:
    | CreateInteractionBrokerOptions['evidenceReadTestHook']
    | undefined,
): Promise<EvidenceSnapshot> {
  await testHook?.('before_open', candidate.relativePath)
  const handle = await open(
    candidate.path,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  ).catch(() => {
    throw new EvidenceError()
  })
  try {
    const stat = await handle.stat()
    if (
      !stat.isFile() ||
      stat.dev !== candidate.identity.device ||
      stat.ino !== candidate.identity.inode ||
      stat.size > uniqueFileMaxBytes
    ) {
      throw new EvidenceError()
    }
    await testHook?.('after_open_stat', candidate.relativePath)
    const bytes = await readBoundedFile(handle, uniqueFileMaxBytes)
    if (
      bytes.byteLength > uniqueFileMaxBytes ||
      bytes.byteLength !== stat.size
    ) {
      throw new EvidenceError()
    }
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      throw new EvidenceError()
    }
    return { bytes, text }
  } finally {
    await handle.close()
  }
}

async function readBoundedFile(
  handle: Awaited<ReturnType<typeof open>>,
  maximumBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = []
  let bytesReadTotal = 0
  while (bytesReadTotal <= maximumBytes) {
    const chunk = Buffer.allocUnsafe(
      Math.min(64 * 1024, maximumBytes + 1 - bytesReadTotal),
    )
    const { bytesRead } = await handle.read(
      chunk,
      0,
      chunk.byteLength,
      null,
    )
    if (bytesRead === 0) break
    chunks.push(chunk.subarray(0, bytesRead))
    bytesReadTotal += bytesRead
  }
  if (bytesReadTotal > maximumBytes) throw new EvidenceError()
  return Buffer.concat(chunks, bytesReadTotal)
}

function projectEvidence(
  reference: TextQuoteEvidenceRef,
  snapshot: EvidenceSnapshot,
): BrowserSafeTextQuoteEvidence {
  if (sha256(snapshot.bytes) !== reference.contentDigest) {
    throw new EvidenceError()
  }
  const text = snapshot.text.startsWith('\ufeff')
    ? snapshot.text.slice(1)
    : snapshot.text
  const position = findOccurrence(
    text,
    reference.locator.quote,
    reference.locator.occurrence,
  )
  if (position < 0) throw new EvidenceError()
  const afterPosition = position + reference.locator.quote.length
  return {
    relativePath: reference.relativePath,
    contentDigest: reference.contentDigest,
    quote: reference.locator.quote,
    occurrence: reference.locator.occurrence,
    contextBefore: suffixWithinBytes(
      text.slice(0, position),
      contextMaxBytes,
    ),
    contextAfter: prefixWithinBytes(
      text.slice(afterPosition),
      contextMaxBytes,
    ),
  }
}

function findOccurrence(
  text: string,
  quote: string,
  occurrence: number,
): number {
  let from = 0
  for (let index = 1; index <= occurrence; index += 1) {
    const found = text.indexOf(quote, from)
    if (found < 0) return -1
    if (index === occurrence) return found
    from = found + quote.length
  }
  return -1
}

function prefixWithinBytes(value: string, maximumBytes: number): string {
  let result = ''
  for (const character of value) {
    if (Buffer.byteLength(result + character, 'utf8') > maximumBytes) break
    result += character
  }
  return result
}

function suffixWithinBytes(value: string, maximumBytes: number): string {
  const characters = [...value]
  let result = ''
  for (let index = characters.length - 1; index >= 0; index -= 1) {
    const next = characters[index] + result
    if (Buffer.byteLength(next, 'utf8') > maximumBytes) break
    result = next
  }
  return result
}

async function requireExactWorkspaceRoot(input: string): Promise<{
  readonly path: string
  readonly identity: FileIdentity
}> {
  if (!path.isAbsolute(input)) {
    throw new TypeError('The interaction workspace root is invalid.')
  }
  const normalized = path.resolve(input)
  const canonical = await realpath(normalized)
  if (canonical !== normalized) {
    throw new TypeError('The interaction workspace root is invalid.')
  }
  const candidateStats = await lstat(canonical)
  if (!candidateStats.isDirectory() || candidateStats.isSymbolicLink()) {
    throw new TypeError('The interaction workspace root is invalid.')
  }
  const handle = await open(
    canonical,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  )
  let identity: FileIdentity
  try {
    const stats = await handle.stat()
    if (
      !stats.isDirectory() ||
      stats.dev !== candidateStats.dev ||
      stats.ino !== candidateStats.ino
    ) {
      throw new TypeError('The interaction workspace root is invalid.')
    }
    identity = {
      device: stats.dev,
      inode: stats.ino,
    }
  } finally {
    await handle.close()
  }
  await assertWorkspaceRootIdentity(canonical, identity).catch(() => {
    throw new TypeError('The interaction workspace root is invalid.')
  })
  return {
    path: canonical,
    identity,
  }
}

async function assertWorkspaceRootIdentity(
  workspaceRoot: string,
  expected: FileIdentity,
): Promise<void> {
  const [canonical, stats] = await Promise.all([
    realpath(workspaceRoot),
    lstat(workspaceRoot),
  ]).catch(() => {
    throw new EvidenceError()
  })
  if (
    canonical !== workspaceRoot ||
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    stats.dev !== expected.device ||
    stats.ino !== expected.inode
  ) {
    throw new EvidenceError()
  }
}

function authenticate(
  request: Request,
  credentials: InteractionBrokerCredentials,
  active: boolean,
): boolean {
  if (!active) return false
  const authorization = request.header('authorization')
  const binding = request.header('x-ay-ple-runtime-binding')
  return (
    typeof authorization === 'string' &&
    constantTimeEqual(authorization, `Bearer ${credentials.token}`) &&
    typeof binding === 'string' &&
    constantTimeEqual(binding, credentials.binding)
  )
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest()
  const rightDigest = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

function isLoopbackPeer(address: string | undefined): boolean {
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'
  )
}

function isActiveTurn(turn: ActiveInteractionProductTurn): boolean {
  return (
    /^operation_[0-9a-f]{32}$/.test(turn.operationId) &&
    turn.nativeThreadId.length > 0 &&
    turn.nativeTurnId.length > 0
  )
}

function sameTurn(
  left: ActiveInteractionProductTurn | undefined,
  right: ActiveInteractionProductTurn,
): boolean {
  return (
    left?.operationId === right.operationId &&
    left.nativeThreadId === right.nativeThreadId &&
    left.nativeTurnId === right.nativeTurnId
  )
}

function errorResponse(
  code: InteractionBrokerErrorCode,
): InteractionBrokerResponse {
  return {
    protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
    kind: 'error',
    code,
    displayMessage: safeMessages[code],
  }
}

function statusForError(code: InteractionBrokerErrorCode): number {
  if (code === 'invalid_request' || code === 'evidence_invalid') return 400
  if (code === 'forbidden') return 403
  if (code === 'busy' || code === 'runtime_inactive') return 409
  return 503
}

async function readRequestBody(
  request: IncomingMessage,
): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += bytes.byteLength
    if (total > INTERACTION_BROKER_BODY_MAX_BYTES) {
      throw new TypeError('The interaction request is too large.')
    }
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, total)
}

function writeResponse(
  response: Response,
  body: InteractionBrokerResponse,
  status: number,
): Promise<boolean> {
  if (response.destroyed || response.writableEnded) {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      response.off('close', onClose)
      response.off('error', onError)
      resolve(value)
    }
    const onClose = () => finish(response.writableFinished)
    const onError = () => finish(false)
    response.once('close', onClose)
    response.once('error', onError)
    response.status(status)
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(body), () => finish(true))
  })
}

function writeLifecycleAccepted(response: Response): Promise<boolean> {
  if (response.destroyed || response.writableEnded) {
    return Promise.resolve(false)
  }
  const body = JSON.stringify({
    protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
    kind: 'lifecycle_accepted',
  } satisfies InteractionBrokerResponse)
  if (
    Buffer.byteLength(body, 'utf8') + 1 >
    INTERACTION_BROKER_BODY_MAX_BYTES
  ) {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      response.off('close', onClose)
      response.off('error', onError)
      resolve(value)
    }
    const onClose = () => finish(false)
    const onError = () => finish(false)
    response.once('close', onClose)
    response.once('error', onError)
    response.status(200)
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.write(`${body}\n`, () => finish(true))
  })
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

type Deferred<T> = {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

class EvidenceError extends Error {}
class LifecycleDeadlineError extends Error {}

function settleWithin(
  promise: Promise<void>,
  deadlineMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(
      () => finish(() => reject(new LifecycleDeadlineError())),
      deadlineMs,
    )
    const finish = (complete: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      complete()
    }
    promise.then(
      () => finish(resolve),
      (error) => finish(() => reject(error)),
    )
  })
}
