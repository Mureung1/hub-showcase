import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import {
  AssignmentActionError,
  type AssignmentActionCoordinator,
  type AssignmentActionRequest,
  type ProductChatRequest,
  type ProductOperationFrame,
  type ProductOperationSink,
} from './assignment-action.js'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
} from './assignment-recipe.js'
import { writeNdjsonLine } from './codex-chat.js'
import { isLoopbackAddress } from './codex-chat-config.js'
import {
  SemesterWorkspaceError,
  type SemesterWorkspaceController,
  type SemesterWorkspaceSnapshot,
} from './semester-workspace.js'

const productJsonEnvelopeLimit = 16 * 1024
const safeInvalidRequest = '요청을 확인하지 못했습니다.'
const safeForbidden = '이 요청은 local AY-PLE에서만 사용할 수 있습니다.'
const safeUnavailable = '학기 작업공간 기능이 준비되지 않았습니다.'
const safeOperationFailed = '학기 작업공간 요청을 완료하지 못했습니다.'
const defaultProductWriteDrainMs = 5_000
type ProductWorkspaceSnapshot =
  | {
      readonly state: 'ready'
      readonly confirmedRevision: number
      readonly course: {
        readonly id: string
        readonly displayName: string
      } | null
      readonly materials: readonly {
        readonly id: string
        readonly relativePath: string
        readonly digest: string
        readonly mediaType: 'text/plain; charset=utf-8'
        readonly size: number
      }[]
    }
  | {
      readonly state: 'incompatible'
      readonly readOnly: true
      readonly displayMessage: string
    }
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
  actions?: AssignmentActionCoordinator,
  writeDrainMs = defaultProductWriteDrainMs,
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

  router.get('/bootstrap', (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    response.json({
      workspace: projectProductWorkspace(controller?.snapshot() ?? null),
    })
  })

  router.get('/materials/:materialId/preview', async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (
      !controller ||
      !/^material_[0-9a-f]{32}$/.test(request.params.materialId) ||
      typeof request.query.digest !== 'string' ||
      !/^[0-9a-f]{64}$/.test(request.query.digest) ||
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
      response.json(preview)
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.use(
    express.json({
      limit: productJsonEnvelopeLimit,
      strict: true,
      type: 'application/json',
    }),
  )

  router.post('/workspaces/activate', async (request, response) => {
    if (!controller) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    if (!isExactObject(request.body, [])) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const activation = await controller.activate()
      response.json({
        status: activation.status,
        workspace: projectProductWorkspace(activation.workspace),
      })
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.post('/courses', async (request, response) => {
    if (!controller) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    if (
      !isExactObject(request.body, ['displayName']) ||
      typeof request.body.displayName !== 'string'
    ) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      response.status(201).json({
        workspace: projectProductWorkspace(
          await controller.createCourse(request.body.displayName),
        ),
      })
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.post('/materials/refresh', async (request, response) => {
    if (!controller) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    if (!isExactObject(request.body, [])) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      response.json({
        workspace: projectProductWorkspace(await controller.refreshMaterials()),
      })
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

  router.post('/actions/first-assignment', async (request, response) => {
    if (!actions) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = parseAssignmentActionRequest(request.body)
    if (!input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    await runProductStream(
      request,
      response,
      writeDrainMs,
      (options) => actions.startAssignment(input, options),
      (operationId) => actions.disconnect(operationId),
    ).catch((error: unknown) => sendActionError(response, error))
  })

  router.post('/chat/messages', async (request, response) => {
    if (!actions) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    const input = parseProductChatRequest(request.body)
    if (!input) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    await runProductStream(
      request,
      response,
      writeDrainMs,
      (options) => actions.sendChat(input, options),
      (operationId) => actions.disconnect(operationId),
    ).catch((error: unknown) => sendActionError(response, error))
  })

  router.post('/reviews/:interactionId', async (request, response) => {
    if (!actions) {
      sendError(response, 503, 'product_unavailable', safeUnavailable)
      return
    }
    if (
      !isOpaqueProductId(request.params.interactionId) ||
      !isExactObject(request.body, ['decision', 'decisionKey', 'patchId']) ||
      !isPatchId(request.body.patchId) ||
      !isDecisionKey(request.body.decisionKey) ||
      (request.body.decision !== 'accept' && request.body.decision !== 'reject')
    ) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const commit = await actions.submitReview({
        interactionId: request.params.interactionId,
        patchId: request.body.patchId,
        decisionKey: request.body.decisionKey,
        decision: request.body.decision,
      })
      response.json({
        patchId: commit.patch.id,
        decisionKey: commit.binding.decisionKey,
        decision: commit.confirmation.decision,
        outcome: commit.confirmation.outcome,
        confirmedRevision: commit.confirmedRevision,
        replayed: commit.replayed,
      })
    } catch (error) {
      sendActionError(response, error)
    }
  })

  router.post(
    '/operations/:operationId/interrupt',
    async (request, response) => {
      if (!actions) {
        sendError(response, 503, 'product_unavailable', safeUnavailable)
        return
      }
      if (
        !isExactObject(request.body, []) ||
        !/^(?:action|chat)_[0-9a-f]{32}$/.test(request.params.operationId)
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      try {
        await actions.interrupt(request.params.operationId)
        response.status(202).end()
      } catch (error) {
        sendActionError(response, error)
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

function parseAssignmentActionRequest(
  body: unknown,
): AssignmentActionRequest | undefined {
  if (
    !isExactObject(body, [
      'arguments',
      'courseId',
      'materials',
      'recipeVersion',
    ]) ||
    !/^course_[0-9a-f]{32}$/.test(String(body.courseId)) ||
    body.recipeVersion !== FIRST_ASSIGNMENT_RECIPE_VERSION ||
    !isExactObject(body.arguments, ['timezone']) ||
    body.arguments.timezone !== FIRST_ASSIGNMENT_ARGUMENTS.timezone ||
    !isMaterialSelection(body.materials, 2, 2)
  ) {
    return undefined
  }
  return {
    courseId: body.courseId as string,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials: body.materials,
  }
}

function parseProductChatRequest(body: unknown): ProductChatRequest | undefined {
  if (
    !isExactObject(body, ['materials', 'text']) ||
    typeof body.text !== 'string' ||
    body.text.trim().length === 0 ||
    Buffer.byteLength(body.text, 'utf8') > 128 * 1024 ||
    !isMaterialSelection(body.materials, 0, 2)
  ) {
    return undefined
  }
  return { text: body.text, materials: body.materials }
}

function isMaterialSelection(
  value: unknown,
  minimum: number,
  maximum: number,
): value is { readonly id: string; readonly digest: string }[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every(
      (material) =>
        isExactObject(material, ['digest', 'id']) &&
        typeof material.id === 'string' &&
        /^material_[0-9a-f]{32}$/.test(material.id) &&
        typeof material.digest === 'string' &&
        /^[0-9a-f]{64}$/.test(material.digest),
    ) &&
    new Set(value.map((material) => material.id)).size === value.length
  )
}

function localMcpUrl(request: Request): string {
  const port = request.socket.localPort
  if (!port) throw new AssignmentActionError(
    'product_unavailable',
    503,
    safeUnavailable,
  )
  const host = request.socket.localAddress === '::1' ? '[::1]' : '127.0.0.1'
  return `http://${host}:${port}/api/product-mcp/`
}

function isOpaqueProductId(value: string): boolean {
  return value.length > 0 && Buffer.byteLength(value, 'utf8') <= 256
}

function isPatchId(value: unknown): value is string {
  return typeof value === 'string' && /^patch_[0-9a-f]{32}$/.test(value)
}

function isDecisionKey(value: unknown): value is string {
  return typeof value === 'string' && /^decision_[0-9a-f]{32}$/.test(value)
}

function sendActionError(response: Response, error: unknown): void {
  if (response.headersSent) {
    if (!response.writableEnded && !response.destroyed) response.end()
    return
  }
  if (error instanceof AssignmentActionError) {
    sendError(response, error.status, error.code, error.displayMessage)
    return
  }
  sendWorkspaceError(response, error)
}

function projectProductWorkspace(
  snapshot: SemesterWorkspaceSnapshot | null,
): ProductWorkspaceSnapshot | null {
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
  }
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

function isExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
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
  response.status(status).json({ code, displayMessage })
}
