import type { RuntimeReleaseScaffold } from '@ay-ple/runtime-release'
import type { SemesterWorkspaceScaffold } from '@ay-ple/semester-workspace'

export {
  ApplicationStartupError,
  admitApplicationStartup,
} from './application-startup.js'
export type {
  ApplicationRuntimeOwner,
  ApplicationStartupAdmission,
  ApplicationStartupFailure,
  ApplicationStartupFailureCode,
  ApplicationStartupInput,
  PreparedApplicationStartup,
  PrepareApplicationStartupInput,
} from './application-startup.js'
export {
  startDynamicLocalApplicationHost,
} from './dynamic-local-application-host.js'
export type {
  DynamicLocalApplicationHost,
  StartDynamicLocalApplicationHostInput,
} from './dynamic-local-application-host.js'

export type AyPleApplicationScaffold = {
  readonly packageName: 'ay-ple'
  readonly runtimeRelease: RuntimeReleaseScaffold
  readonly semesterWorkspace: SemesterWorkspaceScaffold
}
