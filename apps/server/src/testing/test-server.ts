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
  const application = await createServerApplication(options)
  const address = await application.listen(0, '127.0.0.1')

  try {
    await testBody(`http://127.0.0.1:${address.port}`, application)
  } finally {
    await application.close()
  }
}
