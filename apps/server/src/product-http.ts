import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import { isLoopbackAddress } from './codex-chat-config.js'
import {
  SemesterWorkspaceError,
  type SemesterWorkspaceController,
} from './semester-workspace.js'

const productJsonEnvelopeLimit = 16 * 1024
const safeInvalidRequest = '요청을 확인하지 못했습니다.'
const safeForbidden = '이 요청은 local AY-PLE에서만 사용할 수 있습니다.'
const safeUnavailable = '학기 작업공간 기능이 준비되지 않았습니다.'
const safeOperationFailed = '학기 작업공간 요청을 완료하지 못했습니다.'

export function createProductRouter(
  controller: SemesterWorkspaceController | undefined,
  configuredOrigin?: string,
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
    response.json({ workspace: controller?.snapshot() ?? null })
  })

  router.get('/materials/:materialId/preview', async (request, response) => {
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
      response.setHeader('cache-control', 'no-store')
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
      const workspace =
        activation.status === 'activated' && activation.workspace.state === 'ready'
          ? await controller.refreshMaterials()
          : activation.workspace
      response.json({ status: activation.status, workspace })
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
        workspace: await controller.createCourse(request.body.displayName),
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
      response.json({ workspace: await controller.refreshMaterials() })
    } catch (error) {
      sendWorkspaceError(response, error)
    }
  })

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
  const status =
    error.code === 'material_stale' ? 409 :
    error.code === 'material_unknown' ? 404 :
    error.code === 'workspace_inactive' ? 409 :
    error.code === 'workspace_incompatible' ? 409 :
    error.code === 'course_already_exists' ? 409 :
    error.code === 'course_unknown' ? 404 :
    error.code === 'chooser_unavailable' ? 503 :
    error.code === 'material_scan_limit' ? 422 : 400
  const messages: Partial<Record<SemesterWorkspaceError['code'], string>> = {
    chooser_unavailable: '이 기기에서는 학기 폴더를 선택할 수 없습니다.',
    course_already_exists: '이 작업공간에는 이미 과목이 있습니다.',
    course_invalid: '과목 이름을 확인해 주세요.',
    course_unknown: '선택한 과목을 찾지 못했습니다.',
    material_scan_limit: '자료가 너무 많아 안전하게 새로고침하지 못했습니다.',
    material_stale: '자료가 변경되었습니다. 자료 목록을 새로고침해 주세요.',
    material_unknown: '선택한 자료를 찾지 못했습니다.',
    root_invalid: '선택한 학기 폴더를 열 수 없습니다.',
    root_overlap: '학기 폴더와 AY-PLE 관리 폴더가 겹칩니다.',
    store_invalid: '학기 작업공간 정보를 읽지 못했습니다.',
    workspace_inactive: '먼저 학기 폴더를 선택해 주세요.',
    workspace_incompatible: '이 학기 작업공간은 더 최신 AY-PLE에서 열어야 합니다.',
  }
  sendError(response, status, error.code, messages[error.code] ?? safeOperationFailed)
}

function sendError(
  response: Response,
  status: number,
  code: string,
  displayMessage: string,
): void {
  response.status(status).json({ code, displayMessage })
}
