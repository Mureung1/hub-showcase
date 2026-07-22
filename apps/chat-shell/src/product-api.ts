import {
  ProductContractError,
  decodeCreateProductCourseRequest,
  decodeEmptyProductRequest,
  decodeFirstAssignmentRequest,
  decodeFirstAssignmentRetryRequest,
  decodeProductBootstrap,
  decodeProductChatRequest,
  decodeProductError,
  decodeProductInteractionAnswerRequest,
  decodeProductMaterialRefreshResponse,
  decodeProductMaterialPreview,
  decodeProductOperationFrame,
  decodeProductReviewRequest,
  decodeProductReviewResponse,
  decodeProductWorkspaceActivationResponse,
  decodeProductWorkspaceResponse,
  isProductInteractionId,
  isProductOperationId,
  type CreateProductCourseRequest,
  type FirstAssignmentRequest,
  type FirstAssignmentRetryRequest,
  type ProductBootstrap,
  type ProductChatRequest,
  type ProductInteractionAnswerRequest,
  type ProductMaterialPreview,
  type ProductMaterialRefreshResponse,
  type ProductOperationFrame,
  type ProductRawMaterial,
  type ProductReviewRequest,
  type ProductReviewResponse,
  type ProductWorkspaceActivationResponse,
  type ReadyProductWorkspace,
} from '@ay-ple/product-contract'

export type {
  CreateProductCourseRequest,
  FirstAssignmentRequest,
  FirstAssignmentRetryRequest,
  IncompatibleProductWorkspace,
  ProductAccountReadiness,
  ProductAssignment,
  ProductBootstrap,
  ProductChatRequest,
  ProductEvidenceRef,
  ProductInteractionAnswerRequest,
  ProductMaterialPreview,
  ProductMaterialRefreshResponse,
  ProductMaterialSelection,
  ProductOperationFrame,
  ProductQuestion,
  ProductRawMaterial,
  ProductReviewRequest,
  ProductReviewResponse,
  ProductSettledHistory,
  ProductSettledModelingRun,
  ProductSettledStatePatch,
  ProductStatePatch,
  ProductUserConfirmation,
  ProductWorkspace,
  ProductWorkspaceActivationResponse,
  ReadyProductWorkspace,
} from '@ay-ple/product-contract'

const maxProductNdjsonLineBytes = 1024 * 1024
const productSettlementPollMs = 100
const safeInvalidResponse = '학기 작업공간 응답을 확인하지 못했습니다.'

export class ProductApiError extends Error {
  readonly code: string
  readonly displayMessage: string

  constructor(code: string, displayMessage: string) {
    super(displayMessage)
    this.name = 'ProductApiError'
    this.code = code
    this.displayMessage = displayMessage
  }
}

export class ProductStreamError extends ProductApiError {
  constructor() {
    super('invalid_response', '학기 작업 흐름을 확인하지 못했습니다.')
    this.name = 'ProductStreamError'
  }
}

export async function fetchProductBootstrap(
  signal?: AbortSignal,
): Promise<ProductBootstrap> {
  const response = await fetch('/api/product/bootstrap', {
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw await toProductApiError(response)
  return parseJsonResponse(response, decodeProductBootstrap)
}

export async function fetchSettledProductBootstrap(
  signal?: AbortSignal,
): Promise<ProductBootstrap> {
  while (true) {
    const bootstrap = await fetchProductBootstrap(signal)
    if (bootstrap.operationStatus === 'idle') return bootstrap
    await waitForProductSettlement(signal)
  }
}

export async function activateProductWorkspace(
  signal?: AbortSignal,
): Promise<ProductWorkspaceActivationResponse> {
  const request = decodeEmptyProductRequest({})
  const response = await postJson(
    '/api/product/workspaces/activate',
    request,
    signal,
  )
  return decodeShared(
    decodeProductWorkspaceActivationResponse,
    await parseJson(response),
  )
}

export async function createProductCourse(
  displayName: string,
  signal?: AbortSignal,
): Promise<ReadyProductWorkspace> {
  const request: CreateProductCourseRequest = decodeShared(
    decodeCreateProductCourseRequest,
    { displayName },
  )
  const response = await postJson('/api/product/courses', request, signal)
  return decodeShared(
    decodeProductWorkspaceResponse,
    await parseJson(response),
  ).workspace
}

export async function refreshProductMaterials(
  signal?: AbortSignal,
): Promise<ProductMaterialRefreshResponse> {
  const request = decodeEmptyProductRequest({})
  const response = await postJson(
    '/api/product/materials/refresh',
    request,
    signal,
  )
  return decodeShared(
    decodeProductMaterialRefreshResponse,
    await parseJson(response),
  )
}

export async function fetchProductMaterialPreview(
  material: Pick<ProductRawMaterial, 'id' | 'digest'>,
  signal?: AbortSignal,
): Promise<ProductMaterialPreview> {
  const response = await fetch(
    `/api/product/materials/${encodeURIComponent(material.id)}/preview?digest=${encodeURIComponent(material.digest)}`,
    { headers: { accept: 'application/json' }, signal },
  )
  if (!response.ok) throw await toProductApiError(response)
  return parseJsonResponse(response, decodeProductMaterialPreview)
}

export async function streamFirstAssignment(
  input: FirstAssignmentRequest,
  onFrame: (frame: ProductOperationFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  await streamProductOperation(
    '/api/product/actions/first-assignment',
    decodeShared(decodeFirstAssignmentRequest, input),
    onFrame,
    signal,
  )
}

export async function streamFirstAssignmentRetry(
  input: FirstAssignmentRetryRequest,
  onFrame: (frame: ProductOperationFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  await streamProductOperation(
    '/api/product/actions/first-assignment/retry',
    decodeShared(decodeFirstAssignmentRetryRequest, input),
    onFrame,
    signal,
  )
}

export async function streamProductChat(
  input: ProductChatRequest,
  onFrame: (frame: ProductOperationFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  await streamProductOperation(
    '/api/product/chat/messages',
    decodeShared(decodeProductChatRequest, input),
    onFrame,
    signal,
  )
}

export async function submitProductReview(
  interactionId: string,
  input: ProductReviewRequest,
  signal?: AbortSignal,
): Promise<ProductReviewResponse> {
  requireInteractionId(interactionId)
  const request = decodeShared(decodeProductReviewRequest, input)
  const response = await postJson(
    `/api/product/reviews/${encodeURIComponent(interactionId)}`,
    request,
    signal,
  )
  return parseJsonResponse(response, decodeProductReviewResponse)
}

export async function answerProductInteraction(
  operationId: string,
  interactionId: string,
  input: ProductInteractionAnswerRequest,
  signal?: AbortSignal,
): Promise<void> {
  requireOperationScope(operationId, interactionId)
  const request = decodeShared(decodeProductInteractionAnswerRequest, input)
  await postEmptyResponse(
    `/api/product/operations/${encodeURIComponent(operationId)}/interactions/${encodeURIComponent(interactionId)}/answer`,
    request,
    signal,
  )
}

export async function cancelProductInteraction(
  operationId: string,
  interactionId: string,
  signal?: AbortSignal,
): Promise<void> {
  requireOperationScope(operationId, interactionId)
  await postEmptyResponse(
    `/api/product/operations/${encodeURIComponent(operationId)}/interactions/${encodeURIComponent(interactionId)}/cancel`,
    decodeEmptyProductRequest({}),
    signal,
  )
}

export async function interruptProductOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!isProductOperationId(operationId)) throw invalidResponse()
  await postEmptyResponse(
    `/api/product/operations/${encodeURIComponent(operationId)}/interrupt`,
    decodeEmptyProductRequest({}),
    signal,
  )
}

export async function consumeProductOperationResponse(
  response: Response,
  onFrame: (frame: ProductOperationFrame) => void,
): Promise<void> {
  if (!response.ok) throw await toProductApiError(response)
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]
  if (contentType !== 'application/x-ndjson' || response.body === null) {
    throw new ProductStreamError()
  }
  for await (const frame of decodeProductOperationNdjson(response.body)) {
    onFrame(frame)
  }
}

export async function* decodeProductOperationNdjson(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ProductOperationFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let pending = ''
  let reachedEnd = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        reachedEnd = true
        break
      }
      try {
        pending += decoder.decode(value, { stream: true })
      } catch {
        throw new ProductStreamError()
      }
      let newline = pending.indexOf('\n')
      while (newline >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        yield decodeProductLine(line)
        newline = pending.indexOf('\n')
      }
      requireBoundedProductLine(pending)
    }
    try {
      pending += decoder.decode()
    } catch {
      throw new ProductStreamError()
    }
    if (pending.length > 0) yield decodeProductLine(pending)
  } finally {
    if (!reachedEnd) {
      try {
        await reader.cancel()
      } catch {
        // Preserve the decoder error or consumer return that ended iteration.
      }
    }
    reader.releaseLock()
  }
}

async function streamProductOperation(
  url: string,
  body: FirstAssignmentRequest | ProductChatRequest,
  onFrame: (frame: ProductOperationFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/x-ndjson, application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })
  await consumeProductOperationResponse(response, onFrame)
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw await toProductApiError(response)
  return response
}

async function postEmptyResponse(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<void> {
  const response = await postJson(url, body, signal)
  if (response.status !== 202 || (await response.text()) !== '') {
    throw invalidResponse()
  }
}

function decodeProductLine(line: string): ProductOperationFrame {
  requireBoundedProductLine(line)
  if (line.length === 0) throw new ProductStreamError()
  try {
    return decodeProductOperationFrame(JSON.parse(line) as unknown)
  } catch {
    throw new ProductStreamError()
  }
}

function requireBoundedProductLine(line: string): void {
  if (new TextEncoder().encode(line).byteLength > maxProductNdjsonLineBytes) {
    throw new ProductStreamError()
  }
}

function requireOperationScope(
  operationId: string,
  interactionId: string,
): void {
  if (
    !isProductOperationId(operationId) ||
    !isProductInteractionId(interactionId)
  ) {
    throw invalidResponse()
  }
}

function requireInteractionId(interactionId: string): void {
  if (!isProductInteractionId(interactionId)) throw invalidResponse()
}

async function parseJsonResponse<T>(
  response: Response,
  decode: (value: unknown) => T,
): Promise<T> {
  return decodeShared(decode, await parseJson(response))
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown
  } catch {
    throw invalidResponse()
  }
}

function decodeShared<T>(
  decode: (value: unknown) => T,
  value: unknown,
): T {
  try {
    return decode(value)
  } catch (error) {
    if (error instanceof ProductContractError) throw invalidResponse()
    throw error
  }
}

async function toProductApiError(response: Response): Promise<ProductApiError> {
  try {
    const error = decodeShared(decodeProductError, await parseJson(response))
    return new ProductApiError(error.code, error.displayMessage)
  } catch {
    return new ProductApiError('request_failed', safeInvalidResponse)
  }
}

function invalidResponse(): ProductApiError {
  return new ProductApiError('invalid_response', safeInvalidResponse)
}

function waitForProductSettlement(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(finish, productSettlementPollMs)
    signal?.addEventListener('abort', abort, { once: true })

    function finish() {
      signal?.removeEventListener('abort', abort)
      resolve()
    }

    function abort() {
      clearTimeout(timer)
      reject(signal?.reason)
    }
  })
}
