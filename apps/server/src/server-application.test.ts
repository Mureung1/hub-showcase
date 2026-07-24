import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { createServerApplication } from './server-application.js'

const execFileAsync = promisify(execFile)

test('the host application seam is listener-independent and closes idempotently', async () => {
  const application = await createServerApplication()

  assert.deepEqual(Object.keys(application).sort(), [
    'app',
    'close',
    'semesterWorkspace',
  ])
  assert.equal('listen' in application, false)

  const firstClose = application.close()
  const secondClose = application.close()
  assert.equal(secondClose, firstClose)
  await firstClose
})

test('importing the Server host seam does not load dotenv or keep a listener alive', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-import-test-'),
  )
  const dotenvPath = path.join(testRoot, '.env')
  const sentinelPath = path.join(testRoot, 'sentinel.txt')
  const sentinel = 'AY_PLE_IMPORT_SIDE_EFFECT_SENTINEL'
  const moduleUrls = [
    pathToFileURL(
      fileURLToPath(new URL('./index.ts', import.meta.url)),
    ).href,
    pathToFileURL(
      fileURLToPath(new URL('./server-application.ts', import.meta.url)),
    ).href,
    pathToFileURL(fileURLToPath(new URL('./server.ts', import.meta.url))).href,
  ]

  try {
    await writeFile(dotenvPath, `${sentinel}=loaded\n`, 'utf8')
    await writeFile(sentinelPath, 'preserve exactly', 'utf8')
    const environment = { ...process.env }
    delete environment[sentinel]
    const source = [
      ...moduleUrls.map((moduleUrl) => `await import(${JSON.stringify(moduleUrl)})`),
      `if (process.env.${sentinel} !== undefined) throw new Error('dotenv loaded during import')`,
    ].join('\n')

    await execFileAsync(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        '--input-type=module',
        '--eval',
        source,
      ],
      {
        cwd: testRoot,
        env: environment,
        timeout: 2_000,
      },
    )
    assert.equal(await readFile(sentinelPath, 'utf8'), 'preserve exactly')
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})
