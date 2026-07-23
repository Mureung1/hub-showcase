import { resolveProductDevelopmentBootstrap } from './product-development.js'
import {
  createServerApplication,
  type ServerApplication,
} from './server-application.js'
import { listenToServerApplication } from './server-listener.js'

const serverHost = '127.0.0.1'

export type StartConfiguredServerApplicationOptions = {
  readonly environment?: NodeJS.ProcessEnv
  readonly host?: string
  readonly log?: (message: string) => void
  readonly port?: number
}

export type StartedServerApplication = {
  readonly application: ServerApplication
  readonly port: number
}

export async function startConfiguredServerApplication(
  options: StartConfiguredServerApplicationOptions = {},
): Promise<StartedServerApplication> {
  const environment = options.environment ?? process.env
  const log = options.log ?? console.log
  const productDevelopment = resolveProductDevelopmentBootstrap(environment)
  const application = await createServerApplication({
    productRuntime: productDevelopment?.runtime,
    semesterWorkspace: productDevelopment?.semesterWorkspace,
  })
  try {
    if (productDevelopment) {
      const activation = await application.semesterWorkspace?.activate()
      if (activation?.status !== 'activated') {
        throw new Error('Product SemesterWorkspace activation was cancelled.')
      }
      if (activation.workspace.state === 'ready') {
        log(
          `SemesterWorkspace active: ${application.semesterWorkspace?.nativeCwd()}`,
        )
      } else {
        const foundStoreFormatVersion =
          activation.workspace.foundStoreFormatVersion ?? 'unknown'
        log(
          `SemesterWorkspace read-only: store format ${foundStoreFormatVersion}`,
        )
      }
    }
    const host = options.host ?? serverHost
    const started = await listenToServerApplication(application, {
      host,
      port: options.port ?? Number(environment.PORT ?? 3000),
    })
    log(`server listening on http://${host}:${started.port}`)
    return started
  } catch (error) {
    await application.close().catch(() => undefined)
    throw error
  }
}
