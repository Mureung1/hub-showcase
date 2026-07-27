import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const GIT_EXECUTABLE = '/usr/bin/git'

export const EXTERNAL_PRODUCTION_RUNTIME_ROOT_FOR_TEST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '.ay-ple',
  'runtime',
  'production-runtime-darwin-arm64',
)

export async function initializeGitRootForTest(
  directory: string,
): Promise<void> {
  await execFileAsync(GIT_EXECUTABLE, ['init', '--quiet', directory])
}
