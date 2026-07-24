import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const environment = { ...process.env }
delete environment.NODE_OPTIONS

const source = `
  const serverRoot = await import('@ay-ple/server')
  const keys = Object.keys(serverRoot).sort()
  const expected = [
    'ServerStartupCleanupError',
    'createServerApplication',
    'listenToServerApplication',
  ]
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error('Unexpected built Server package root: ' + JSON.stringify(keys))
  }
  const application = await serverRoot.createServerApplication()
  if ('listen' in application) {
    throw new Error('The built application factory owns a listener')
  }
  await application.close()
  process.stdout.write(JSON.stringify({
    exports: keys,
    listenerIndependent: true,
  }) + '\\n')
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
