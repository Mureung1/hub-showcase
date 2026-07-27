import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import concurrently from 'concurrently'

import {
  resolvePreparedWorkspaceLaunch,
  type PreparedWorkspaceLaunchFailure,
} from '../apps/server/src/prepared-workspace-launch.js'
import { resolveCanonicalProductRoots } from '../apps/server/src/product-roots.js'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))

export function resolveProductDevelopmentArguments(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}): {
  readonly appDataRoot: string
  readonly workspaceRoot: string | undefined
} {
  let argumentRoot: string | undefined
  let workspaceRoot: string | undefined
  for (let index = 0; index < options.arguments.length; index += 1) {
    const argument = options.arguments[index]
    const value = options.arguments[index + 1]
    if (argument === '--app-data-root' && argumentRoot === undefined && value) {
      argumentRoot = value
      index += 1
      continue
    }
    if (argument === '--workspace' && workspaceRoot === undefined && value) {
      workspaceRoot = value
      index += 1
      continue
    }
    throw new Error(
      'Usage: tsx scripts/product-development-bootstrap.mts --app-data-root /absolute/path/to/app-data [--workspace /absolute/path/to/workspace]',
    )
  }
  const selected = argumentRoot ?? options.environment.AY_PLE_APP_DATA_ROOT
  if (!selected || !path.isAbsolute(selected)) {
    throw new Error(
      'Product development requires an explicit absolute --app-data-root.',
    )
  }
  if (workspaceRoot !== undefined && !path.isAbsolute(workspaceRoot)) {
    throw new Error('Product workspace must be an explicit absolute directory.')
  }
  return { appDataRoot: selected, workspaceRoot }
}

export function resolveExplicitAppDataRoot(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}): string {
  return resolveProductDevelopmentArguments(options).appDataRoot
}

export async function startProductDevelopment(options: {
  readonly appDataRoot: string
  readonly environment: NodeJS.ProcessEnv
  readonly workspaceRoot: string | undefined
}): Promise<void> {
  const launch = await resolvePreparedWorkspaceLaunch({
    appDataRoot: options.appDataRoot,
    ...(options.workspaceRoot === undefined
      ? {}
      : { explicitWorkspaceRoot: options.workspaceRoot }),
  })
  if (launch.status === 'failure') {
    throw new ProductDevelopmentLaunchError(launch)
  }
  const roots = await resolveCanonicalProductRoots({
    appDataRoot: options.appDataRoot,
    environment: options.environment,
    packageRoot: repositoryRoot,
    workspaceRoot: launch.canonicalRoot,
  })
  const appDataRoot = roots.appDataRoot
  const workspaceRoot = roots.workspaceRoot
  if (workspaceRoot === undefined) {
    throw new Error('Prepared SemesterWorkspace selection was lost.')
  }
  console.log(`SemesterWorkspace: ${workspaceRoot} (${launch.source})`)
  console.log(`Product app data: ${appDataRoot}`)

  const productEnvironment = {
    PORT: '3000',
    AY_PLE_PRODUCT_MODE: '1',
    AY_PLE_PACKAGE_ROOT: repositoryRoot,
    AY_PLE_APP_DATA_ROOT: appDataRoot,
    AY_PLE_WORKSPACE_ROOT: workspaceRoot,
    AY_PLE_WORKSPACE_SELECTION:
      options.workspaceRoot === undefined ? 'registry' : 'explicit',
  }
  const { result } = concurrently(
    [
      {
        command: 'npm run dev -w @ay-ple/server',
        env: productEnvironment,
        name: 'server',
      },
      {
        command: 'npm run dev -w @ay-ple/chat-shell',
        name: 'chat-shell',
      },
    ],
    {
      cwd: repositoryRoot,
      killOthersOn: ['failure', 'success'],
      prefix: 'name',
      prefixColors: ['blue', 'magenta'],
    },
  )
  await result
}

export class ProductDevelopmentLaunchError extends Error {
  readonly code: PreparedWorkspaceLaunchFailure['code']

  constructor(failure: PreparedWorkspaceLaunchFailure) {
    super(launchFailureMessage(failure))
    this.name = 'ProductDevelopmentLaunchError'
    this.code = failure.code
  }
}

function launchFailureMessage(
  failure: PreparedWorkspaceLaunchFailure,
): string {
  switch (failure.code) {
    case 'prepared_workspace_required':
      return 'A prepared SemesterWorkspace is required. Run the native Bootstrap Skill, then launch with --workspace /absolute/prepared-root.'
    case 'prepared_workspace_invalid':
      return `The explicit prepared SemesterWorkspace is invalid (${failure.reason}).`
    case 'registered_workspace_unavailable':
      return `The registered SemesterWorkspace is unavailable (${failure.reason}).`
    case 'registry_incompatible':
      return `WorkspaceRegistry is incompatible (${failure.reason}); its bytes were preserved.`
  }
}

export async function runProductDevelopment(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}): Promise<void> {
  await startProductDevelopment({
    ...resolveProductDevelopmentArguments(options),
    environment: options.environment,
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runProductDevelopment({
    arguments: process.argv.slice(2),
    environment: process.env,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
