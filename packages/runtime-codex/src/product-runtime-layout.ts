import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { constants, access, mkdir, realpath, stat } from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
} from 'node:path'
import { promisify } from 'node:util'

export type ProductRuntimeLayoutInput = {
  packageRoot: string
  appDataRoot: string
  workspaceRoot: string
}

export type ProductRuntimeLayout = {
  packageRoot: string
  appDataRoot: string
  workspaceRoot: string
  codexBinPath: string
  codexVersion: string
  codexHome: string
  codexSqliteHome: string
  cwd: string
}

export type ProductRuntimeRootName =
  | 'packageRoot'
  | 'appDataRoot'
  | 'workspaceRoot'

export type ProductRuntimeLayoutFailureCode =
  | 'invalid_root'
  | 'root_not_directory'
  | 'root_overlap'
  | 'binary_not_found'
  | 'binary_not_executable'
  | 'binary_not_package_owned'
  | 'binary_version_unreadable'
  | 'binary_pin_mismatch'
  | 'runtime_home_preparation_failed'

export class ProductRuntimeLayoutError extends Error {
  readonly recoverable = false

  constructor(
    readonly code: ProductRuntimeLayoutFailureCode,
    message: string,
    readonly root?: ProductRuntimeRootName,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ProductRuntimeLayoutError'
  }
}

const execFileAsync = promisify(execFile)

export async function prepareProductRuntimeLayout(
  input: ProductRuntimeLayoutInput,
): Promise<ProductRuntimeLayout> {
  validateRootInput('packageRoot', input.packageRoot)
  validateRootInput('appDataRoot', input.appDataRoot)
  validateRootInput('workspaceRoot', input.workspaceRoot)

  const packageRoot = await canonicalExistingDirectory(
    'packageRoot',
    input.packageRoot,
  )
  const workspaceRoot = await canonicalExistingDirectory(
    'workspaceRoot',
    input.workspaceRoot,
  )
  const appDataRoot = await canonicalDirectoryTarget(
    'appDataRoot',
    input.appDataRoot,
  )

  assertDistinctRoots({ packageRoot, appDataRoot, workspaceRoot })

  const codexBinPath = await resolveProductCodexBinary(packageRoot)

  const versionOutput = await readProductCodexVersion(
    codexBinPath,
    packageRoot,
  )
  const codexVersion = readPinnedCodexVersion()

  if (!versionOutput.split(/\s+/).includes(codexVersion)) {
    throw new ProductRuntimeLayoutError(
      'binary_pin_mismatch',
      `Codex binary version does not match package pin ${codexVersion}`,
    )
  }

  const { codexHome, codexSqliteHome } =
    await prepareProductRuntimeHomePair(appDataRoot)

  return {
    packageRoot,
    appDataRoot,
    workspaceRoot,
    codexBinPath,
    codexVersion,
    codexHome,
    codexSqliteHome,
    cwd: workspaceRoot,
  }
}

function validateRootInput(root: ProductRuntimeRootName, value: string): void {
  if (!isAbsolute(value) || normalize(value) !== value) {
    throw new ProductRuntimeLayoutError(
      'invalid_root',
      `${root} must be an absolute normalized path`,
      root,
    )
  }
}

async function canonicalExistingDirectory(
  root: ProductRuntimeRootName,
  value: string,
): Promise<string> {
  let canonicalPath: string

  try {
    canonicalPath = await realpath(value)
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'root_not_directory',
      `${root} must be an existing directory`,
      root,
      { cause },
    )
  }

  const pathStat = await stat(canonicalPath)

  if (!pathStat.isDirectory()) {
    throw new ProductRuntimeLayoutError(
      'root_not_directory',
      `${root} must be an existing directory`,
      root,
    )
  }

  return canonicalPath
}

async function canonicalDirectoryTarget(
  root: ProductRuntimeRootName,
  value: string,
): Promise<string> {
  let currentPath = value
  const missingSegments: string[] = []

  while (true) {
    try {
      const canonicalPath = await realpath(currentPath)
      const pathStat = await stat(canonicalPath)

      if (!pathStat.isDirectory()) {
        throw new ProductRuntimeLayoutError(
          'root_not_directory',
          `${root} must be a directory path`,
          root,
        )
      }

      return join(canonicalPath, ...missingSegments)
    } catch (cause) {
      if (cause instanceof ProductRuntimeLayoutError) {
        throw cause
      }

      if (!isNodeErrorWithCode(cause, 'ENOENT')) {
        throw new ProductRuntimeLayoutError(
          'root_not_directory',
          `${root} could not be resolved as a directory path`,
          root,
          { cause },
        )
      }

      const parentPath = dirname(currentPath)

      if (parentPath === currentPath) {
        throw new ProductRuntimeLayoutError(
          'root_not_directory',
          `${root} could not be resolved as a directory path`,
          root,
          { cause },
        )
      }

      missingSegments.unshift(basename(currentPath))
      currentPath = parentPath
    }
  }
}

function assertDistinctRoots(
  roots: Record<ProductRuntimeRootName, string>,
): void {
  const entries = Object.entries(roots) as Array<
    [ProductRuntimeRootName, string]
  >

  for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < entries.length;
      secondIndex += 1
    ) {
      const [firstName, firstPath] = entries[firstIndex]
      const [secondName, secondPath] = entries[secondIndex]

      if (pathsOverlap(firstPath, secondPath)) {
        throw new ProductRuntimeLayoutError(
          'root_overlap',
          `${firstName} and ${secondName} must not overlap`,
        )
      }
    }
  }
}

function pathsOverlap(firstPath: string, secondPath: string): boolean {
  return (
    isSameOrDescendant(firstPath, secondPath) ||
    isSameOrDescendant(secondPath, firstPath)
  )
}

function isSameOrDescendant(ancestor: string, candidate: string): boolean {
  const relativePath = relative(ancestor, candidate)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  )
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}

async function resolveProductCodexBinary(
  packageRoot: string,
): Promise<string> {
  const binName = process.platform === 'win32' ? 'codex.cmd' : 'codex'
  const candidatePath = join(packageRoot, 'node_modules', '.bin', binName)
  let canonicalPath: string

  try {
    canonicalPath = await realpath(candidatePath)
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'binary_not_found',
      'The package-owned Codex binary is missing',
      undefined,
      { cause },
    )
  }

  if (!isSameOrDescendant(packageRoot, canonicalPath)) {
    throw new ProductRuntimeLayoutError(
      'binary_not_package_owned',
      'The Codex binary must resolve inside packageRoot',
    )
  }

  const binaryStat = await stat(canonicalPath)

  if (!binaryStat.isFile()) {
    throw new ProductRuntimeLayoutError(
      'binary_not_executable',
      'The package-owned Codex binary must be an executable file',
    )
  }

  try {
    await access(canonicalPath, constants.X_OK)
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'binary_not_executable',
      'The package-owned Codex binary must be executable',
      undefined,
      { cause },
    )
  }

  return canonicalPath
}

async function prepareProductRuntimeHomePair(
  appDataRoot: string,
): Promise<{ codexHome: string; codexSqliteHome: string }> {
  const requestedCodexHome = join(appDataRoot, 'codex', 'home')
  const requestedCodexSqliteHome = join(appDataRoot, 'codex', 'sqlite')

  try {
    const [codexHomeTarget, codexSqliteHomeTarget] = await Promise.all([
      canonicalDirectoryTarget('appDataRoot', requestedCodexHome),
      canonicalDirectoryTarget('appDataRoot', requestedCodexSqliteHome),
    ])

    if (
      !isStrictDescendant(appDataRoot, codexHomeTarget) ||
      !isStrictDescendant(appDataRoot, codexSqliteHomeTarget) ||
      pathsOverlap(codexHomeTarget, codexSqliteHomeTarget)
    ) {
      throw new Error('Runtime-home pair must stay distinct inside appDataRoot')
    }

    await Promise.all([
      mkdir(requestedCodexHome, { recursive: true }),
      mkdir(requestedCodexSqliteHome, { recursive: true }),
    ])

    const [codexHome, codexSqliteHome] = await Promise.all([
      realpath(requestedCodexHome),
      realpath(requestedCodexSqliteHome),
    ])

    if (
      !isStrictDescendant(appDataRoot, codexHome) ||
      !isStrictDescendant(appDataRoot, codexSqliteHome) ||
      pathsOverlap(codexHome, codexSqliteHome)
    ) {
      throw new Error('Prepared runtime-home pair escaped appDataRoot')
    }

    return { codexHome, codexSqliteHome }
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'runtime_home_preparation_failed',
      'Unable to prepare the app-managed Codex runtime-home pair',
      'appDataRoot',
      { cause },
    )
  }
}

function isStrictDescendant(ancestor: string, candidate: string): boolean {
  return ancestor !== candidate && isSameOrDescendant(ancestor, candidate)
}

async function readProductCodexVersion(
  codexBinPath: string,
  packageRoot: string,
): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(
      codexBinPath,
      ['--version'],
      {
        cwd: packageRoot,
        shell: process.platform === 'win32',
        timeout: 5000,
      },
    )
    const versionOutput = `${stdout}${stderr}`.trim()

    if (versionOutput.length === 0) {
      throw new Error('Codex binary returned empty version output')
    }

    return versionOutput
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'binary_version_unreadable',
      'Unable to read the package-owned Codex binary version',
      undefined,
      { cause },
    )
  }
}

function readPinnedCodexVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    dependencies?: Record<string, unknown>
  }
  const version = packageJson.dependencies?.['@openai/codex']

  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('Unable to read pinned @openai/codex version')
  }

  return version
}
