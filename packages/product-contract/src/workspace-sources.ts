import {
  invalidContract,
  isExactObject,
  utf8Bytes,
} from './contract-values.js'

export const PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES = 4_096
export const PRODUCT_WORKSPACE_SOURCE_LIST_MAX_BYTES = 2 * 1024 * 1024
export const PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES = 4 * 1024
export const PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES = 1024 * 1024
export const PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_JSON_BYTES = 2 * 1024 * 1024

export type ProductWorkspaceSourcePreviewKind =
  | 'text'
  | 'pdf'
  | 'unsupported'

export type ProductWorkspaceSource = {
  readonly relativePath: string
  readonly size: number
  readonly previewKind: ProductWorkspaceSourcePreviewKind
}

export type ProductWorkspaceSourceList = {
  readonly sources: readonly ProductWorkspaceSource[]
}

export type ProductWorkspaceTextPreview = {
  readonly relativePath: string
  readonly digest: string
  readonly text: string
  readonly truncated: boolean
}

export function decodeProductWorkspaceSourceList(
  value: unknown,
): ProductWorkspaceSourceList {
  if (
    !isExactObject(value, ['sources']) ||
    !Array.isArray(value.sources) ||
    value.sources.length > PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES ||
    !hasJsonByteBound(value, PRODUCT_WORKSPACE_SOURCE_LIST_MAX_BYTES)
  ) {
    throw invalidContract()
  }

  const relativePaths = new Set<string>()
  for (const source of value.sources) {
    if (
      !isExactObject(source, ['previewKind', 'relativePath', 'size']) ||
      !isWorkspaceRelativePath(source.relativePath) ||
      !Number.isSafeInteger(source.size) ||
      Number(source.size) < 0 ||
      !isPreviewKind(source.previewKind) ||
      relativePaths.has(source.relativePath)
    ) {
      throw invalidContract()
    }
    relativePaths.add(source.relativePath)
  }

  return value as unknown as ProductWorkspaceSourceList
}

export function decodeProductWorkspaceTextPreview(
  value: unknown,
): ProductWorkspaceTextPreview {
  if (
    !isExactObject(value, [
      'digest',
      'relativePath',
      'text',
      'truncated',
    ]) ||
    !isWorkspaceRelativePath(value.relativePath) ||
    typeof value.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.digest) ||
    typeof value.text !== 'string' ||
    utf8Bytes(value.text) > PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES ||
    typeof value.truncated !== 'boolean' ||
    !hasJsonByteBound(
      value,
      PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_JSON_BYTES,
    )
  ) {
    throw invalidContract()
  }

  return value as unknown as ProductWorkspaceTextPreview
}

function isPreviewKind(
  value: unknown,
): value is ProductWorkspaceSourcePreviewKind {
  return value === 'text' || value === 'pdf' || value === 'unsupported'
}

function isWorkspaceRelativePath(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    utf8Bytes(value) > PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES ||
    value.startsWith('/') ||
    value.includes('\\') ||
    /[\p{Cc}]/u.test(value)
  ) {
    return false
  }

  return value
    .split('/')
    .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
}

function hasJsonByteBound(value: unknown, maximumBytes: number): boolean {
  try {
    return utf8Bytes(JSON.stringify(value)) <= maximumBytes
  } catch {
    return false
  }
}
