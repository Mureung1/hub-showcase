import {
  createServerApplication,
  listenToServerApplication,
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
  const application = await createServerApplication(options)
  const started = await listenToServerApplication(application, {
    host: '127.0.0.1',
    port: 0,
  })

  try {
    await testBody(
      `http://127.0.0.1:${started.port}`,
      started.application,
    )
  } finally {
    await started.application.close()
  }
}
