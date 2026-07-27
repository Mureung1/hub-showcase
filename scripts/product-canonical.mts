import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  resolveProductDevelopmentArguments,
  startProductDevelopment,
} from './product-development-bootstrap.mjs'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))

type ProductDevelopmentStarter = (options: {
  readonly appDataRoot: string
  readonly environment: NodeJS.ProcessEnv
  readonly workspaceRoot: string | undefined
}) => Promise<void>

export function resolveCanonicalProductArguments(
  arguments_: readonly string[],
  packageRoot: string,
): {
  readonly appDataRoot: string
  readonly workspaceRoot: string | undefined
} {
  return resolveProductDevelopmentArguments({
    arguments: arguments_,
    environment: {
      AY_PLE_APP_DATA_ROOT: path.join(path.dirname(packageRoot), '.ay-ple'),
    },
  })
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
  await (options.startProductDevelopment ?? startProductDevelopment)({
    ...selected,
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
