import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer as createHttpServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, type Page } from 'playwright/test'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import { createServerApp } from '../../server/src/server.js'

const inspectorRoot = fileURLToPath(new URL('../', import.meta.url))

type InspectorFixtures = {
  inspectorPage: Page
}

type InspectorHarness = {
  close: () => Promise<void>
  url: string
}

export const test = base.extend<InspectorFixtures>({
  inspectorPage: async ({ page }, providePage) => {
    const harness = await startInspectorHarness()

    try {
      await page.goto(harness.url)
      await providePage(page)
    } finally {
      try {
        await page.close()
      } finally {
        await harness.close()
      }
    }
  },
})

async function startInspectorHarness(): Promise<InspectorHarness> {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-inspector-e2e-'),
  )
  let apiServer: Server | undefined
  let inspectorServer: Server | undefined
  let viteServer: ViteDevServer | undefined

  try {
    const app = createServerApp({
      fakeDelayMs: 5_000,
      codexRawClientOptions: {
        codexBinPath: path.join(temporaryRoot, 'missing-codex'),
        codexHome: path.join(temporaryRoot, 'codex-home'),
        codexSqliteHome: path.join(temporaryRoot, 'codex-sqlite-home'),
        cwd: temporaryRoot,
      },
    })
    apiServer = app.listen(0, '127.0.0.1')
    await once(apiServer, 'listening')

    const apiUrl = serverUrl(apiServer)
    viteServer = await createViteServer({
      root: inspectorRoot,
      cacheDir: path.join(temporaryRoot, 'vite-cache'),
      clearScreen: false,
      logLevel: 'error',
      server: {
        hmr: false,
        middlewareMode: true,
        proxy: {
          '/api': apiUrl,
        },
      },
    })
    inspectorServer = createHttpServer(viteServer.middlewares)
    inspectorServer.listen(0, '127.0.0.1')
    await once(inspectorServer, 'listening')

    let closed = false

    return {
      url: serverUrl(inspectorServer),
      close: async () => {
        if (closed) {
          return
        }

        closed = true
        await closeHarnessResources({
          apiServer,
          inspectorServer,
          temporaryRoot,
          viteServer,
        })
      },
    }
  } catch (error) {
    await closeHarnessResources({
      apiServer,
      inspectorServer,
      temporaryRoot,
      viteServer,
    })
    throw error
  }
}

function serverUrl(server: Server): string {
  const address = server.address() as AddressInfo | null

  if (!address) {
    throw new Error('Expected browser harness server to be listening')
  }

  return `http://127.0.0.1:${address.port}`
}

async function closeHarnessResources(resources: {
  apiServer?: Server
  inspectorServer?: Server
  temporaryRoot: string
  viteServer?: ViteDevServer
}): Promise<void> {
  const results = await Promise.allSettled([
    closeServer(resources.inspectorServer),
    resources.viteServer?.close() ?? Promise.resolve(),
    closeServer(resources.apiServer),
  ])

  await rm(resources.temporaryRoot, { force: true, recursive: true })

  const rejectedResult = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (rejectedResult) {
    throw rejectedResult.reason
  }
}

async function closeServer(server: Server | undefined): Promise<void> {
  if (!server?.listening) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}
