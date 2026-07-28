import {
  ProductContractError,
  decodeEmptyProductRequest,
  decodeProductCodexSettings,
  decodeProductError,
  decodeProductInteractionAnswerRequest,
  decodeProductReviewFrame,
  decodeProductReviewResult,
  decodeProductWorkspaceSourceList,
  decodeProductWorkspaceTextPreview,
  decodeTargetProductChatRequest,
  decodeTargetProductOperationFrame,
  isProductInteractionId,
  isProductOperationId,
  type ProductCodexSettings,
  type ProductCodexTurnSettings,
  type ProductInteractionAnswerRequest,
  type ProductReviewFrame,
  type ProductReviewResult,
  type ProductWorkspaceSourceList,
  type ProductWorkspaceTextPreview,
  type TargetProductOperationFrame,
} from '@ay-ple/product-contract'

export type PreparedProductFrame =
  | TargetProductOperationFrame
  | ProductReviewFrame

const maximumLineBytes = 1024 * 1024
const safeInvalidResponse = 'AY 작업 흐름을 확인하지 못했습니다.'

export class PreparedProductApiError extends Error {
  readonly code: string
  readonly displayMessage: string

  constructor(code: string, displayMessage: string) {
    super(displayMessage)
    this.name = 'PreparedProductApiError'
    this.code = code
    this.displayMessage = displayMessage
  }
}

export async function fetchPreparedCodexSettings(
  signal?: AbortSignal,
): Promise<ProductCodexSettings> {
  const response = await fetch('/api/product/codex-settings', {
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw await responseError(response)
  return decodeShared(decodeProductCodexSettings, await responseJson(response))
}

export async function fetchPreparedWorkspaceSources(
  signal?: AbortSignal,
): Promise<ProductWorkspaceSourceList> {
  const response = await fetch('/api/product/sources', {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw await responseError(response)
  return decodeShared(
    decodeProductWorkspaceSourceList,
    await responseJson(response),
  )
}

export async function fetchPreparedWorkspaceText(
  relativePath: string,
  signal?: AbortSignal,
): Promise<ProductWorkspaceTextPreview> {
  const response = await fetch(
    `/api/product/sources/text?${sourceQuery(relativePath)}`,
    {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal,
    },
  )
  if (!response.ok) throw await responseError(response)
  const preview = decodeShared(
    decodeProductWorkspaceTextPreview,
    await responseJson(response),
  )
  if (preview.relativePath !== relativePath) throw invalidResponse()
  return preview
}

export async function fetchPreparedWorkspacePdf(
  relativePath: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(
    `/api/product/sources/pdf?${sourceQuery(relativePath)}`,
    {
      cache: 'no-store',
      headers: { accept: 'application/pdf' },
      signal,
    },
  )
  if (!response.ok) throw await responseError(response)
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]
  if (contentType !== 'application/pdf') throw invalidResponse()
  const pdf = await response.blob()
  if (pdf.type !== 'application/pdf') throw invalidResponse()
  return pdf
}

export async function streamPreparedChat(
  input: {
    readonly text: string
    readonly codexSettings?: ProductCodexTurnSettings
  },
  onFrame: (frame: PreparedProductFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const request = decodeShared(decodeTargetProductChatRequest, {
    text: input.text,
    ...(input.codexSettings === undefined
      ? {}
      : { codexSettings: input.codexSettings }),
  })
  const response = await fetch('/api/product/chat/messages', {
    method: 'POST',
    headers: {
      accept: 'application/x-ndjson, application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) throw await responseError(response)
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]
  if (contentType !== 'application/x-ndjson' || !response.body) {
    throw invalidResponse()
  }
  for await (const frame of decodePreparedNdjson(response.body)) {
    onFrame(frame)
  }
}

export async function submitPreparedReview(
  interactionId: string,
  result: ProductReviewResult,
  signal?: AbortSignal,
): Promise<void> {
  requireInteraction(interactionId)
  await postExpected(
    `/api/product/reviews/${encodeURIComponent(interactionId)}`,
    decodeShared(decodeProductReviewResult, result),
    204,
    signal,
  )
}

export async function answerPreparedInteraction(
  operationId: string,
  interactionId: string,
  input: ProductInteractionAnswerRequest,
  signal?: AbortSignal,
): Promise<void> {
  requireOperationInteraction(operationId, interactionId)
  await postExpected(
    `/api/product/operations/${encodeURIComponent(operationId)}/interactions/${encodeURIComponent(interactionId)}/answer`,
    decodeShared(decodeProductInteractionAnswerRequest, input),
    202,
    signal,
  )
}

export async function cancelPreparedInteraction(
  operationId: string,
  interactionId: string,
  signal?: AbortSignal,
): Promise<void> {
  requireOperationInteraction(operationId, interactionId)
  await postExpected(
    `/api/product/operations/${encodeURIComponent(operationId)}/interactions/${encodeURIComponent(interactionId)}/cancel`,
    decodeEmptyProductRequest({}),
    202,
    signal,
  )
}

export async function interruptPreparedOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!isProductOperationId(operationId)) throw invalidResponse()
  await postExpected(
    `/api/product/operations/${encodeURIComponent(operationId)}/interrupt`,
    decodeEmptyProductRequest({}),
    202,
    signal,
  )
}

async function* decodePreparedNdjson(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<PreparedProductFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let pending = ''
  let completed = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        completed = true
        break
      }
      pending += decodeChunk(decoder, value)
      let newline = pending.indexOf('\n')
      while (newline >= 0) {
        yield decodeLine(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        newline = pending.indexOf('\n')
      }
      requireBounded(pending)
    }
    pending += decodeChunk(decoder)
    if (pending) yield decodeLine(pending)
  } finally {
    if (!completed) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function decodeLine(line: string): PreparedProductFrame {
  requireBounded(line)
  if (!line) throw invalidResponse()
  try {
    const value = JSON.parse(line) as unknown
    try {
      return decodeProductReviewFrame(value)
    } catch (error) {
      if (!(error instanceof ProductContractError)) throw error
      return decodeTargetProductOperationFrame(value)
    }
  } catch {
    throw invalidResponse()
  }
}

function decodeChunk(
  decoder: TextDecoder,
  value?: Uint8Array,
): string {
  try {
    return decoder.decode(value, { stream: value !== undefined })
  } catch {
    throw invalidResponse()
  }
}

function requireBounded(value: string): void {
  if (new TextEncoder().encode(value).byteLength > maximumLineBytes) {
    throw invalidResponse()
  }
}

async function postExpected(
  url: string,
  body: unknown,
  expectedStatus: 202 | 204,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw await responseError(response)
  if (response.status !== expectedStatus || (await response.text()) !== '') {
    throw invalidResponse()
  }
}

function requireInteraction(interactionId: string): void {
  if (!isProductInteractionId(interactionId)) throw invalidResponse()
}

function requireOperationInteraction(
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

function sourceQuery(relativePath: string): string {
  return new URLSearchParams({ relativePath }).toString()
}

async function responseError(
  response: Response,
): Promise<PreparedProductApiError> {
  try {
    const error = decodeShared(decodeProductError, await responseJson(response))
    return new PreparedProductApiError(error.code, error.displayMessage)
  } catch {
    return invalidResponse()
  }
}

async function responseJson(response: Response): Promise<unknown> {
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

function invalidResponse(): PreparedProductApiError {
  return new PreparedProductApiError('invalid_response', safeInvalidResponse)
}
