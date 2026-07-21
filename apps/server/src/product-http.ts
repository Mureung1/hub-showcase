import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import {
  PRODUCT_JSON_ENVELOPE_MAX_BYTES,
  ProductContractError,
  decodeCreateProductCourseRequest,
  decodeEmptyProductRequest,
  decodeFirstAssignmentRequest,
  decodeFirstAssignmentRetryRequest,
  decodeProductChatRequest,
  decodeProductInteractionAnswerRequest,
  decodeProductReviewRequest,
  isProductDigest,
  isProductInteractionId,
  isProductMaterialId,
  isProductOperationId,
  type ProductAccountReadiness,
  type ProductAssignment,
  type ProductBootstrap,
  type ProductError,
  type ProductEvidenceRef,
  type ProductMaterialPreview,
  type ProductMaterialRefreshResponse,
  type ProductOperationFrame,
  type ProductReviewResponse,
  type ProductSettledHistory,
  type ProductSettledModelingRun,
  type ProductSettledStatePatch,
  type ProductUserConfirmation,
  type ProductWorkspace,
  type ProductWorkspaceActivationResponse,
  type ProductWorkspaceResponse,
  type ReadyProductWorkspace,
} from '@ay-ple/product-contract'

import {
  ProductOperationError,
  type ProductOperationCoordinator,
  type ProductInteractionResponseInput,
  type ProductOperationSink,
} from './product-operation-coordinator.js'
import { writeNdjsonLine } from './codex-chat.js'
import { isLoopbackAddress } from './codex-chat-config.js'
import {
  SemesterWorkspaceError,
  type Assignment,
  type EvidenceRef,
  type ModelingRun,
  type SemesterWorkspaceController,
  type SemesterWorkspaceSnapshot,
  type UserConfirmation,
} from './semester-workspace.js'

const safeInvalidRequest = '요청을 확인하지 못했습니다.'
const safeForbidden = '이 요청은 local AY-PLE에서만 사용할 수 있습니다.'
const safeUnavailable = '학기 작업공간 기능이 준비되지 않았습니다.'
const safeOperationFailed = '학기 작업공간 요청을 완료하지 못했습니다.'
const safeAccountNotReady = 'Codex에 로그인한 뒤 다시 시도해 주세요.'
const safeAccountUnavailable =
  'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.'
const defaultProductWriteDrainMs = 5_000
type ProductAccountReadinessSource = () => Promise<
  | { readonly state: 'ready' }
  | { readonly state: 'not_ready' }
>
const workspaceErrorPresentation: Record<
  SemesterWorkspaceError['code'],
  { readonly status: number; readonly displayMessage: string }
> = {
  action_active: {
    status: 409,
    displayMessage: '다른 Assignment 작업이 진행 중입니다.',
  },
  action_conflict: {
    status: 409,
    displayMessage: 'Assignment 작업 상태가 변경되었습니다.',
  },
  action_invalid: {
    status: 400,
    displayMessage: 'Assignment 작업 입력을 확인해 주세요.',
  },
  chooser_unavailable: {
    status: 503,
    displayMessage: '이 기기에서는 학기 폴더를 선택할 수 없습니다.',
  },
  course_already_exists: {
    status: 409,
    displayMessage: '이 작업공간에는 이미 과목이 있습니다.',
  },
  course_invalid: { status: 400, displayMessage: '과목 이름을 확인해 주세요.' },
  course_unknown: {
    status: 404,
    displayMessage: '선택한 과목을 찾지 못했습니다.',
  },
  material_scan_limit: {
    status: 422,
    displayMessage: '자료가 너무 많아 안전하게 새로고침하지 못했습니다.',
  },
  material_stale: {
    status: 409,
    displayMessage: '자료가 변경되었습니다. 자료 목록을 새로고침해 주세요.',
  },
  material_unknown: {
    status: 404,
    displayMessage: '선택한 자료를 찾지 못했습니다.',
  },
  execution_cleanup_required: {
    status: 409,
    displayMessage: '이전 작업 정리를 확인한 뒤 다시 시도해 주세요.',
  },
  execution_guard_conflict: {
    status: 409,
    displayMessage: '작업 중 자료 또는 학기 상태가 변경되었습니다.',
  },
  root_invalid: {
    status: 400,
    displayMessage: '선택한 학기 폴더를 열 수 없습니다.',
  },
  root_overlap: {
    status: 400,
    displayMessage: '학기 폴더와 AY-PLE 관리 폴더가 겹칩니다.',
  },
  store_invalid: {
    status: 400,
    displayMessage: '학기 작업공간 정보를 읽지 못했습니다.',
  },
  workspace_inactive: {
    status: 409,
    displayMessage: '먼저 학기 폴더를 선택해 주세요.',
  },
  workspace_incompatible: {
    status: 409,
    displayMessage:
      '이 학기 작업공간의 제품 상태를 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
  },
}

export function createProductRouter(
  controller: SemesterWorkspaceController | undefined,
  configuredOrigin?: string,
  productOperations?: ProductOperationCoordinator,
  writeDrainMs = defaultProductWriteDrainMs,
  readAccountReadiness?: ProductAccountReadinessSource,
): Router {
  const router = express.Router()

  router.use((request, response, next) => {
    if (configuredOrigin && request.headers.origin === configuredOrigin) {
      response.setHeader('access-control-allow-origin', configuredOrigin)
      response.setHeader('vary', 'Origin')
    }
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      next()
      return
    }
    if (!isAllowedMutation(request, configuredOrigin)) {
      sendError(response, 403, 'forbidden', safeForbidden)
      return
    }
    if (request.method === 'OPTIONS') {
      response
        .status(204)
        .setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
        .setHeader('access-control-allow-headers', 'content-type')
        .end()
      return
    }
    next()
  })

  router.get('/bootstrap', async (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    const operationStatus = productOperations?.operationStatus() ?? 'idle'
    const workspaceSnapshot = controller?.snapshot() ?? null
    const workspace = projectProductWorkspace(workspaceSnapshot)
    const history = projectSettledHistory(controller, workspaceSnapshot)
    const accountReadiness = await projectAccountReadiness(
      readAccountReadiness,
    )
    const body: ProductBootstrap = {
      accountReadiness,
      operationStatus,
      workspace,
      history,
    }
    response.json(body)
  })

  router.get('/materials/:materialId/preview', async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (
      !controller ||
      !isProductMaterialId(request.params.materialId) ||
      typeof request.query.digest !== 'string' ||
      !isProductDigest(request.query.digest) ||
      Object.keys(request.query).sort().join(',') !== 'digest'
    ) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const preview = await controller.readMaterialPreview({
        materialId: request.params.materialId,
        digest: request.query.digest,
      })
      const body: ProductMaterialPreview = preview
      response.json(body)
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.use(
    express.json({
      limit: PRODUCT_JSON_ENVELOPE_MAX_BYTES,
      strict: true,
      type: 'application/json',
    }),
  )

  router.post('/workspaces/activate', async (request, response) => {
    if (!controller) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    if (!tryDecode(decodeEmptyProductRequest, request.body)) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const activation = await controller.activate()
      const body: ProductWorkspaceActivationResponse = {
        status: activation.status,
        workspace: projectProductWorkspace(activation.workspace),
      }
      response.json(body)
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.post('/courses', async (request, response) => {
    if (!controller) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = tryDecode(decodeCreateProductCourseRequest, request.body)
    if (!input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const body: ProductWorkspaceResponse = {
        workspace: projectReadyProductWorkspace(
          await controller.createCourse(input.displayName),
        ),
      }
      response.status(201).json(body)
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.post('/materials/refresh', async (request, response) => {
    if (!controller) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    if (!tryDecode(decodeEmptyProductRequest, request.body)) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const refreshed = await controller.refreshMaterials()
      const body: ProductMaterialRefreshResponse = {
        outcome: refreshed.outcome,
        workspace: projectReadyProductWorkspace(refreshed.workspace),
      }
      response.json(body)
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.post('/actions/first-assignment', async (request, response) => {
    if (!productOperations) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = tryDecode(decodeFirstAssignmentRequest, request.body)
    if (!input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    await runProductStream(
      request,
      response,
      writeDrainMs,
      (options) => productOperations.startAssignment(input, options),
      (operationId) => productOperations.disconnect(operationId),
    ).catch((error: unknown) => sendProductOperationError(response, error))
  })

  router.post('/actions/first-assignment/retry', async (request, response) => {
    if (!productOperations) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = tryDecode(decodeFirstAssignmentRetryRequest, request.body)
    if (!input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    await runProductStream(
      request,
      response,
      writeDrainMs,
      (options) => productOperations.startAssignment(input, options),
      (operationId) => productOperations.disconnect(operationId),
    ).catch((error: unknown) => sendProductOperationError(response, error))
  })

  router.post('/chat/messages', async (request, response) => {
    if (!productOperations) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = tryDecode(decodeProductChatRequest, request.body)
    if (!input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    await runProductStream(
      request,
      response,
      writeDrainMs,
      (options) => productOperations.sendChat(input, options),
      (operationId) => productOperations.disconnect(operationId),
    ).catch((error: unknown) => sendProductOperationError(response, error))
  })

  router.post('/reviews/:interactionId', async (request, response) => {
    if (!productOperations) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = tryDecode(decodeProductReviewRequest, request.body)
    if (!isProductInteractionId(request.params.interactionId) || !input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const outcome = await productOperations.submitReview(
        input.decision === 'revise'
          ? {
              interactionId: request.params.interactionId,
              patchId: input.patchId,
              decisionKey: input.decisionKey,
              decision: 'revise',
              feedback: input.feedback,
            }
          : {
              interactionId: request.params.interactionId,
              patchId: input.patchId,
              decisionKey: input.decisionKey,
              decision: input.decision,
            },
      )
      const body: ProductReviewResponse =
        outcome.type === 'revision_requested'
          ? {
              patchId: outcome.patch.id,
              decisionKey: outcome.binding.decisionKey,
              decision: 'revision_requested',
              outcome: 'replacement_pending',
              confirmedRevision: outcome.confirmedRevision,
              replayed: outcome.replayed,
              continuation: outcome.continuation,
            }
          : outcome.confirmation.decision === 'accepted'
            ? {
                patchId: outcome.patch.id,
                decisionKey: outcome.binding.decisionKey,
                decision: 'accepted',
                outcome: 'applied',
                confirmedRevision: outcome.confirmedRevision,
                replayed: outcome.replayed,
                continuation: outcome.continuation,
              }
            : {
                patchId: outcome.patch.id,
                decisionKey: outcome.binding.decisionKey,
                decision: 'rejected',
                outcome: 'not_applied',
                confirmedRevision: outcome.confirmedRevision,
                replayed: outcome.replayed,
                continuation: outcome.continuation,
              }
      response.json(body)
    } catch (error) {
      sendProductOperationError(response, error)
    }
  })

  router.post(
    '/operations/:operationId/interactions/:interactionId/answer',
    async (request, response) => {
      if (!productOperations) {
        sendError(response, 503, 'product_unavailable', safeUnavailable)
        return
      }
      const input = tryDecode(
        decodeProductInteractionAnswerRequest,
        request.body,
      )
      if (
        !isProductOperationId(request.params.operationId) ||
        !isProductInteractionId(request.params.interactionId) ||
        !input
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      await respondToInteraction(
        productOperations,
        response,
        request.params.operationId,
        request.params.interactionId,
        { type: 'answer', answers: input.answers },
      )
    },
  )

  router.post(
    '/operations/:operationId/interactions/:interactionId/cancel',
    async (request, response) => {
      if (!productOperations) {
        sendError(response, 503, 'product_unavailable', safeUnavailable)
        return
      }
      if (
        !isProductOperationId(request.params.operationId) ||
        !isProductInteractionId(request.params.interactionId) ||
        !tryDecode(decodeEmptyProductRequest, request.body)
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      await respondToInteraction(
        productOperations,
        response,
        request.params.operationId,
        request.params.interactionId,
        { type: 'cancel' },
      )
    },
  )

  router.post(
    '/operations/:operationId/interrupt',
    async (request, response) => {
      if (!productOperations) {
        sendError(response, 503, 'product_unavailable', safeUnavailable)
        return
      }
      if (
        !tryDecode(decodeEmptyProductRequest, request.body) ||
        !isProductOperationId(request.params.operationId)
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      try {
        await productOperations.interrupt(request.params.operationId)
        response.status(202).end()
      } catch (error) {
        sendProductOperationError(response, error)
      }
    },
  )

  router.use(
    (
      _error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      if (!response.headersSent) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
      }
    },
  )

  return router
}

async function runProductStream(
  request: Request,
  response: Response,
  writeDrainMs: number,
  run: (options: {
    readonly disconnected: () => boolean
    readonly mcpUrl: string
    readonly sink: ProductOperationSink
  }) => Promise<void>,
  disconnect: (operationId: string) => void,
): Promise<void> {
  let disconnected = request.aborted || response.destroyed
  let streamStarted = false
  let operationId: string | undefined
  const disconnectActiveOperation = () => {
    if (operationId) disconnect(operationId)
  }
  const onAborted = () => {
    disconnected = true
    disconnectActiveOperation()
  }
  const onClose = () => {
    if (!response.writableEnded) {
      disconnected = true
      disconnectActiveOperation()
    }
  }
  request.once('aborted', onAborted)
  request.socket.once('close', onAborted)
  response.once('close', onClose)
  const sink: ProductOperationSink = {
    async write(frame: ProductOperationFrame) {
      operationId ??= frame.operationId
      if (disconnected) disconnectActiveOperation()
      if (!streamStarted) {
        streamStarted = true
        response.status(200)
        response.setHeader('content-type', 'application/x-ndjson')
        response.setHeader('cache-control', 'no-store')
      }
      return writeNdjsonLine(response, frame, writeDrainMs)
    },
    end() {
      if (!response.destroyed && !response.writableEnded) response.end()
    },
  }
  try {
    await run({
      disconnected: () =>
        disconnected ||
        request.aborted ||
        request.socket.destroyed ||
        response.destroyed,
      mcpUrl: localMcpUrl(request),
      sink,
    })
  } finally {
    request.off('aborted', onAborted)
    request.socket.off('close', onAborted)
    response.off('close', onClose)
  }
}

function tryDecode<T>(
  decode: (value: unknown) => T,
  value: unknown,
): T | undefined {
  try {
    return decode(value)
  } catch (error) {
    if (error instanceof ProductContractError) return undefined
    throw error
  }
}

function localMcpUrl(request: Request): string {
  const port = request.socket.localPort
  if (!port) throw new ProductOperationError(
    'product_unavailable',
    503,
    safeUnavailable,
  )
  const host = request.socket.localAddress === '::1' ? '[::1]' : '127.0.0.1'
  return `http://${host}:${port}/api/product-mcp/`
}

async function respondToInteraction(
  productOperations: ProductOperationCoordinator,
  response: Response,
  operationId: string,
  interactionId: string,
  interactionResponse: ProductInteractionResponseInput['response'],
): Promise<void> {
  try {
    await productOperations.respondToInteraction({
      operationId,
      interactionId,
      response: interactionResponse,
    })
    response.status(202).end()
  } catch (error) {
    sendProductOperationError(response, error)
  }
}

function sendProductOperationError(response: Response, error: unknown): void {
  if (response.headersSent) {
    if (!response.writableEnded && !response.destroyed) response.end()
    return
  }
  if (error instanceof ProductOperationError) {
    sendError(response, error.status, error.code, error.displayMessage)
    return
  }
  sendWorkspaceError(response, error)
}

function projectProductWorkspace(
  snapshot: SemesterWorkspaceSnapshot | null,
): ProductWorkspace | null {
  if (snapshot === null) return null
  if (snapshot.state === 'incompatible') {
    return {
      state: snapshot.state,
      readOnly: snapshot.readOnly,
      displayMessage: snapshot.displayMessage,
    }
  }
  return {
    state: snapshot.state,
    confirmedRevision: snapshot.confirmedRevision,
    course:
      snapshot.course === null
        ? null
        : {
            id: snapshot.course.id,
            displayName: snapshot.course.displayName,
          },
    materials: snapshot.materials.map((material) => ({
      id: material.id,
      relativePath: material.relativePath,
      digest: material.digest,
      mediaType: material.mediaType,
      size: material.size,
    })),
    recovery: snapshot.recovery ? { ...snapshot.recovery } : null,
  }
}

function projectReadyProductWorkspace(
  snapshot: SemesterWorkspaceSnapshot,
): ReadyProductWorkspace {
  const workspace = projectProductWorkspace(snapshot)
  if (workspace?.state !== 'ready') {
    throw new TypeError('The workspace projection is not ready.')
  }
  return workspace
}

async function projectAccountReadiness(
  source: ProductAccountReadinessSource | undefined,
): Promise<ProductAccountReadiness> {
  if (!source) {
    return { state: 'unavailable', displayMessage: safeAccountUnavailable }
  }
  try {
    const readiness = await source()
    return readiness.state === 'ready'
      ? readiness
      : { state: 'not_ready', displayMessage: safeAccountNotReady }
  } catch {
    return { state: 'unavailable', displayMessage: safeAccountUnavailable }
  }
}

function projectSettledHistory(
  controller: SemesterWorkspaceController | undefined,
  workspace: SemesterWorkspaceSnapshot | null,
): ProductSettledHistory {
  if (!controller || workspace?.state !== 'ready' || workspace.course === null) {
    return emptyProductHistory()
  }
  const assignmentState = controller.assignmentState()
  const modelingRuns = controller.modelingRuns()
  return {
    assignments: assignmentState.assignments.map(projectAssignment),
    statePatches: assignmentState.statePatches.flatMap((patch) =>
      patch.status === 'pending'
        ? []
        : [
            {
              id: patch.id,
              courseId: patch.courseId,
              baseRevision: patch.baseRevision,
              status: patch.status,
              createdAt: patch.createdAt,
              applyOutcome: patch.applyOutcome,
            },
          ],
    ),
    userConfirmations: assignmentState.userConfirmations.map(
      projectUserConfirmation,
    ),
    modelingRuns: modelingRuns
      .filter(isSettledModelingRun)
      .map((run) => projectSettledModelingRun(run, modelingRuns)),
  }
}

function emptyProductHistory(): ProductSettledHistory {
  return {
    assignments: [],
    statePatches: [],
    userConfirmations: [],
    modelingRuns: [],
  }
}

function projectAssignment(assignment: Assignment): ProductAssignment {
  return {
    id: assignment.id,
    courseId: assignment.courseId,
    title: assignment.title,
    dueAt: assignment.dueAt,
    submissionMethod: assignment.submissionMethod,
    evidence: assignment.evidence.map(projectEvidence),
  }
}

function projectEvidence(evidence: EvidenceRef): ProductEvidenceRef {
  return {
    field: evidence.field,
    materialId: evidence.rawMaterialId,
    digest: evidence.digest,
    quote: evidence.quote,
  }
}

function projectUserConfirmation(
  confirmation: UserConfirmation,
): ProductUserConfirmation {
  return {
    id: confirmation.id,
    patchId: confirmation.patchId,
    decision: confirmation.decision,
    settledAt: confirmation.settledAt,
    assignmentId: confirmation.assignmentId ?? null,
    resultingRevision: confirmation.resultingRevision ?? null,
    outcome: confirmation.outcome,
  }
}

function projectSettledModelingRun(
  run: ModelingRun & {
    readonly status: Exclude<
      ModelingRun['status'],
      'starting' | 'running' | 'acceptance_unknown'
    >
    readonly validationOutcome: Exclude<
      ModelingRun['validationOutcome'],
      'pending'
    >
    readonly settledAt: string
  },
  allRuns: readonly ModelingRun[],
): ProductSettledModelingRun {
  const retryable = !allRuns.some((candidate) => candidate.retryOfRunId === run.id)
  const recovery =
    run.recoveryOutcome?.outcome === 'continuation_lost'
      ? {
          outcome: 'continuation_lost' as const,
          retryable: false as const,
          confirmedRevision: run.recoveryOutcome.confirmedRevision,
        }
      : run.recoveryOutcome?.outcome === 'interrupted' ||
          run.recoveryOutcome?.outcome === 'unknown'
        ? { outcome: run.recoveryOutcome.outcome, retryable }
        : null
  return {
    id: run.id,
    actionId: run.actionId,
    courseId: run.courseId,
    recipe: {
      name: run.recipeName,
      version: run.recipeVersion,
      requestedSkillName: run.requestedSkillName,
    },
    sources: run.sourceBaseline.map((source) => ({
      materialId: source.rawMaterialId,
      digest: source.digest,
    })),
    retryOfRunId: run.retryOfRunId ?? null,
    recovery,
    status: run.status,
    validationOutcome: run.validationOutcome,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    settledAt: run.settledAt,
  }
}

function isSettledModelingRun(
  run: ModelingRun,
): run is ModelingRun & {
  readonly status: Exclude<
    ModelingRun['status'],
    'starting' | 'running' | 'acceptance_unknown'
  >
  readonly validationOutcome: Exclude<
    ModelingRun['validationOutcome'],
    'pending'
  >
  readonly settledAt: string
} {
  return (
    run.status !== 'starting' &&
    run.status !== 'running' &&
    run.status !== 'acceptance_unknown' &&
    run.validationOutcome !== 'pending' &&
    run.settledAt !== undefined
  )
}

function isAllowedMutation(
  request: Request,
  configuredOrigin: string | undefined,
): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false
  const origin = request.headers.origin
  return origin === undefined ||
    (configuredOrigin !== undefined && origin === configuredOrigin)
}

function sendWorkspaceError(response: Response, error: unknown): void {
  if (!(error instanceof SemesterWorkspaceError)) {
    sendError(response, 500, 'operation_failed', safeOperationFailed)
    return
  }
  const presentation = workspaceErrorPresentation[error.code]
  sendError(response, presentation.status, error.code, presentation.displayMessage)
}

function sendError(
  response: Response,
  status: number,
  code: string,
  displayMessage: string,
): void {
  const body: ProductError = { code, displayMessage }
  response.status(status).json(body)
}
