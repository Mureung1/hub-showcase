export { createSemesterWorkspaceAdmission } from './admission.js'
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

export type SemesterWorkspaceScaffold = {
  readonly workspace: '@ay-ple/semester-workspace'
}
