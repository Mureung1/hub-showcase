import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { runProductDevelopment } from './product-development-bootstrap.mjs'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const usage =
  'Usage: npm run dev -- [--app-data-root <absolute-directory>] [--workspace <absolute-directory>]'

type ProductDevelopmentStarter = (options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}) => Promise<void>

export function resolveCanonicalProductArguments(
  arguments_: readonly string[],
  packageRoot: string,
): {
  readonly appDataRoot: string
  readonly workspaceRoot: string | undefined
} {
  let appDataRoot: string | undefined
  let workspaceRoot: string | undefined
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    const value = arguments_[index + 1]
    if (
      argument === '--app-data-root' &&
      appDataRoot === undefined &&
      value !== undefined &&
      path.isAbsolute(value)
    ) {
      appDataRoot = value
      index += 1
      continue
    }
    if (
      argument === '--workspace' &&
      workspaceRoot === undefined &&
      value !== undefined &&
      path.isAbsolute(value)
    ) {
      workspaceRoot = value
      index += 1
      continue
    }
    throw new Error(usage)
  }
  return {
    appDataRoot: appDataRoot ?? path.join(path.dirname(packageRoot), '.ay-ple'),
    workspaceRoot,
  }
}

export async function runCanonicalProduct(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
  readonly packageRoot: string
  readonly startProductDevelopment?: ProductDevelopmentStarter
}): Promise<void> {
  const selected = resolveCanonicalProductArguments(
    options.arguments,
    options.packageRoot,
  )
  await (options.startProductDevelopment ?? runProductDevelopment)({
    arguments: [
      '--app-data-root',
      selected.appDataRoot,
      ...(selected.workspaceRoot === undefined
        ? []
        : ['--workspace', selected.workspaceRoot]),
    ],
    environment: options.environment,
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runCanonicalProduct({
    arguments: process.argv.slice(2),
    environment: process.env,
    packageRoot: repositoryRoot,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
