import { lstat, mkdir, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import concurrently from 'concurrently'

import {
  assertProductRootsDoNotOverlap,
  materializeDevelopmentSemesterWorkspace,
} from './semester-workspace-materializer.mjs'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))

export function resolveExplicitAppDataRoot(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}): string {
  let argumentRoot: string | undefined
  for (let index = 0; index < options.arguments.length; index += 1) {
    const argument = options.arguments[index]
    if (argument !== '--app-data-root' || argumentRoot !== undefined) {
      throw new Error(
        'Usage: tsx scripts/product-development-bootstrap.mts --app-data-root /absolute/path/to/app-data',
      )
    }
    argumentRoot = options.arguments[index + 1]
    index += 1
  }
  const selected = argumentRoot ?? options.environment.AY_PLE_APP_DATA_ROOT
  if (!selected || !path.isAbsolute(selected)) {
    throw new Error(
      'Product development requires an explicit absolute --app-data-root.',
    )
  }
  return selected
}

async function canonicalAppDataRoot(selected: string): Promise<string> {
  assertProductRootsDoNotOverlap(repositoryRoot, path.resolve(selected))
  await mkdir(selected, { recursive: true })
  const stats = await lstat(selected)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('Product appDataRoot must be a non-symlink directory.')
  }
  return realpath(selected)
}

export async function runProductDevelopment(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}): Promise<void> {
  const appDataRoot = await canonicalAppDataRoot(
    resolveExplicitAppDataRoot({
      arguments: options.arguments,
      environment: options.environment,
    }),
  )
  const selected = await materializeDevelopmentSemesterWorkspace({
    appDataRoot,
    environment: options.environment,
    packageRoot: repositoryRoot,
  })
  const ownership =
    selected.ownership === 'caller' ? 'caller-owned' : 'managed'
  console.log(`SemesterWorkspace: ${selected.workspaceRoot} (${ownership})`)
  console.log(`Product app data: ${appDataRoot}`)

  const productEnvironment = {
    PORT: '3000',
    AY_PLE_PRODUCT_MODE: '1',
    AY_PLE_PACKAGE_ROOT: repositoryRoot,
    AY_PLE_APP_DATA_ROOT: appDataRoot,
    AY_PLE_WORKSPACE_ROOT: selected.workspaceRoot,
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runProductDevelopment({
    arguments: process.argv.slice(2),
    environment: process.env,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
