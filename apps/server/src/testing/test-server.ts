import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  createServerApplication,
  type CreateServerAppOptions,
  type ServerApplication,
} from '../server.js'

export async function withTestServer(
  options: CreateServerAppOptions,
  testBody: (
    baseUrl: string,
    application: ServerApplication,
  ) => Promise<void>,
): Promise<void> {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-server-test-'),
  )

  try {
    const application = await createServerApplication({
      ...options,
      runtimeHistoryDirectory:
        options.runtimeHistoryDirectory ?? path.join(temporaryRoot, 'runs'),
    })
    const address = await application.listen(0, '127.0.0.1')

    try {
      await testBody(`http://127.0.0.1:${address.port}`, application)
    } finally {
      await application.close()
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
}
