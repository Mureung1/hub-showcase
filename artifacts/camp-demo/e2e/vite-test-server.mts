import { once } from 'node:events'
import { createServer as createHttpServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  createServer as createViteServer,
  type InlineConfig,
  type ViteDevServer,
} from 'vite'

export type ViteTestServer = {
  close: () => Promise<void>
  url: string
}

export async function startViteTestServer(
  config: InlineConfig,
): Promise<ViteTestServer> {
  let httpServer: Server | undefined
  let viteServer: ViteDevServer | undefined

  try {
    viteServer = await createViteServer(config)
    httpServer = createHttpServer(viteServer.middlewares)
    httpServer.listen(0, '127.0.0.1')
    await once(httpServer, 'listening')

    let closed = false

    return {
      url: serverUrl(httpServer),
      close: async () => {
        if (closed) {
          return
        }

        closed = true
        await closeViteTestServer(httpServer, viteServer)
      },
    }
  } catch (error) {
    await closeViteTestServer(httpServer, viteServer)
    throw error
  }
}

async function closeHttpServer(
  server: Server | undefined,
): Promise<void> {
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

function serverUrl(server: Server): string {
  const address = server.address() as AddressInfo | null

  if (!address) {
    throw new Error('Expected Vite test server to be listening')
  }

  return `http://127.0.0.1:${address.port}`
}

async function closeViteTestServer(
  httpServer: Server | undefined,
  viteServer: ViteDevServer | undefined,
): Promise<void> {
  const results = await Promise.allSettled([
    closeHttpServer(httpServer),
    viteServer?.close() ?? Promise.resolve(),
  ])
  const rejectedResult = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (rejectedResult) {
    throw rejectedResult.reason
  }
}
