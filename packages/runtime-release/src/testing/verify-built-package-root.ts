import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const packageRoot = fileURLToPath(new URL('../../', import.meta.url))
const environment = { ...process.env }
delete environment.NODE_OPTIONS

const source = `
  const runtimeRelease = await import('@ay-ple/runtime-release')
  const keys = Object.keys(runtimeRelease).sort()
  const expected = [
    'RuntimeReleaseAuthorityError',
    'createRuntimeResolverBundle',
    'decodeRuntimeReleaseDescriptor',
  ]
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(
      'Unexpected built Runtime release package root: ' +
      JSON.stringify(keys),
    )
  }
  for (const key of expected) {
    if (typeof runtimeRelease[key] !== 'function') {
      throw new Error('Built Runtime release export is not callable: ' + key)
    }
  }
  for (const forbidden of [
    'RuntimeReleaseContractError',
    'createRuntimeResolverBundleForTesting',
  ]) {
    if (forbidden in runtimeRelease) {
      throw new Error('Private Runtime release export escaped: ' + forbidden)
    }
  }
  process.stdout.write(JSON.stringify({ exports: keys }) + '\\n')
`

const result = await execFileAsync(
  process.execPath,
  ['--input-type=module', '--eval', source],
  {
    cwd: packageRoot,
    env: environment,
    timeout: 5_000,
  },
)

assert.equal(result.stderr, '')
process.stdout.write(result.stdout)
