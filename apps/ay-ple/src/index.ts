import type { RuntimeReleaseScaffold } from '@ay-ple/runtime-release'
import type { SemesterWorkspaceScaffold } from '@ay-ple/semester-workspace'

export type AyPleApplicationScaffold = {
  readonly packageName: 'ay-ple'
  readonly runtimeRelease: RuntimeReleaseScaffold
  readonly semesterWorkspace: SemesterWorkspaceScaffold
}
