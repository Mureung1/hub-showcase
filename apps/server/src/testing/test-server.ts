import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createServerApp,
  type CreateServerAppOptions,
} from '../server.js'

export async function withTestServer(
  options: CreateServerAppOptions,
  testBody: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-test-'),
  )

  try {
    const app = await createServerApp({
      ...options,
      runtimeHistoryDirectory:
        options.runtimeHistoryDirectory ?? path.join(temporaryRoot, 'runs'),
    })
    const server = app.listen(0, '127.0.0.1')

    await new Promise<void>((resolve) => {
      server.once('listening', resolve)
    })

    const address = server.address()

    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port')
    }

    try {
      await testBody(`http://127.0.0.1:${address.port}`)
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
        server.closeAllConnections()
      })
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
}
