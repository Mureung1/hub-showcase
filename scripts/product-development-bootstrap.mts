import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import concurrently from 'concurrently'

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
  const roots = await resolveCanonicalProductRoots({
    appDataRoot: options.appDataRoot,
    environment: options.environment,
    packageRoot: repositoryRoot,
    ...(options.workspaceRoot === undefined
      ? {}
      : { workspaceRoot: options.workspaceRoot }),
  })
  const appDataRoot = roots.appDataRoot
  const workspaceRoot = roots.workspaceRoot
  if (workspaceRoot !== undefined) {
    console.log(`SemesterWorkspace: ${workspaceRoot} (caller-owned)`)
  } else {
    console.log('SemesterWorkspace: not selected')
  }
  console.log(`Product app data: ${appDataRoot}`)

  const productEnvironment = {
    PORT: '3000',
    AY_PLE_PRODUCT_MODE: '1',
    AY_PLE_PACKAGE_ROOT: repositoryRoot,
    AY_PLE_APP_DATA_ROOT: appDataRoot,
    ...(workspaceRoot === undefined
      ? {}
      : { AY_PLE_WORKSPACE_ROOT: workspaceRoot }),
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
