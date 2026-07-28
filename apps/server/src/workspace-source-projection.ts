import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import {
  lstat,
  open,
  readdir,
  realpath,
} from 'node:fs/promises'
import path from 'node:path'
import { TextDecoder } from 'node:util'

import {
  PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES,
  PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES,
  PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES,
  decodeProductWorkspaceSourceList,
  decodeProductWorkspaceTextPreview,
  type ProductWorkspaceSourceList,
  type ProductWorkspaceSourcePreviewKind,
  type ProductWorkspaceTextPreview,
} from '@ay-ple/product-contract'

const defaultListMaxDepth = 32
const defaultTextSourceMaxBytes = 16 * 1024 * 1024
const defaultPdfMaxBytes = 32 * 1024 * 1024
const managedDirectoryNames = new Set(['node_modules'])
const scaffoldFileNames = new Set(['AGENTS.md', 'workspace-state.json'])
const textExtensions = new Set([
  '.c',
  '.cpp',
  '.css',
  '.csv',
  '.go',
  '.h',
  '.hpp',
  '.html',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.log',
  '.md',
  '.py',
  '.rs',
  '.sh',
  '.tex',
  '.ts',
  '.tsv',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
])

type WorkspaceSourceProjectionErrorCode =
  | 'invalid_path'
  | 'source_not_found'
  | 'unsupported_type'
  | 'unsupported_encoding'
  | 'invalid_pdf'
  | 'source_too_large'
  | 'scan_limit_exceeded'
  | 'source_unavailable'

type WorkspaceSourceProjectionLimits = {
  readonly listMaxEntries: number
  readonly listMaxDepth: number
  readonly textPreviewMaxBytes: number
  readonly textSourceMaxBytes: number
  readonly pdfMaxBytes: number
}

export class WorkspaceSourceProjectionError extends Error {
  constructor(
    readonly code: WorkspaceSourceProjectionErrorCode,
  ) {
    super(code)
    this.name = 'WorkspaceSourceProjectionError'
  }
}

export type WorkspaceSourcePdf = {
  readonly relativePath: string
  readonly digest: string
  readonly bytes: Buffer
}

export type WorkspaceSourceProjection = {
  list(): Promise<ProductWorkspaceSourceList>
  readText(relativePath: string): Promise<ProductWorkspaceTextPreview>
  readPdf(relativePath: string): Promise<WorkspaceSourcePdf>
}

export async function createWorkspaceSourceProjection(options: {
  readonly workspaceRoot: string
  readonly limits?: Partial<WorkspaceSourceProjectionLimits>
}): Promise<WorkspaceSourceProjection> {
  const workspaceRoot = await canonicalDirectory(options.workspaceRoot)
  const limits: WorkspaceSourceProjectionLimits = {
    listMaxEntries:
      options.limits?.listMaxEntries ??
      PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES,
    listMaxDepth: options.limits?.listMaxDepth ?? defaultListMaxDepth,
    textPreviewMaxBytes:
      options.limits?.textPreviewMaxBytes ??
      PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES,
    textSourceMaxBytes:
      options.limits?.textSourceMaxBytes ?? defaultTextSourceMaxBytes,
    pdfMaxBytes: options.limits?.pdfMaxBytes ?? defaultPdfMaxBytes,
  }
  assertLimits(limits)

  return {
    async list() {
      const sources: Array<{
        relativePath: string
        size: number
        previewKind: ProductWorkspaceSourcePreviewKind
      }> = []
      let scannedEntries = 0

      const walk = async (
        directory: string,
        segments: readonly string[],
        depth: number,
      ): Promise<void> => {
        let names: string[]
        try {
          names = await readdir(directory)
        } catch {
          throw new WorkspaceSourceProjectionError('source_unavailable')
        }
        names.sort(compareCodeUnits)
        for (const name of names) {
          if (isHiddenOrManagedName(name)) continue
          scannedEntries += 1
          if (scannedEntries > limits.listMaxEntries) {
            throw new WorkspaceSourceProjectionError('scan_limit_exceeded')
          }

          const childSegments = [...segments, name]
          const relativePath = childSegments.join('/')
          if (!isAllowedRelativePath(relativePath)) continue
          const candidate = path.join(directory, name)
          const stats = await safeLstat(candidate)
          if (!stats || stats.isSymbolicLink()) continue
          if (stats.isDirectory()) {
            if (depth >= limits.listMaxDepth) {
              throw new WorkspaceSourceProjectionError(
                'scan_limit_exceeded',
              )
            }
            if (!(await isCanonicalPathWithinRoot(candidate, workspaceRoot))) {
              continue
            }
            await walk(candidate, childSegments, depth + 1)
            continue
          }
          if (
            !stats.isFile() ||
            isExcludedFile(childSegments) ||
            !(await isCanonicalPathWithinRoot(candidate, workspaceRoot))
          ) {
            continue
          }
          sources.push({
            relativePath,
            size: stats.size,
            previewKind: previewKindFor(relativePath, stats.size, limits),
          })
        }
      }

      await walk(workspaceRoot, [], 0)
      sources.sort((left, right) =>
        compareCodeUnits(left.relativePath, right.relativePath),
      )
      try {
        return decodeProductWorkspaceSourceList({ sources })
      } catch {
        throw new WorkspaceSourceProjectionError('scan_limit_exceeded')
      }
    },

    async readText(relativePath) {
      const normalized = validateReadablePath(relativePath)
      if (!isTextPath(normalized)) {
        throw new WorkspaceSourceProjectionError('unsupported_type')
      }
      const bytes = await readBoundedRegularFile(
        workspaceRoot,
        normalized,
        limits.textSourceMaxBytes,
      )
      const truncated = bytes.byteLength > limits.textPreviewMaxBytes
      const text = decodeUtf8Preview(
        bytes,
        limits.textPreviewMaxBytes,
        truncated,
      )
      return decodeProductWorkspaceTextPreview({
        relativePath: normalized,
        digest: sha256(bytes),
        text,
        truncated,
      })
    },

    async readPdf(relativePath) {
      const normalized = validateReadablePath(relativePath)
      if (path.posix.extname(normalized).toLowerCase() !== '.pdf') {
        throw new WorkspaceSourceProjectionError('unsupported_type')
      }
      const bytes = await readBoundedRegularFile(
        workspaceRoot,
        normalized,
        limits.pdfMaxBytes,
      )
      if (
        bytes.byteLength < 5 ||
        bytes.subarray(0, 5).toString('ascii') !== '%PDF-'
      ) {
        throw new WorkspaceSourceProjectionError('invalid_pdf')
      }
      return {
        relativePath: normalized,
        digest: sha256(bytes),
        bytes,
      }
    },
  }
}

async function readBoundedRegularFile(
  workspaceRoot: string,
  relativePath: string,
  maximumBytes: number,
): Promise<Buffer> {
  const candidate = path.resolve(workspaceRoot, ...relativePath.split('/'))
  const stats = await safeLstat(candidate)
  if (!stats || stats.isSymbolicLink() || !stats.isFile()) {
    throw new WorkspaceSourceProjectionError('source_not_found')
  }
  if (!(await isCanonicalPathWithinRoot(candidate, workspaceRoot))) {
    throw new WorkspaceSourceProjectionError('source_not_found')
  }
  if (stats.size > maximumBytes) {
    throw new WorkspaceSourceProjectionError('source_too_large')
  }

  let handle
  try {
    handle = await open(
      candidate,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
  } catch {
    throw new WorkspaceSourceProjectionError('source_not_found')
  }
  try {
    const openedStats = await handle.stat()
    if (!openedStats.isFile()) {
      throw new WorkspaceSourceProjectionError('source_not_found')
    }
    if (openedStats.size > maximumBytes) {
      throw new WorkspaceSourceProjectionError('source_too_large')
    }
    const bytes = await handle.readFile()
    if (bytes.byteLength > maximumBytes) {
      throw new WorkspaceSourceProjectionError('source_too_large')
    }
    return bytes
  } catch (error) {
    if (error instanceof WorkspaceSourceProjectionError) throw error
    throw new WorkspaceSourceProjectionError('source_unavailable')
  } finally {
    await handle.close().catch(() => undefined)
  }
}

function validateReadablePath(relativePath: string): string {
  if (
    !isAllowedRelativePath(relativePath) ||
    isExcludedFile(relativePath.split('/'))
  ) {
    throw new WorkspaceSourceProjectionError('invalid_path')
  }
  return relativePath
}

function isAllowedRelativePath(relativePath: string): boolean {
  return (
    relativePath.length > 0 &&
    Buffer.byteLength(relativePath) <=
      PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES &&
    !relativePath.startsWith('/') &&
    !relativePath.includes('\\') &&
    !/[\p{Cc}]/u.test(relativePath) &&
    relativePath
      .split('/')
      .every(
        (segment) =>
          segment.length > 0 &&
          segment !== '.' &&
          segment !== '..' &&
          !isHiddenOrManagedName(segment),
      )
  )
}

function isExcludedFile(segments: readonly string[]): boolean {
  const basename = segments.at(-1)
  if (!basename) return true
  return scaffoldFileNames.has(basename) || isSecretLikeFile(basename)
}

function isHiddenOrManagedName(name: string): boolean {
  return name.startsWith('.') || managedDirectoryNames.has(name)
}

function isSecretLikeFile(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower === 'id_rsa' ||
    lower === 'id_ed25519' ||
    /\.(?:key|p12|pfx|pem)$/u.test(lower) ||
    /^(?:api[-_]?keys?|credentials?|passwords?|secrets?|tokens?)(?:\.[^.]+)?$/u.test(
      lower,
    )
  )
}

function previewKindFor(
  relativePath: string,
  size: number,
  limits: WorkspaceSourceProjectionLimits,
): ProductWorkspaceSourcePreviewKind {
  if (isTextPath(relativePath) && size <= limits.textSourceMaxBytes) {
    return 'text'
  }
  if (
    path.posix.extname(relativePath).toLowerCase() === '.pdf' &&
    size <= limits.pdfMaxBytes
  ) {
    return 'pdf'
  }
  return 'unsupported'
}

function isTextPath(relativePath: string): boolean {
  return textExtensions.has(path.posix.extname(relativePath).toLowerCase())
}

function decodeUtf8Preview(
  bytes: Buffer,
  maximumBytes: number,
  truncated: boolean,
): string {
  const prefix = bytes.subarray(0, Math.min(maximumBytes, bytes.byteLength))
  const minimumEnd = truncated ? Math.max(0, prefix.byteLength - 3) : prefix.byteLength
  for (let end = prefix.byteLength; end >= minimumEnd; end -= 1) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        prefix.subarray(0, end),
      )
    } catch {
      // A truncated multi-byte sequence can consume at most three tail bytes.
    }
  }
  throw new WorkspaceSourceProjectionError('unsupported_encoding')
}

async function canonicalDirectory(directory: string): Promise<string> {
  try {
    const canonical = await realpath(directory)
    const stats = await lstat(canonical)
    if (!stats.isDirectory()) {
      throw new WorkspaceSourceProjectionError('source_unavailable')
    }
    return canonical
  } catch (error) {
    if (error instanceof WorkspaceSourceProjectionError) throw error
    throw new WorkspaceSourceProjectionError('source_unavailable')
  }
}

async function safeLstat(candidate: string) {
  try {
    return await lstat(candidate)
  } catch (error) {
    if (isMissingPathError(error)) return undefined
    throw new WorkspaceSourceProjectionError('source_unavailable')
  }
}

async function isCanonicalPathWithinRoot(
  candidate: string,
  workspaceRoot: string,
): Promise<boolean> {
  try {
    const canonical = await realpath(candidate)
    return (
      canonical !== workspaceRoot &&
      canonical.startsWith(`${workspaceRoot}${path.sep}`)
    )
  } catch {
    return false
  }
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  )
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function assertLimits(limits: WorkspaceSourceProjectionLimits): void {
  for (const value of Object.values(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new WorkspaceSourceProjectionError('source_unavailable')
    }
  }
  if (limits.textPreviewMaxBytes > limits.textSourceMaxBytes) {
    throw new WorkspaceSourceProjectionError('source_unavailable')
  }
}
