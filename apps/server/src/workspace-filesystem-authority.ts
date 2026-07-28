import { constants } from 'node:fs'
import {
  type FileHandle,
  lstat,
  open,
  realpath,
} from 'node:fs/promises'
import path from 'node:path'

type FilesystemIdentity = {
  readonly device: number
  readonly inode: number
}

type DirectorySnapshot = FilesystemIdentity & {
  readonly absolutePath: string
}

type RegularFileSnapshot = FilesystemIdentity & {
  readonly absolutePath: string
  readonly size: number
}

export class WorkspaceFilesystemAuthorityError extends Error {
  constructor(
    readonly code:
      | 'workspace_unavailable'
      | 'path_not_found'
      | 'path_too_large',
  ) {
    super(code)
    this.name = 'WorkspaceFilesystemAuthorityError'
  }
}

export class WorkspaceFilesystemAuthority {
  private constructor(
    readonly workspaceRoot: string,
    private readonly workspaceRootIdentity: FilesystemIdentity,
  ) {}

  static async create(
    workspaceRoot: string,
  ): Promise<WorkspaceFilesystemAuthority> {
    try {
      if (
        !path.isAbsolute(workspaceRoot) ||
        path.normalize(workspaceRoot) !== workspaceRoot
      ) {
        throw new WorkspaceFilesystemAuthorityError(
          'workspace_unavailable',
        )
      }
      const [canonical, stats] = await Promise.all([
        realpath(workspaceRoot),
        lstat(workspaceRoot),
      ])
      if (
        canonical !== workspaceRoot ||
        stats.isSymbolicLink() ||
        !stats.isDirectory()
      ) {
        throw new WorkspaceFilesystemAuthorityError(
          'workspace_unavailable',
        )
      }
      return new WorkspaceFilesystemAuthority(workspaceRoot, {
        device: stats.dev,
        inode: stats.ino,
      })
    } catch (error) {
      if (error instanceof WorkspaceFilesystemAuthorityError) throw error
      throw new WorkspaceFilesystemAuthorityError(
        'workspace_unavailable',
      )
    }
  }

  pathFor(segments: readonly string[]): string {
    if (
      segments.length === 0 ||
      segments.some(
        (segment) =>
          segment.length === 0 ||
          segment === '.' ||
          segment === '..' ||
          path.isAbsolute(segment) ||
          segment.includes('/') ||
          segment.includes('\\'),
      )
    ) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    const candidate = path.join(this.workspaceRoot, ...segments)
    if (
      path.normalize(candidate) !== candidate ||
      !isPathWithinRoot(candidate, this.workspaceRoot)
    ) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    return candidate
  }

  async assertCurrentWorkspace(): Promise<void> {
    try {
      const [canonical, stats] = await Promise.all([
        realpath(this.workspaceRoot),
        lstat(this.workspaceRoot),
      ])
      if (
        canonical !== this.workspaceRoot ||
        stats.isSymbolicLink() ||
        !stats.isDirectory() ||
        stats.dev !== this.workspaceRootIdentity.device ||
        stats.ino !== this.workspaceRootIdentity.inode
      ) {
        throw new WorkspaceFilesystemAuthorityError(
          'workspace_unavailable',
        )
      }
    } catch (error) {
      if (error instanceof WorkspaceFilesystemAuthorityError) throw error
      throw new WorkspaceFilesystemAuthorityError(
        'workspace_unavailable',
      )
    }
  }

  async isCanonicalContainedPath(candidate: string): Promise<boolean> {
    if (
      !path.isAbsolute(candidate) ||
      path.normalize(candidate) !== candidate ||
      !isPathWithinRoot(candidate, this.workspaceRoot)
    ) {
      return false
    }
    try {
      const canonical = await realpath(candidate)
      return (
        canonical === candidate &&
        isPathWithinRoot(canonical, this.workspaceRoot)
      )
    } catch {
      return false
    }
  }

  async assertRegularFile(
    segments: readonly string[],
  ): Promise<void> {
    await this.useRegularFile({
      segments,
      use: async () => undefined,
    })
  }

  async useRegularFile<Result>(options: {
    readonly segments: readonly string[]
    readonly maximumBytes?: number
    readonly beforeOpen?: () => void | Promise<void>
    readonly use: (handle: FileHandle) => Promise<Result>
  }): Promise<Result> {
    if (
      options.maximumBytes !== undefined &&
      (!Number.isSafeInteger(options.maximumBytes) ||
        options.maximumBytes <= 0)
    ) {
      throw new WorkspaceFilesystemAuthorityError(
        'workspace_unavailable',
      )
    }

    const candidate = this.pathFor(options.segments)
    await this.assertCurrentWorkspace()
    const directories = await this.captureDirectoryChain(
      options.segments.slice(0, -1),
    )
    const file = await readRegularFileSnapshot(candidate)
    await assertCanonicalPath(candidate, this.workspaceRoot)
    assertMaximumBytes(file.size, options.maximumBytes)

    await options.beforeOpen?.()
    let handle: FileHandle
    try {
      handle = await open(
        candidate,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      )
    } catch {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }

    let result: Result
    try {
      await assertOpenedFile(handle, file, options.maximumBytes)
      await this.assertPathSnapshotCurrent(directories, file)
      result = await options.use(handle)
      await this.assertPathSnapshotCurrent(directories, file)
    } catch (error) {
      await handle.close().catch(() => undefined)
      throw error
    }
    try {
      await handle.close()
    } catch {
      throw new WorkspaceFilesystemAuthorityError(
        'workspace_unavailable',
      )
    }
    return result
  }

  private async captureDirectoryChain(
    segments: readonly string[],
  ): Promise<readonly DirectorySnapshot[]> {
    const snapshots: DirectorySnapshot[] = []
    let current = this.workspaceRoot
    for (const segment of segments) {
      current = path.join(current, segment)
      const snapshot = await readDirectorySnapshot(current)
      await assertCanonicalPath(current, this.workspaceRoot)
      snapshots.push(snapshot)
    }
    return snapshots
  }

  private async assertPathSnapshotCurrent(
    directories: readonly DirectorySnapshot[],
    file: RegularFileSnapshot,
  ): Promise<void> {
    await this.assertCurrentWorkspace()
    for (const expected of directories) {
      const current = await readDirectorySnapshot(expected.absolutePath)
      if (!hasSameIdentity(current, expected)) {
        throw new WorkspaceFilesystemAuthorityError('path_not_found')
      }
      await assertCanonicalPath(
        expected.absolutePath,
        this.workspaceRoot,
      )
    }
    const currentFile = await readRegularFileSnapshot(file.absolutePath)
    if (
      !hasSameIdentity(currentFile, file) ||
      currentFile.size !== file.size
    ) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    await assertCanonicalPath(file.absolutePath, this.workspaceRoot)
    await this.assertCurrentWorkspace()
  }
}

export async function createWorkspaceFilesystemAuthority(
  workspaceRoot: string,
): Promise<WorkspaceFilesystemAuthority> {
  return WorkspaceFilesystemAuthority.create(workspaceRoot)
}

async function readDirectorySnapshot(
  absolutePath: string,
): Promise<DirectorySnapshot> {
  try {
    const stats = await lstat(absolutePath)
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    return {
      absolutePath,
      device: stats.dev,
      inode: stats.ino,
    }
  } catch (error) {
    if (error instanceof WorkspaceFilesystemAuthorityError) throw error
    if (isMissingPathError(error)) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    throw new WorkspaceFilesystemAuthorityError(
      'workspace_unavailable',
    )
  }
}

async function readRegularFileSnapshot(
  absolutePath: string,
): Promise<RegularFileSnapshot> {
  try {
    const stats = await lstat(absolutePath)
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    return {
      absolutePath,
      device: stats.dev,
      inode: stats.ino,
      size: stats.size,
    }
  } catch (error) {
    if (error instanceof WorkspaceFilesystemAuthorityError) throw error
    if (isMissingPathError(error)) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    throw new WorkspaceFilesystemAuthorityError(
      'workspace_unavailable',
    )
  }
}

async function assertCanonicalPath(
  candidate: string,
  workspaceRoot: string,
): Promise<void> {
  try {
    const canonical = await realpath(candidate)
    if (
      canonical !== candidate ||
      !isPathWithinRoot(canonical, workspaceRoot)
    ) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
  } catch (error) {
    if (error instanceof WorkspaceFilesystemAuthorityError) throw error
    if (isMissingPathError(error)) {
      throw new WorkspaceFilesystemAuthorityError('path_not_found')
    }
    throw new WorkspaceFilesystemAuthorityError(
      'workspace_unavailable',
    )
  }
}

async function assertOpenedFile(
  handle: FileHandle,
  expected: RegularFileSnapshot,
  maximumBytes: number | undefined,
): Promise<void> {
  let stats
  try {
    stats = await handle.stat()
  } catch {
    throw new WorkspaceFilesystemAuthorityError(
      'workspace_unavailable',
    )
  }
  if (
    !stats.isFile() ||
    stats.dev !== expected.device ||
    stats.ino !== expected.inode
  ) {
    throw new WorkspaceFilesystemAuthorityError('path_not_found')
  }
  assertMaximumBytes(stats.size, maximumBytes)
  if (stats.size !== expected.size) {
    throw new WorkspaceFilesystemAuthorityError('path_not_found')
  }
}

function assertMaximumBytes(
  size: number,
  maximumBytes: number | undefined,
): void {
  if (maximumBytes !== undefined && size > maximumBytes) {
    throw new WorkspaceFilesystemAuthorityError('path_too_large')
  }
}

function hasSameIdentity(
  current: FilesystemIdentity,
  expected: FilesystemIdentity,
): boolean {
  return (
    current.device === expected.device &&
    current.inode === expected.inode
  )
}

function isPathWithinRoot(
  candidate: string,
  workspaceRoot: string,
): boolean {
  const relative = path.relative(workspaceRoot, candidate)
  return (
    relative.length > 0 &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  )
}
