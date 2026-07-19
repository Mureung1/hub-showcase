export type ProductRawMaterial = {
  readonly id: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: 'text/plain; charset=utf-8'
  readonly size: number
}

export type ReadyProductWorkspace = {
  readonly state: 'ready'
  readonly storeFormatVersion: 1
  readonly confirmedRevision: number
  readonly course: {
    readonly id: string
    readonly displayName: string
  } | null
  readonly materials: readonly ProductRawMaterial[]
}

export type IncompatibleProductWorkspace = {
  readonly state: 'incompatible'
  readonly readOnly: true
  readonly supportedStoreFormatVersion: 1
  readonly foundStoreFormatVersion: number
  readonly displayMessage: string
}

export type ProductWorkspace =
  | ReadyProductWorkspace
  | IncompatibleProductWorkspace

export type ProductMaterialPreview = {
  readonly materialId: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: 'text/plain; charset=utf-8'
  readonly size: number
  readonly text: string
  readonly truncated: boolean
}

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

export async function fetchProductBootstrap(
  signal?: AbortSignal,
): Promise<ProductWorkspace | null> {
  const response = await fetch('/api/product/bootstrap', {
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw await toProductApiError(response)
  const value = await parseJson(response)
  if (!isExactObject(value, ['workspace'])) throw invalidResponse()
  return value.workspace === null ? null : parseWorkspace(value.workspace)
}

export async function activateProductWorkspace(
  signal?: AbortSignal,
): Promise<ProductWorkspace | null> {
  const value = await postJson('/api/product/workspaces/activate', {}, signal)
  if (!isExactObject(value, ['status', 'workspace'])) throw invalidResponse()
  if (value.status !== 'activated' && value.status !== 'cancelled') {
    throw invalidResponse()
  }
  return value.workspace === null ? null : parseWorkspace(value.workspace)
}

export async function createProductCourse(
  displayName: string,
  signal?: AbortSignal,
): Promise<ReadyProductWorkspace> {
  const value = await postJson(
    '/api/product/courses',
    { displayName },
    signal,
  )
  if (!isExactObject(value, ['workspace'])) throw invalidResponse()
  const workspace = parseWorkspace(value.workspace)
  if (workspace.state !== 'ready') throw invalidResponse()
  return workspace
}

export async function refreshProductMaterials(
  signal?: AbortSignal,
): Promise<ReadyProductWorkspace> {
  const value = await postJson('/api/product/materials/refresh', {}, signal)
  if (!isExactObject(value, ['workspace'])) throw invalidResponse()
  const workspace = parseWorkspace(value.workspace)
  if (workspace.state !== 'ready') throw invalidResponse()
  return workspace
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
  return parsePreview(await parseJson(response))
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
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
  return parseJson(response)
}

function parseWorkspace(value: unknown): ProductWorkspace {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidResponse()
  }
  if (value.state === 'incompatible') {
    if (
      !isExactObject(value, [
        'displayMessage',
        'foundStoreFormatVersion',
        'readOnly',
        'state',
        'supportedStoreFormatVersion',
      ]) ||
      value.readOnly !== true ||
      value.supportedStoreFormatVersion !== 1 ||
      !Number.isSafeInteger(value.foundStoreFormatVersion) ||
      typeof value.displayMessage !== 'string' ||
      value.displayMessage.length === 0
    ) {
      throw invalidResponse()
    }
    return value as unknown as IncompatibleProductWorkspace
  }
  if (
    value.state !== 'ready' ||
    !isExactObject(value, [
      'confirmedRevision',
      'course',
      'materials',
      'state',
      'storeFormatVersion',
    ]) ||
    value.storeFormatVersion !== 1 ||
    !Number.isSafeInteger(value.confirmedRevision) ||
    Number(value.confirmedRevision) < 0 ||
    !isCourseOrNull(value.course) ||
    !Array.isArray(value.materials)
  ) {
    throw invalidResponse()
  }
  return {
    state: 'ready',
    storeFormatVersion: 1,
    confirmedRevision: Number(value.confirmedRevision),
    course: value.course,
    materials: value.materials.map(parseMaterial),
  }
}

function parseMaterial(value: unknown): ProductRawMaterial {
  if (
    !isExactObject(value, ['digest', 'id', 'mediaType', 'relativePath', 'size']) ||
    typeof value.id !== 'string' ||
    !/^material_[0-9a-f]{32}$/.test(value.id) ||
    typeof value.relativePath !== 'string' ||
    !isSafeRelativePath(value.relativePath) ||
    typeof value.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.digest) ||
    value.mediaType !== 'text/plain; charset=utf-8' ||
    !Number.isSafeInteger(value.size) ||
    Number(value.size) < 0
  ) {
    throw invalidResponse()
  }
  return value as unknown as ProductRawMaterial
}

function parsePreview(value: unknown): ProductMaterialPreview {
  if (
    !isExactObject(value, [
      'digest',
      'materialId',
      'mediaType',
      'relativePath',
      'size',
      'text',
      'truncated',
    ]) ||
    typeof value.materialId !== 'string' ||
    !/^material_[0-9a-f]{32}$/.test(value.materialId) ||
    typeof value.relativePath !== 'string' ||
    !isSafeRelativePath(value.relativePath) ||
    typeof value.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.digest) ||
    value.mediaType !== 'text/plain; charset=utf-8' ||
    !Number.isSafeInteger(value.size) ||
    typeof value.text !== 'string' ||
    typeof value.truncated !== 'boolean'
  ) {
    throw invalidResponse()
  }
  return value as unknown as ProductMaterialPreview
}

function isCourseOrNull(
  value: unknown,
): value is ReadyProductWorkspace['course'] {
  return (
    value === null ||
    (isExactObject(value, ['displayName', 'id']) &&
      typeof value.id === 'string' &&
      /^course_[0-9a-f]{32}$/.test(value.id) &&
      typeof value.displayName === 'string' &&
      value.displayName.trim().length > 0)
  )
}

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.startsWith('../') &&
    value !== '..' &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
  )
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown
  } catch {
    throw invalidResponse()
  }
}

async function toProductApiError(response: Response): Promise<ProductApiError> {
  try {
    const value = await parseJson(response)
    if (
      !isExactObject(value, ['code', 'displayMessage']) ||
      typeof value.code !== 'string' ||
      value.code.length === 0 ||
      typeof value.displayMessage !== 'string' ||
      value.displayMessage.length === 0
    ) {
      throw new TypeError()
    }
    return new ProductApiError(value.code, value.displayMessage)
  } catch {
    return new ProductApiError(
      'request_failed',
      '학기 작업공간 응답을 확인하지 못했습니다.',
    )
  }
}

function invalidResponse(): ProductApiError {
  return new ProductApiError(
    'invalid_response',
    '학기 작업공간 응답을 확인하지 못했습니다.',
  )
}

function isExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
