export {
  PRODUCT_JSON_ENVELOPE_MAX_BYTES,
  ProductContractError,
  isProductDecisionKey,
  isProductDigest,
  isProductInteractionId,
  isProductMaterialId,
  isProductOperationId,
  isProductPatchId,
  isProductQuestionId,
} from './contract-values.js'

export {
  decodeProductBootstrap,
  decodeProductMaterialRefreshResponse,
  decodeProductMaterialPreview,
  decodeProductWorkspace,
  decodeProductWorkspaceActivationResponse,
  decodeProductWorkspaceResponse,
} from './workspace.js'
export type {
  IncompatibleProductWorkspace,
  ProductAccountReadiness,
  ProductAssignment,
  ProductBootstrap,
  ProductEvidenceRef,
  ProductMaterialPreview,
  ProductMaterialRefreshResponse,
  ProductRawMaterial,
  ProductSettledHistory,
  ProductSettledModelingRun,
  ProductSettledStatePatch,
  ProductUserConfirmation,
  ProductWorkspace,
  ProductWorkspaceActivationResponse,
  ProductWorkspaceResponse,
  ProductWorkspaceRecovery,
  ReadyProductWorkspace,
} from './workspace.js'

export {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  decodeCreateProductCourseRequest,
  decodeEmptyProductRequest,
  decodeFirstAssignmentRequest,
  decodeFirstAssignmentRetryRequest,
  decodeProductChatRequest,
  decodeProductError,
  decodeProductInteractionAnswerRequest,
} from './request.js'
export type {
  CreateProductCourseRequest,
  FirstAssignmentRequest,
  FirstAssignmentRetryRequest,
  ProductChatRequest,
  ProductError,
  ProductInteractionAnswerRequest,
  ProductMaterialSelection,
} from './request.js'

export {
  PRODUCT_REVIEW_FEEDBACK_MAX_BYTES,
  decodeProductReviewRequest,
  decodeProductReviewResponse,
} from './review.js'
export type {
  ProductReviewRequest,
  ProductReviewResponse,
} from './review.js'

export {
  decodeProductOperationFrame,
  decodeProductQuestion,
  decodeProductStatePatch,
} from './operation-frame.js'
export type {
  AssignmentOperationSettlement,
  ChatOperationSettlement,
  ProductOperationFrame,
  ProductQuestion,
  ProductStatePatch,
} from './operation-frame.js'
export type { ProductOperationRecovery } from './recovery.js'

export {
  decodePublicPreviewBootstrap,
  decodePublicPreviewCommand,
  decodePublicPreviewError,
  decodePublicPreviewResponse,
} from './public-preview.js'
export type {
  PublicPreviewBootstrap,
  PublicPreviewCommand,
  PublicPreviewError,
  PublicPreviewErrorCode,
  PublicPreviewResponse,
} from './public-preview.js'

export { decodePublicPreviewAccountProjection } from './account.js'
export type { PublicPreviewAccountProjection } from './account.js'

export {
  decodePublicPreviewSetupProjection,
} from './setup.js'
export type {
  PublicPreviewNextJourney,
  PublicPreviewParentSelection,
  PublicPreviewReadyCheck,
  PublicPreviewSemesterInput,
  PublicPreviewSetupProjection,
  PublicPreviewTermOption,
  PublicPreviewYearLevelOption,
} from './setup.js'

export type {
  PublicPreviewAccountCommand,
  PublicPreviewCommandName,
  PublicPreviewSetupCommand,
} from './public-preview-values.js'

export {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
  PUBLIC_PREVIEW_COMMAND_FIXTURES,
  PUBLIC_PREVIEW_RESPONSE_FIXTURES,
  PUBLIC_PREVIEW_SCENARIO_FIXTURES,
  PUBLIC_PREVIEW_SETUP_FIXTURES,
} from './public-preview-fixtures.js'
