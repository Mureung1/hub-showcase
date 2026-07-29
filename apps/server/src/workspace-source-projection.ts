import { createHash } from 'node:crypto'
import { lstat, opendir } from 'node:fs/promises'
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
  type ProductWorkspaceFileRef,
} from '@ay-ple/product-contract'

import {
  WorkspaceFileAccessError,
  type WorkspaceFileAccess,
} from './workspace-file-access.js'

const defaultListMaxDepth = 32
const defaultTextSourceMaxBytes = 16 * 1024 * 1024
const defaultPdfMaxBytes = 32 * 1024 * 1024
const managedDirectoryNames = new Set(['node_modules'])
const scaffoldFileNames = new Set(['AGENTS.md', 'workspace-state.json'])
const secretNameVariantPattern =
  /^(?:api[-_]?keys?|credentials?|passwords?|secrets?|tokens?|client[-_]?secrets?|service[-_]?accounts?(?:[-_]?(?:credentials?|keys?|secrets?))?|private[-_]?keys?|oauth(?:2)?[-_]?(?:tokens?|credentials?|client[-_]?secrets?)|(?:access|refresh|auth|bearer)[-_]?tokens?)(?:[-_](?:backup|dev|development|local|old|prod|production|staging|test))?$/u
const secretDotSuffixes = new Set([
  'bak',
  'backup',
  'conf',
  'config',
  'dev',
  'development',
  'enc',
  'env',
  'ini',
  'json',
  'local',
  'old',
  'prod',
  'production',
  'qa',
  'stage',
  'staging',
  'test',
  'toml',
  'txt',
  'uat',
  'xml',
  'yaml',
  'yml',
])
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
  preflightFiles(
    files: readonly ProductWorkspaceFileRef[],
  ): Promise<readonly ProductWorkspaceFileRef[]>
  readText(relativePath: string): Promise<ProductWorkspaceTextPreview>
  readPdf(relativePath: string): Promise<WorkspaceSourcePdf>
}

// Action definitions can recover only the file access captured by this factory;
// they cannot pair a source projection with another raw workspace root.
const projectionFileAccesses = new WeakMap<
  WorkspaceSourceProjection,
  WorkspaceFileAccess
>()

export async function createWorkspaceSourceProjection(options: {
  readonly fileAccess: WorkspaceFileAccess
  readonly limits?: Partial<WorkspaceSourceProjectionLimits>
  /** Test-only fault injection at the filesystem boundary. */
  readonly sourcePreflightTestHook?: (
    phase: 'before_open',
    relativePath: string,
  ) => void | Promise<void>
}): Promise<WorkspaceSourceProjection> {
  const workspaceRoot = options.fileAccess.workspaceRoot
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

  const projection: WorkspaceSourceProjection = {
    async list() {
      await assertWorkspaceFileAccessCurrent(options.fileAccess)
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
        let directoryHandle
        try {
          directoryHandle = await opendir(directory)
        } catch {
          throw new WorkspaceSourceProjectionError('source_unavailable')
        }
        const names: string[] = []
        try {
          for await (const entry of directoryHandle) {
            scannedEntries += 1
            if (scannedEntries > limits.listMaxEntries) {
              throw new WorkspaceSourceProjectionError(
                'scan_limit_exceeded',
              )
            }
            names.push(entry.name)
          }
        } catch (error) {
          if (error instanceof WorkspaceSourceProjectionError) throw error
          throw new WorkspaceSourceProjectionError('source_unavailable')
        }
        names.sort(compareCodeUnits)
        for (const name of names) {
          const childSegments = [...segments, name]
          if (isHiddenOrManagedName(name)) continue
          const relativePath = childSegments.join('/')
          if (!isAllowedRelativePath(relativePath)) continue
          const candidate = path.join(directory, name)
          const stats = await safeLstat(candidate)
          if (!stats || stats.isSymbolicLink()) continue
          if (stats.isDirectory()) {
            if (isExcludedDirectoryPath(childSegments)) continue
            if (depth >= limits.listMaxDepth) {
              throw new WorkspaceSourceProjectionError(
                'scan_limit_exceeded',
              )
            }
            if (
              !(await options.fileAccess.isCanonicalContainedPath(
                candidate,
              ))
            ) {
              continue
            }
            await walk(candidate, childSegments, depth + 1)
            continue
          }
          if (
            !stats.isFile() ||
            isExcludedFilePath(childSegments) ||
            !(await options.fileAccess.isCanonicalContainedPath(candidate))
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
      await assertWorkspaceFileAccessCurrent(options.fileAccess)
      sources.sort((left, right) =>
        compareCodeUnits(left.relativePath, right.relativePath),
      )
      try {
        return decodeProductWorkspaceSourceList({ sources })
      } catch {
        throw new WorkspaceSourceProjectionError('scan_limit_exceeded')
      }
    },

    async preflightFiles(files) {
      const resolved: ProductWorkspaceFileRef[] = []
      for (const file of files) {
        await preflightFile(
          options.fileAccess,
          file.relativePath,
          options.sourcePreflightTestHook,
        )
        resolved.push({ relativePath: file.relativePath })
      }
      await assertWorkspaceFileAccessCurrent(options.fileAccess)
      return resolved
    },

    async readText(relativePath) {
      const normalized = validateReadablePath(relativePath)
      if (!isTextPath(normalized)) {
        throw new WorkspaceSourceProjectionError('unsupported_type')
      }
      const bytes = await readBoundedRegularFile(
        options.fileAccess,
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
        options.fileAccess,
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
  projectionFileAccesses.set(projection, options.fileAccess)
  return projection
}

export function workspaceFileAccessForSourceProjection(
  projection: WorkspaceSourceProjection,
): WorkspaceFileAccess {
  const fileAccess = projectionFileAccesses.get(projection)
  if (!fileAccess) {
    throw new WorkspaceSourceProjectionError('source_unavailable')
  }
  return fileAccess
}

async function preflightFile(
  fileAccess: WorkspaceFileAccess,
  relativePath: string,
  testHook:
    | ((
        phase: 'before_open',
        relativePath: string,
      ) => void | Promise<void>)
    | undefined,
): Promise<void> {
  const normalized = validateReadablePath(relativePath)
  try {
    await fileAccess.useRegularFile({
      segments: normalized.split('/'),
      beforeOpen: () => testHook?.('before_open', normalized),
      use: async () => undefined,
    })
  } catch (error) {
    throw mapFileAccessError(error)
  }
}

async function readBoundedRegularFile(
  fileAccess: WorkspaceFileAccess,
  relativePath: string,
  maximumBytes: number,
): Promise<Buffer> {
  try {
    return await fileAccess.useRegularFile({
      segments: relativePath.split('/'),
      maximumBytes,
      use: async (handle) => {
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
        if (bytesReadTotal > maximumBytes) {
          throw new WorkspaceSourceProjectionError('source_too_large')
        }
        return Buffer.concat(chunks, bytesReadTotal)
      },
    })
  } catch (error) {
    if (error instanceof WorkspaceSourceProjectionError) throw error
    throw mapFileAccessError(error)
  }
}

function validateReadablePath(relativePath: string): string {
  if (
    !isAllowedRelativePath(relativePath) ||
    isExcludedFilePath(relativePath.split('/'))
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

function isExcludedFilePath(segments: readonly string[]): boolean {
  const basename = segments.at(-1)
  if (!basename) return true
  return (
    scaffoldFileNames.has(basename) ||
    segments
      .slice(0, -1)
      .some((segment) => isSecretContainerName(segment)) ||
    isSecretLikeFile(basename)
  )
}

function isExcludedDirectoryPath(segments: readonly string[]): boolean {
  return segments.some((segment) => isSecretContainerName(segment))
}

function isHiddenOrManagedName(name: string): boolean {
  return name.startsWith('.') || managedDirectoryNames.has(name)
}

function isSecretLikeFile(name: string): boolean {
  const lower = name.toLowerCase()
  const stem = lower.replace(/\.[^.]+$/u, '')
  return (
    /^id_(?:rsa|dsa|ecdsa|ed25519)$/u.test(stem) ||
    /\.(?:key|p12|pfx|pem)$/u.test(lower) ||
    secretNameVariantPattern.test(stem) ||
    isSecretDotVariant(lower) ||
    /^oauth(?:2)?(?:[-_](?:backup|dev|development|local|old|prod|production|staging|test))?\.(?:conf|ini|json|toml|ya?ml)$/u.test(
      lower,
    ) ||
    /^client[-_]?secrets?[-_][a-z0-9]+\.apps\.googleusercontent\.com$/u.test(
      stem,
    )
  )
}

function isSecretContainerName(name: string): boolean {
  const lower = name.toLowerCase()
  return secretNameVariantPattern.test(lower) || isSecretDotVariant(lower)
}

function isSecretDotVariant(name: string): boolean {
  const [base, ...suffixes] = name.split('.')
  if (
    !base ||
    suffixes.length === 0 ||
    !secretNameVariantPattern.test(base)
  ) {
    return false
  }
  return (
    suffixes.length === 1 ||
    suffixes.every((suffix) => secretDotSuffixes.has(suffix))
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

async function safeLstat(candidate: string) {
  try {
    return await lstat(candidate)
  } catch (error) {
    if (isMissingPathError(error)) return undefined
    throw new WorkspaceSourceProjectionError('source_unavailable')
  }
}

async function assertWorkspaceFileAccessCurrent(
  fileAccess: WorkspaceFileAccess,
): Promise<void> {
  try {
    await fileAccess.assertPinnedWorkspaceCurrent()
  } catch (error) {
    throw mapFileAccessError(error)
  }
}

function mapFileAccessError(
  error: unknown,
): WorkspaceSourceProjectionError {
  if (!(error instanceof WorkspaceFileAccessError)) {
    return new WorkspaceSourceProjectionError('source_unavailable')
  }
  switch (error.code) {
    case 'workspace_unavailable':
      return new WorkspaceSourceProjectionError('source_unavailable')
    case 'path_not_found':
      return new WorkspaceSourceProjectionError('source_not_found')
    case 'path_too_large':
      return new WorkspaceSourceProjectionError('source_too_large')
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
