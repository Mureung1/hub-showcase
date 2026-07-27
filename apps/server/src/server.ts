import { pathToFileURL } from 'node:url'

import { startConfiguredServerApplication } from './server-development.js'
import { installServerProcessSignalHandlers } from './server-process-lifecycle.js'

export {
  createServerApplication,
  type CreateServerAppOptions,
  type SemesterWorkspaceBootstrap,
  type ServerApplication,
} from './server-application.js'
export {
  startConfiguredServerApplication,
  type StartedServerApplication,
  type StartConfiguredServerApplicationOptions,
} from './server-development.js'
export {
  listenToServerApplication,
  type ServerListenOptions,
  type StartedServerListener,
} from './server-listener.js'
export {
  installServerProcessSignalHandlers,
  type InstallServerProcessSignalHandlersOptions,
  type ServerProcessSignal,
  type ServerProcessSignalSource,
} from './server-process-lifecycle.js'

async function startServer(): Promise<void> {
  const { config } = await import('dotenv')
  config()
  const { application } = await startConfiguredServerApplication()
  installServerProcessSignalHandlers(application)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer().catch((error: unknown) => {
    console.error(
      `Unable to start server: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 1
  })
}
