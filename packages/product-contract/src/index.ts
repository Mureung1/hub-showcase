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
  ProductRawMaterial,
  ProductSettledHistory,
  ProductSettledModelingRun,
  ProductSettledStatePatch,
  ProductUserConfirmation,
  ProductWorkspace,
  ProductWorkspaceActivationResponse,
  ProductWorkspaceResponse,
  ReadyProductWorkspace,
} from './workspace.js'

export {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  decodeCreateProductCourseRequest,
  decodeEmptyProductRequest,
  decodeFirstAssignmentRequest,
  decodeProductChatRequest,
  decodeProductError,
  decodeProductInteractionAnswerRequest,
} from './request.js'
export type {
  CreateProductCourseRequest,
  FirstAssignmentRequest,
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
