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
  sep,
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
  | 'package_pin_unreadable'
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

  const codexVersion = await readProductCodexVersion(
    codexBinPath,
    packageRoot,
  )
  const pinnedCodexVersion = readPinnedCodexVersion()

  if (codexVersion !== pinnedCodexVersion) {
    throw new ProductRuntimeLayoutError(
      'binary_pin_mismatch',
      `Codex binary version ${codexVersion} does not match package pin ${pinnedCodexVersion}`,
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
  if (
    typeof value !== 'string' ||
    !isAbsolute(value) ||
    normalize(value) !== value
  ) {
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
    const pathStat = await stat(canonicalPath)

    if (!pathStat.isDirectory()) {
      throw new ProductRuntimeLayoutError(
        'root_not_directory',
        `${root} must be an existing directory`,
        root,
      )
    }
  } catch (cause) {
    if (cause instanceof ProductRuntimeLayoutError) {
      throw cause
    }

    throw new ProductRuntimeLayoutError(
      'root_not_directory',
      `${root} must be an existing directory`,
      root,
      { cause },
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
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
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
  const candidatePath = join(packageRoot, 'node_modules', '.bin', 'codex')
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

  try {
    const binaryStat = await stat(canonicalPath)

    if (binaryStat.isFile()) {
      return await assertExecutableBinary(canonicalPath)
    }

    throw new ProductRuntimeLayoutError(
      'binary_not_executable',
      'The package-owned Codex binary must be an executable file',
    )
  } catch (cause) {
    if (cause instanceof ProductRuntimeLayoutError) {
      throw cause
    }

    throw new ProductRuntimeLayoutError(
      'binary_not_executable',
      'The package-owned Codex binary could not be inspected',
      undefined,
      { cause },
    )
  }
}

async function assertExecutableBinary(canonicalPath: string): Promise<string> {
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

    assertRuntimeHomePairInsideAppData(
      appDataRoot,
      codexHomeTarget,
      codexSqliteHomeTarget,
      'Runtime-home pair must stay distinct inside appDataRoot',
    )

    await Promise.all([
      mkdir(requestedCodexHome, { recursive: true }),
      mkdir(requestedCodexSqliteHome, { recursive: true }),
    ])

    const [codexHome, codexSqliteHome] = await Promise.all([
      realpath(requestedCodexHome),
      realpath(requestedCodexSqliteHome),
    ])

    assertRuntimeHomePairInsideAppData(
      appDataRoot,
      codexHome,
      codexSqliteHome,
      'Prepared runtime-home pair escaped appDataRoot',
    )

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

function assertRuntimeHomePairInsideAppData(
  appDataRoot: string,
  codexHome: string,
  codexSqliteHome: string,
  message: string,
): void {
  if (
    !isStrictDescendant(appDataRoot, codexHome) ||
    !isStrictDescendant(appDataRoot, codexSqliteHome) ||
    pathsOverlap(codexHome, codexSqliteHome)
  ) {
    throw new Error(message)
  }
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
        timeout: 5000,
      },
    )
    const versionOutput = `${stdout}${stderr}`.trim()

    if (versionOutput.length === 0) {
      throw new Error('Codex binary returned empty version output')
    }

    const version = versionOutput.match(
      /^codex-cli\s+(\d+\.\d+\.\d+)\s*$/m,
    )?.[1]

    if (!version) {
      throw new Error('Codex binary returned unrecognized version output')
    }

    return version
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'binary_version_unreadable',
      'Unable to read the package-owned Codex binary version',
      undefined,
      { cause },
    )
  }
}

export function readPinnedCodexVersion(
  packageJsonUrl: URL = new URL('../package.json', import.meta.url),
): string {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as {
      dependencies?: Record<string, unknown>
    }
    const version = packageJson.dependencies?.['@openai/codex']

    if (typeof version !== 'string' || version.length === 0) {
      throw new Error('Pinned @openai/codex version is missing')
    }

    return version
  } catch (cause) {
    throw new ProductRuntimeLayoutError(
      'package_pin_unreadable',
      'Unable to read the pinned @openai/codex package version',
      undefined,
      { cause },
    )
  }
}
