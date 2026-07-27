export {
  createSemesterWorkspaceAdmission,
} from './admission.js'
export type {
  RestorableSemesterWorkspaceAdmission,
} from './admission.js'
export * from './contract.js'
export {
  decodeCurrentSemesterWorkspaceV2,
  isDecoderValidCurrentV2,
  SemesterWorkspaceV2CodecError,
} from './legacy-v2-codec.js'
export type {
  CurrentSemesterWorkspaceV2,
} from './legacy-v2-codec.js'
export * from './v3-codec.js'
export * from './v4-codec.js'
export {
  WorkspaceBundleSourceError,
  captureCanonicalWorkspaceBundleSource,
  captureWorkspaceBundleSourceAt,
  materializeWorkspaceBundle,
  recoverMissingWorkspaceBundle,
  verifyWorkspaceBundle,
} from './workspace-bundle.js'
export type {
  WorkspaceBundleConflict,
  WorkspaceBundleConflictReason,
  WorkspaceBundleMutationResult,
  WorkspaceBundleVerification,
} from './workspace-bundle.js'
export {
  createWorkspaceContextGuard,
  verifyWorkspaceStaticContext,
} from './workspace-context.js'
export {
  createSetupEnvelopeStore,
  decodeSetupStateEnvelopeBytes,
  encodeSetupStateEnvelope,
  SetupEnvelopeStorageError,
  SetupStateCodecError,
} from './setup-envelope-store.js'
export type {
  RecoverableSetupEnvelopeStore,
  SetupEnvelopeStoreFaultPoint,
  SetupEnvelopeStoreOptions,
} from './setup-envelope-store.js'
export {
  createLeaseBoundSemesterSetupJourney,
  createSemesterSetupJourney,
  SemesterReadyValidationError,
} from './setup-journey.js'
export type {
  LeaseBoundSemesterSetupJourneyOptions,
  SemesterReadyValidationFailureReason,
  SemesterReadyTransitionPort,
  SemesterReadyTransitionResult,
  SemesterSetupJourneyFaultPoint,
  SemesterSetupJourneyOptions,
  SemesterSetupJourneyProjection,
  SemesterSetupParentSelection,
} from './setup-journey.js'

export type SemesterWorkspaceScaffold = {
  readonly workspace: '@ay-ple/semester-workspace'
}
