export {
  decodeRuntimeReleaseDescriptor,
} from './contract.js'
export type {
  RuntimeReleaseDescriptor,
  RuntimeResolveProgress,
  RuntimeResolutionError,
  RuntimeResolutionErrorCode,
  RuntimeResolver,
  VerifiedRuntime,
} from './contract.js'
export {
  RuntimeReleaseAuthorityError,
} from './runtime-release-authority.js'
export {
  createRuntimeResolverBundle,
} from './runtime-resolver.js'
export type {
  RuntimeResolverBundleInput,
  RuntimeSpawnBoundary,
} from './runtime-resolver.js'

export type RuntimeReleaseScaffold = {
  readonly workspace: '@ay-ple/runtime-release'
}
