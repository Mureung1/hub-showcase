export type ProductRawMaterial = {
  readonly id: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: 'text/plain; charset=utf-8'
  readonly size: number
}

export type ReadyProductWorkspace = {
  readonly state: 'ready'
  readonly confirmedRevision: number
  readonly course: {
    readonly id: string
    readonly displayName: string
  } | null
  readonly materials: readonly ProductRawMaterial[]
}

export type IncompatibleProductWorkspace = {
  readonly state: 'incompatible'
  readonly readOnly: true
  readonly displayMessage: string
}

export type ProductWorkspace =
  | ReadyProductWorkspace
  | IncompatibleProductWorkspace

export type ProductAccountReadiness =
  | { readonly state: 'ready' }
  | { readonly state: 'not_ready'; readonly displayMessage: string }
  | { readonly state: 'unavailable'; readonly displayMessage: string }

export type ProductEvidenceRef = {
  readonly field: 'title' | 'dueAt' | 'submissionMethod'
  readonly materialId: string
  readonly digest: string
  readonly quote: string
}

export type ProductAssignment = {
  readonly id: string
  readonly courseId: string
  readonly title: string
  readonly dueAt: string
  readonly submissionMethod: string
  readonly evidence: readonly ProductEvidenceRef[]
}

export type ProductSettledStatePatch = {
  readonly id: string
  readonly courseId: string
  readonly baseRevision: number
  readonly status: 'superseded' | 'applied' | 'rejected' | 'interrupted'
  readonly createdAt: string
  readonly applyOutcome:
    | null
    | {
        readonly type: 'applied'
        readonly assignmentId: string
        readonly resultingRevision: number
      }
    | { readonly type: 'not_applied'; readonly revision: number }
}

export type ProductUserConfirmation = {
  readonly id: string
  readonly patchId: string
  readonly decision: 'accepted' | 'rejected'
  readonly settledAt: string
  readonly assignmentId: string | null
  readonly resultingRevision: number | null
  readonly outcome: 'applied' | 'not_applied'
}

export type ProductSettledModelingRun = {
  readonly id: string
  readonly actionId: string
  readonly courseId: string
  readonly recipe: {
    readonly name: string
    readonly version: string
    readonly requestedSkillName: string
  }
  readonly sources: readonly {
    readonly materialId: string
    readonly digest: string
  }[]
  readonly status:
    | 'not_accepted'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly validationOutcome: 'passed' | 'failed' | 'unknown'
  readonly createdAt: string
  readonly updatedAt: string
  readonly settledAt: string
}

export type ProductSettledHistory = {
  readonly assignments: readonly ProductAssignment[]
  readonly statePatches: readonly ProductSettledStatePatch[]
  readonly userConfirmations: readonly ProductUserConfirmation[]
  readonly modelingRuns: readonly ProductSettledModelingRun[]
}

export type ProductBootstrap = {
  readonly accountReadiness: ProductAccountReadiness
  readonly workspace: ProductWorkspace | null
  readonly history: ProductSettledHistory
}

export const PRODUCT_JSON_ENVELOPE_MAX_BYTES = 16 * 1024
export const PRODUCT_REVIEW_FEEDBACK_MAX_BYTES = 8 * 1024
export const FIRST_ASSIGNMENT_RECIPE_VERSION = '1'
export const FIRST_ASSIGNMENT_ARGUMENTS = { timezone: 'Asia/Seoul' } as const

export type ProductMaterialSelection = {
  readonly id: string
  readonly digest: string
}

export type FirstAssignmentRequest = {
  readonly courseId: string
  readonly recipeVersion: typeof FIRST_ASSIGNMENT_RECIPE_VERSION
  readonly arguments: typeof FIRST_ASSIGNMENT_ARGUMENTS
  readonly materials: readonly ProductMaterialSelection[]
}

export type ProductChatRequest = {
  readonly text: string
  readonly materials: readonly ProductMaterialSelection[]
}

export type CreateProductCourseRequest = {
  readonly displayName: string
}

export type ProductReviewRequest =
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'accept' | 'reject'
    }
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'revise'
      readonly feedback: string
    }

export type ProductInteractionAnswerRequest = {
  readonly answers: Readonly<Record<string, readonly string[]>>
}

export type ProductWorkspaceActivationResponse = {
  readonly status: 'activated' | 'cancelled'
  readonly workspace: ProductWorkspace | null
}

export type ProductWorkspaceResponse = {
  readonly workspace: ReadyProductWorkspace
}

export type ProductMaterialPreview = {
  readonly materialId: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: 'text/plain; charset=utf-8'
  readonly size: number
  readonly text: string
  readonly truncated: boolean
}

export type ProductReviewResponse =
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'accepted'
      readonly outcome: 'applied'
      readonly confirmedRevision: number
      readonly replayed: boolean
    }
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'rejected'
      readonly outcome: 'not_applied'
      readonly confirmedRevision: number
      readonly replayed: boolean
    }
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'revision_requested'
      readonly outcome: 'replacement_pending'
      readonly confirmedRevision: number
      readonly replayed: boolean
    }

export type ProductError = {
  readonly code: string
  readonly displayMessage: string
}

export type ProductQuestion = {
  readonly id: string
  readonly header: string
  readonly question: string
  readonly options: readonly {
    readonly label: string
    readonly description: string
  }[] | null
  readonly acceptsFreeform: boolean
}

export type ProductStatePatch = {
  readonly id: string
  readonly summary: string
  readonly changes: {
    readonly operation: 'assignment.upsert'
    readonly assignmentId?: string
    readonly values: {
      readonly title: string
      readonly dueAt: string
      readonly submissionMethod: string
    }
  }
  readonly evidence: readonly {
    readonly field: ProductEvidenceRef['field']
    readonly rawMaterialId: string
    readonly digest: string
    readonly quote: string
  }[]
  readonly status: 'pending' | 'superseded' | 'applied' | 'rejected' | 'interrupted'
}

type ProductFrameBase = { readonly operationId: string }
type ProductActivityFrameBase = ProductFrameBase & {
  readonly activityId: string
}
export type AssignmentOperationSettlement = {
  readonly status:
    | 'not_accepted'
    | 'acceptance_unknown'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly validationOutcome: 'passed' | 'failed' | 'unknown'
  readonly failureCode?: string
}
export type ChatOperationSettlement = {
  readonly status:
    | 'not_accepted'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly failureCode?: string
}

export type ProductOperationFrame =
  | (ProductFrameBase & {
      readonly type: 'operation.preparing' | 'operation.accepted'
      readonly runId: string
    })
  | (ProductFrameBase & {
      readonly type: 'operation.preparing' | 'operation.accepted'
      readonly runId?: never
    })
  | (ProductFrameBase & {
      readonly type: 'skill.requested'
      readonly skill: { readonly name: string; readonly version: string }
    })
  | (ProductActivityFrameBase & {
      readonly type: 'agent_message.delta' | 'plan.delta'
      readonly delta: string
    })
  | (ProductActivityFrameBase & {
      readonly type: 'agent_message.completed' | 'plan.completed'
      readonly text: string
    })
  | (ProductActivityFrameBase & {
      readonly type: 'mcp_call.started'
      readonly tool: 'propose_state_patch'
    })
  | (ProductActivityFrameBase & {
      readonly type: 'mcp_call.completed'
      readonly tool: 'propose_state_patch'
      readonly patch: ProductStatePatch
    })
  | (ProductActivityFrameBase & {
      readonly type: 'mcp_call.failed'
      readonly tool: 'propose_state_patch'
      readonly displayMessage: string
    })
  | (ProductFrameBase & {
      readonly type: 'interaction.requested'
      readonly interactionId: string
      readonly questions: readonly ProductQuestion[]
    })
  | (ProductFrameBase & {
      readonly type: 'review.requested'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly patch: ProductStatePatch
      readonly questions: readonly ProductQuestion[]
    })
  | (ProductFrameBase & {
      readonly type: 'review.replaced'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly patch: ProductStatePatch
      readonly questions: readonly ProductQuestion[]
      readonly replaces: {
        readonly interactionId: string
        readonly patchId: string
        readonly decisionKey: string
      }
    })
  | (ProductFrameBase & {
      readonly type: 'interaction.resolved'
      readonly interactionId: string
      readonly resolution: 'answered' | 'cancelled'
    })
  | (ProductFrameBase & {
      readonly type: 'review.resolved'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly outcome: 'accepted' | 'revised' | 'rejected' | 'cancelled'
    })
  | (ProductFrameBase & { readonly type: 'interrupt.acknowledged' })
  | (ProductFrameBase & {
      readonly type: 'operation.error'
      readonly code: string
      readonly displayMessage: string
      readonly willRetry: boolean
    })
  | (ProductFrameBase &
      AssignmentOperationSettlement & {
        readonly type: 'operation.terminal'
        readonly runId: string
      })
  | (ProductFrameBase &
      ChatOperationSettlement & {
        readonly type: 'operation.terminal'
        readonly runId?: never
      })

export class ProductContractError extends TypeError {
  constructor() {
    super('The product contract value is invalid.')
    this.name = 'ProductContractError'
  }
}

export function decodeProductBootstrap(value: unknown): ProductBootstrap {
  if (!isExactObject(value, ['accountReadiness', 'history', 'workspace'])) {
    throw invalidContract()
  }
  return {
    accountReadiness: decodeProductAccountReadiness(value.accountReadiness),
    workspace:
      value.workspace === null ? null : decodeProductWorkspace(value.workspace),
    history: decodeProductSettledHistory(value.history),
  }
}

export function decodeEmptyProductRequest(
  value: unknown,
): Record<string, never> {
  if (!isExactObject(value, []) || !hasValidJsonEnvelope(value)) {
    throw invalidContract()
  }
  return {}
}

export function decodeCreateProductCourseRequest(
  value: unknown,
): CreateProductCourseRequest {
  if (
    !isExactObject(value, ['displayName']) ||
    typeof value.displayName !== 'string' ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return { displayName: value.displayName }
}

export function decodeFirstAssignmentRequest(
  value: unknown,
): FirstAssignmentRequest {
  if (
    !isExactObject(value, [
      'arguments',
      'courseId',
      'materials',
      'recipeVersion',
    ]) ||
    !isCourseId(value.courseId) ||
    value.recipeVersion !== FIRST_ASSIGNMENT_RECIPE_VERSION ||
    !isExactObject(value.arguments, ['timezone']) ||
    value.arguments.timezone !== FIRST_ASSIGNMENT_ARGUMENTS.timezone ||
    !isMaterialSelection(value.materials, 2, 2) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return {
    courseId: value.courseId,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials: value.materials,
  }
}

export function decodeProductChatRequest(value: unknown): ProductChatRequest {
  if (
    !isExactObject(value, ['materials', 'text']) ||
    typeof value.text !== 'string' ||
    value.text.trim().length === 0 ||
    !isMaterialSelection(value.materials, 0, 2) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return { text: value.text, materials: value.materials }
}

export function decodeProductReviewRequest(
  value: unknown,
): ProductReviewRequest {
  if (
    !isRecord(value) ||
    !isPatchId(value.patchId) ||
    !isDecisionKey(value.decisionKey) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  if (value.decision === 'revise') {
    if (
      !isExactObject(value, [
        'decision',
        'decisionKey',
        'feedback',
        'patchId',
      ]) ||
      typeof value.feedback !== 'string' ||
      value.feedback.trim().length === 0 ||
      utf8Bytes(value.feedback) > PRODUCT_REVIEW_FEEDBACK_MAX_BYTES
    ) {
      throw invalidContract()
    }
    return {
      patchId: value.patchId,
      decisionKey: value.decisionKey,
      decision: 'revise',
      feedback: value.feedback,
    }
  }
  if (
    !isExactObject(value, ['decision', 'decisionKey', 'patchId']) ||
    (value.decision !== 'accept' && value.decision !== 'reject')
  ) {
    throw invalidContract()
  }
  return {
    patchId: value.patchId,
    decisionKey: value.decisionKey,
    decision: value.decision,
  }
}

export function decodeProductInteractionAnswerRequest(
  value: unknown,
): ProductInteractionAnswerRequest {
  if (
    !isExactObject(value, ['answers']) ||
    !isRecord(value.answers) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  const entries = Object.entries(value.answers)
  if (entries.length === 0 || entries.length > 3) throw invalidContract()
  const answers: Record<string, readonly string[]> = Object.create(null)
  for (const [questionId, selections] of entries) {
    if (
      !isProductQuestionId(questionId) ||
      !Array.isArray(selections) ||
      selections.length > 16 ||
      !selections.every(
        (selection) =>
          typeof selection === 'string' && utf8Bytes(selection) <= 64 * 1024,
      )
    ) {
      throw invalidContract()
    }
    answers[questionId] = selections
  }
  return { answers }
}

export function decodeProductWorkspaceActivationResponse(
  value: unknown,
): ProductWorkspaceActivationResponse {
  if (
    !isExactObject(value, ['status', 'workspace']) ||
    (value.status !== 'activated' && value.status !== 'cancelled')
  ) {
    throw invalidContract()
  }
  return {
    status: value.status,
    workspace:
      value.workspace === null ? null : decodeProductWorkspace(value.workspace),
  }
}

export function decodeProductWorkspaceResponse(
  value: unknown,
): ProductWorkspaceResponse {
  if (!isExactObject(value, ['workspace'])) throw invalidContract()
  const workspace = decodeProductWorkspace(value.workspace)
  if (workspace.state !== 'ready') throw invalidContract()
  return { workspace }
}

export function decodeProductMaterialPreview(
  value: unknown,
): ProductMaterialPreview {
  if (
    !isExactObject(value, [
      'digest',
      'materialId',
      'mediaType',
      'relativePath',
      'size',
      'text',
      'truncated',
    ]) ||
    !hasValidMaterialMetadata(value, 'materialId') ||
    typeof value.text !== 'string' ||
    typeof value.truncated !== 'boolean'
  ) {
    throw invalidContract()
  }
  return {
    materialId: value.materialId as string,
    relativePath: value.relativePath as string,
    digest: value.digest as string,
    mediaType: 'text/plain; charset=utf-8',
    size: value.size as number,
    text: value.text,
    truncated: value.truncated,
  }
}

export function decodeProductReviewResponse(
  value: unknown,
): ProductReviewResponse {
  if (
    !isExactObject(value, [
      'confirmedRevision',
      'decision',
      'decisionKey',
      'outcome',
      'patchId',
      'replayed',
    ]) ||
    !isPatchId(value.patchId) ||
    !isDecisionKey(value.decisionKey) ||
    !isRevision(value.confirmedRevision) ||
    typeof value.replayed !== 'boolean'
  ) {
    throw invalidContract()
  }
  const binding = {
    patchId: value.patchId,
    decisionKey: value.decisionKey,
    confirmedRevision: value.confirmedRevision,
    replayed: value.replayed,
  }
  if (value.decision === 'accepted' && value.outcome === 'applied') {
    return { ...binding, decision: 'accepted', outcome: 'applied' }
  }
  if (value.decision === 'rejected' && value.outcome === 'not_applied') {
    return { ...binding, decision: 'rejected', outcome: 'not_applied' }
  }
  if (
    value.decision === 'revision_requested' &&
    value.outcome === 'replacement_pending'
  ) {
    return {
      ...binding,
      decision: 'revision_requested',
      outcome: 'replacement_pending',
    }
  }
  throw invalidContract()
}

export function decodeProductError(value: unknown): ProductError {
  if (
    !isExactObject(value, ['code', 'displayMessage']) ||
    !isNonEmptyString(value.code) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  return { code: value.code, displayMessage: value.displayMessage }
}

export function decodeProductOperationFrame(
  value: unknown,
): ProductOperationFrame {
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    !isProductOperationId(value.operationId)
  ) {
    throw invalidContract()
  }
  switch (value.type) {
    case 'operation.preparing':
    case 'operation.accepted':
      if (value.operationId.startsWith('action_')) {
        requireExact(value, ['operationId', 'runId', 'type'])
        if (!isRunId(value.runId)) throw invalidContract()
      } else {
        requireExact(value, ['operationId', 'type'])
      }
      break
    case 'skill.requested':
      requireExact(value, ['operationId', 'skill', 'type'])
      if (
        !value.operationId.startsWith('action_') ||
        !isExactObject(value.skill, ['name', 'version']) ||
        !isNonEmptyString(value.skill.name) ||
        !isNonEmptyString(value.skill.version)
      ) {
        throw invalidContract()
      }
      break
    case 'agent_message.delta':
    case 'plan.delta':
      requireExact(value, ['activityId', 'delta', 'operationId', 'type'])
      if (!isActivityId(value.activityId) || !isProductText(value.delta)) {
        throw invalidContract()
      }
      break
    case 'agent_message.completed':
    case 'plan.completed':
      requireExact(value, ['activityId', 'operationId', 'text', 'type'])
      if (!isActivityId(value.activityId) || !isProductText(value.text)) {
        throw invalidContract()
      }
      break
    case 'mcp_call.started':
      requireExact(value, ['activityId', 'operationId', 'tool', 'type'])
      requireMcpFrameBase(value)
      break
    case 'mcp_call.completed':
      requireExact(value, [
        'activityId',
        'operationId',
        'patch',
        'tool',
        'type',
      ])
      requireMcpFrameBase(value)
      decodeProductStatePatch(value.patch)
      break
    case 'mcp_call.failed':
      requireExact(value, [
        'activityId',
        'displayMessage',
        'operationId',
        'tool',
        'type',
      ])
      requireMcpFrameBase(value)
      if (!isProductText(value.displayMessage)) throw invalidContract()
      break
    case 'interaction.requested':
      requireExact(value, [
        'interactionId',
        'operationId',
        'questions',
        'type',
      ])
      if (!isProductInteractionId(value.interactionId)) {
        throw invalidContract()
      }
      decodeProductQuestions(value.questions)
      break
    case 'review.requested':
      requireExact(value, [
        'decisionKey',
        'interactionId',
        'operationId',
        'patch',
        'patchId',
        'questions',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isPatchId(value.patchId) ||
        !isDecisionKey(value.decisionKey)
      ) {
        throw invalidContract()
      }
      if (decodeProductStatePatch(value.patch).id !== value.patchId) {
        throw invalidContract()
      }
      decodeProductQuestions(value.questions)
      break
    case 'review.replaced':
      requireExact(value, [
        'decisionKey',
        'interactionId',
        'operationId',
        'patch',
        'patchId',
        'questions',
        'replaces',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isPatchId(value.patchId) ||
        !isDecisionKey(value.decisionKey) ||
        !isExactObject(value.replaces, [
          'decisionKey',
          'interactionId',
          'patchId',
        ]) ||
        !isProductInteractionId(value.replaces.interactionId) ||
        !isPatchId(value.replaces.patchId) ||
        !isDecisionKey(value.replaces.decisionKey)
      ) {
        throw invalidContract()
      }
      if (decodeProductStatePatch(value.patch).id !== value.patchId) {
        throw invalidContract()
      }
      decodeProductQuestions(value.questions)
      break
    case 'interaction.resolved':
      requireExact(value, [
        'interactionId',
        'operationId',
        'resolution',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isProductResolution(value.resolution)
      ) {
        throw invalidContract()
      }
      break
    case 'review.resolved':
      requireExact(value, [
        'decisionKey',
        'interactionId',
        'outcome',
        'operationId',
        'patchId',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isPatchId(value.patchId) ||
        !isDecisionKey(value.decisionKey) ||
        !isProductReviewOutcome(value.outcome)
      ) {
        throw invalidContract()
      }
      break
    case 'interrupt.acknowledged':
      requireExact(value, ['operationId', 'type'])
      break
    case 'operation.error':
      requireExact(value, [
        'code',
        'displayMessage',
        'operationId',
        'type',
        'willRetry',
      ])
      if (
        !isNonEmptyString(value.code) ||
        !isProductText(value.displayMessage) ||
        typeof value.willRetry !== 'boolean'
      ) {
        throw invalidContract()
      }
      break
    case 'operation.terminal':
      decodeProductTerminalFrame(value)
      break
    default:
      throw invalidContract()
  }
  return value as unknown as ProductOperationFrame
}

export function decodeProductStatePatch(value: unknown): ProductStatePatch {
  if (
    !isExactObject(value, [
      'changes',
      'evidence',
      'id',
      'status',
      'summary',
    ]) ||
    !isPatchId(value.id) ||
    !isProductText(value.summary) ||
    !isProductPatchStatus(value.status) ||
    !Array.isArray(value.evidence) ||
    !value.evidence.every(isProductPatchEvidence) ||
    !isRecord(value.changes)
  ) {
    throw invalidContract()
  }
  const changeKeys = Object.hasOwn(value.changes, 'assignmentId')
    ? ['assignmentId', 'operation', 'values']
    : ['operation', 'values']
  if (
    !isExactObject(value.changes, changeKeys) ||
    value.changes.operation !== 'assignment.upsert' ||
    (Object.hasOwn(value.changes, 'assignmentId') &&
      !isAssignmentId(value.changes.assignmentId)) ||
    !isExactObject(value.changes.values, [
      'dueAt',
      'submissionMethod',
      'title',
    ]) ||
    !isProductText(value.changes.values.title) ||
    !isProductText(value.changes.values.dueAt) ||
    !isProductText(value.changes.values.submissionMethod)
  ) {
    throw invalidContract()
  }
  return value as unknown as ProductStatePatch
}

export function decodeProductQuestion(value: unknown): ProductQuestion {
  if (
    !isExactObject(value, [
      'acceptsFreeform',
      'header',
      'id',
      'options',
      'question',
    ]) ||
    !isPublicQuestionId(value.id) ||
    !isProductText(value.header) ||
    !isProductText(value.question) ||
    typeof value.acceptsFreeform !== 'boolean' ||
    (value.options !== null &&
      (!Array.isArray(value.options) ||
        !value.options.every(
          (option) =>
            isExactObject(option, ['description', 'label']) &&
            isProductText(option.label) &&
            isProductText(option.description),
        )))
  ) {
    throw invalidContract()
  }
  return value as unknown as ProductQuestion
}

export function isProductMaterialId(value: unknown): value is string {
  return isMaterialId(value)
}

export function isProductDigest(value: unknown): value is string {
  return isDigest(value)
}

export function isProductPatchId(value: unknown): value is string {
  return isPatchId(value)
}

export function isProductDecisionKey(value: unknown): value is string {
  return isDecisionKey(value)
}

export function isProductOperationId(value: unknown): value is string {
  return (
    typeof value === 'string' && /^(?:action|chat)_[0-9a-f]{32}$/.test(value)
  )
}

export function isProductInteractionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    utf8Bytes(value) <= 256
  )
}

export function isProductQuestionId(value: unknown): value is string {
  return typeof value === 'string' && /^question_[0-9a-f]{32}$/.test(value)
}

export function decodeProductWorkspace(value: unknown): ProductWorkspace {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (value.state === 'incompatible') {
    if (
      !isExactObject(value, ['displayMessage', 'readOnly', 'state']) ||
      value.readOnly !== true ||
      !isNonEmptyString(value.displayMessage)
    ) {
      throw invalidContract()
    }
    return {
      state: 'incompatible',
      readOnly: true,
      displayMessage: value.displayMessage,
    }
  }
  if (
    value.state !== 'ready' ||
    !isExactObject(value, [
      'confirmedRevision',
      'course',
      'materials',
      'state',
    ]) ||
    !isRevision(value.confirmedRevision) ||
    !isCourseOrNull(value.course) ||
    !Array.isArray(value.materials)
  ) {
    throw invalidContract()
  }
  return {
    state: 'ready',
    confirmedRevision: value.confirmedRevision,
    course: value.course,
    materials: value.materials.map(decodeProductRawMaterial),
  }
}

function decodeProductAccountReadiness(
  value: unknown,
): ProductAccountReadiness {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (value.state === 'ready') {
    if (!isExactObject(value, ['state'])) throw invalidContract()
    return { state: 'ready' }
  }
  if (
    (value.state !== 'not_ready' && value.state !== 'unavailable') ||
    !isExactObject(value, ['displayMessage', 'state']) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  return { state: value.state, displayMessage: value.displayMessage }
}

function decodeProductSettledHistory(value: unknown): ProductSettledHistory {
  if (
    !isExactObject(value, [
      'assignments',
      'modelingRuns',
      'statePatches',
      'userConfirmations',
    ]) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.statePatches) ||
    !Array.isArray(value.userConfirmations) ||
    !Array.isArray(value.modelingRuns)
  ) {
    throw invalidContract()
  }
  return {
    assignments: value.assignments.map(decodeProductAssignment),
    statePatches: value.statePatches.map(decodeProductSettledStatePatch),
    userConfirmations: value.userConfirmations.map(
      decodeProductUserConfirmation,
    ),
    modelingRuns: value.modelingRuns.map(decodeProductSettledModelingRun),
  }
}

function decodeProductAssignment(value: unknown): ProductAssignment {
  if (
    !isExactObject(value, [
      'courseId',
      'dueAt',
      'evidence',
      'id',
      'submissionMethod',
      'title',
    ]) ||
    !isAssignmentId(value.id) ||
    !isCourseId(value.courseId) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.dueAt) ||
    !isNonEmptyString(value.submissionMethod) ||
    !Array.isArray(value.evidence)
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    courseId: value.courseId,
    title: value.title,
    dueAt: value.dueAt,
    submissionMethod: value.submissionMethod,
    evidence: value.evidence.map(decodeProductEvidenceRef),
  }
}

function decodeProductEvidenceRef(value: unknown): ProductEvidenceRef {
  if (
    !isExactObject(value, ['digest', 'field', 'materialId', 'quote']) ||
    !isAssignmentField(value.field) ||
    !isMaterialId(value.materialId) ||
    !isDigest(value.digest) ||
    typeof value.quote !== 'string'
  ) {
    throw invalidContract()
  }
  return {
    field: value.field,
    materialId: value.materialId,
    digest: value.digest,
    quote: value.quote,
  }
}

function decodeProductSettledStatePatch(
  value: unknown,
): ProductSettledStatePatch {
  if (
    !isExactObject(value, [
      'applyOutcome',
      'baseRevision',
      'courseId',
      'createdAt',
      'id',
      'status',
    ]) ||
    !isPatchId(value.id) ||
    !isCourseId(value.courseId) ||
    !isRevision(value.baseRevision) ||
    (value.status !== 'superseded' &&
      value.status !== 'applied' &&
      value.status !== 'rejected' &&
      value.status !== 'interrupted') ||
    !isTimestamp(value.createdAt)
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    courseId: value.courseId,
    baseRevision: value.baseRevision,
    status: value.status,
    createdAt: value.createdAt,
    applyOutcome: decodeProductApplyOutcome(value.applyOutcome),
  }
}

function decodeProductApplyOutcome(
  value: unknown,
): ProductSettledStatePatch['applyOutcome'] {
  if (value === null) return null
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw invalidContract()
  }
  if (
    value.type === 'applied' &&
    isExactObject(value, ['assignmentId', 'resultingRevision', 'type']) &&
    isAssignmentId(value.assignmentId) &&
    isRevision(value.resultingRevision)
  ) {
    return {
      type: 'applied',
      assignmentId: value.assignmentId,
      resultingRevision: value.resultingRevision,
    }
  }
  if (
    value.type === 'not_applied' &&
    isExactObject(value, ['revision', 'type']) &&
    isRevision(value.revision)
  ) {
    return { type: 'not_applied', revision: value.revision }
  }
  throw invalidContract()
}

function decodeProductUserConfirmation(
  value: unknown,
): ProductUserConfirmation {
  if (
    !isExactObject(value, [
      'assignmentId',
      'decision',
      'id',
      'outcome',
      'patchId',
      'resultingRevision',
      'settledAt',
    ]) ||
    !isConfirmationId(value.id) ||
    !isPatchId(value.patchId) ||
    (value.decision !== 'accepted' && value.decision !== 'rejected') ||
    !isTimestamp(value.settledAt) ||
    (value.assignmentId !== null && !isAssignmentId(value.assignmentId)) ||
    (value.resultingRevision !== null &&
      !isRevision(value.resultingRevision)) ||
    (value.outcome !== 'applied' && value.outcome !== 'not_applied')
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    patchId: value.patchId,
    decision: value.decision,
    settledAt: value.settledAt,
    assignmentId: value.assignmentId,
    resultingRevision: value.resultingRevision,
    outcome: value.outcome,
  }
}

function decodeProductSettledModelingRun(
  value: unknown,
): ProductSettledModelingRun {
  if (
    !isExactObject(value, [
      'actionId',
      'courseId',
      'createdAt',
      'id',
      'recipe',
      'settledAt',
      'sources',
      'status',
      'updatedAt',
      'validationOutcome',
    ]) ||
    !isRunId(value.id) ||
    !isActionId(value.actionId) ||
    !isCourseId(value.courseId) ||
    !isRecipe(value.recipe) ||
    !Array.isArray(value.sources) ||
    !value.sources.every(isModelingSource) ||
    !isSettledRunStatus(value.status) ||
    !isValidationOutcome(value.validationOutcome) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isTimestamp(value.settledAt)
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    actionId: value.actionId,
    courseId: value.courseId,
    recipe: value.recipe,
    sources: value.sources,
    status: value.status,
    validationOutcome: value.validationOutcome,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    settledAt: value.settledAt,
  }
}

function decodeProductRawMaterial(value: unknown): ProductRawMaterial {
  if (
    !isExactObject(value, ['digest', 'id', 'mediaType', 'relativePath', 'size']) ||
    !hasValidMaterialMetadata(value, 'id')
  ) {
    throw invalidContract()
  }
  return {
    id: value.id as string,
    relativePath: value.relativePath as string,
    digest: value.digest as string,
    mediaType: 'text/plain; charset=utf-8',
    size: value.size as number,
  }
}

function isRecipe(
  value: unknown,
): value is ProductSettledModelingRun['recipe'] {
  return (
    isExactObject(value, ['name', 'requestedSkillName', 'version']) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.version) &&
    isNonEmptyString(value.requestedSkillName)
  )
}

function isModelingSource(
  value: unknown,
): value is ProductSettledModelingRun['sources'][number] {
  return (
    isExactObject(value, ['digest', 'materialId']) &&
    isMaterialId(value.materialId) &&
    isDigest(value.digest)
  )
}

function isSettledRunStatus(
  value: unknown,
): value is ProductSettledModelingRun['status'] {
  return (
    value === 'not_accepted' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isValidationOutcome(
  value: unknown,
): value is ProductSettledModelingRun['validationOutcome'] {
  return value === 'passed' || value === 'failed' || value === 'unknown'
}

function hasValidMaterialMetadata(
  value: Record<string, unknown>,
  idKey: 'id' | 'materialId',
): boolean {
  return (
    isMaterialId(value[idKey]) &&
    typeof value.relativePath === 'string' &&
    isSafeRelativePath(value.relativePath) &&
    isDigest(value.digest) &&
    value.mediaType === 'text/plain; charset=utf-8' &&
    Number.isSafeInteger(value.size) &&
    Number(value.size) >= 0
  )
}

function isCourseOrNull(
  value: unknown,
): value is ReadyProductWorkspace['course'] {
  return (
    value === null ||
    (isExactObject(value, ['displayName', 'id']) &&
      isCourseId(value.id) &&
      typeof value.displayName === 'string' &&
      value.displayName.trim().length > 0)
  )
}

function isAssignmentField(
  value: unknown,
): value is ProductEvidenceRef['field'] {
  return (
    value === 'title' || value === 'dueAt' || value === 'submissionMethod'
  )
}

function isMaterialId(value: unknown): value is string {
  return typeof value === 'string' && /^material_[0-9a-f]{32}$/.test(value)
}

function isCourseId(value: unknown): value is string {
  return typeof value === 'string' && /^course_[0-9a-f]{32}$/.test(value)
}

function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && /^assignment_[0-9a-f]{32}$/.test(value)
}

function isPatchId(value: unknown): value is string {
  return typeof value === 'string' && /^patch_[0-9a-f]{32}$/.test(value)
}

function isConfirmationId(value: unknown): value is string {
  return typeof value === 'string' && /^confirmation_[0-9a-f]{32}$/.test(value)
}

function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^run_[0-9a-f]{32}$/.test(value)
}

function isActionId(value: unknown): value is string {
  return typeof value === 'string' && /^action_[0-9a-f]{32}$/.test(value)
}

function isDecisionKey(value: unknown): value is string {
  return typeof value === 'string' && /^decision_[0-9a-f]{32}$/.test(value)
}

function isDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.startsWith('../') &&
    value !== '..' &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
  )
}

function isMaterialSelection(
  value: unknown,
  minimum: number,
  maximum: number,
): value is ProductMaterialSelection[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every(
      (material) =>
        isExactObject(material, ['digest', 'id']) &&
        isMaterialId(material.id) &&
        isDigest(material.digest),
    ) &&
    new Set(value.map((material) => material.id)).size === value.length
  )
}

function requireExact(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): void {
  if (!isExactObject(value, expectedKeys)) throw invalidContract()
}

function requireMcpFrameBase(value: Record<string, unknown>): void {
  if (
    !isActivityId(value.activityId) ||
    value.tool !== 'propose_state_patch'
  ) {
    throw invalidContract()
  }
}

function decodeProductQuestions(value: unknown): readonly ProductQuestion[] {
  if (!Array.isArray(value)) throw invalidContract()
  return value.map(decodeProductQuestion)
}

function decodeProductTerminalFrame(value: Record<string, unknown>): void {
  const hasFailureCode = Object.hasOwn(value, 'failureCode')
  if (value.operationId?.toString().startsWith('action_')) {
    requireExact(value, [
      ...(hasFailureCode ? ['failureCode'] : []),
      'operationId',
      'runId',
      'status',
      'type',
      'validationOutcome',
    ])
    if (
      !isRunId(value.runId) ||
      !isAssignmentTerminalStatus(value.status) ||
      !isValidationOutcome(value.validationOutcome)
    ) {
      throw invalidContract()
    }
  } else {
    requireExact(value, [
      ...(hasFailureCode ? ['failureCode'] : []),
      'operationId',
      'status',
      'type',
    ])
    if (!isChatTerminalStatus(value.status)) throw invalidContract()
  }
  if (hasFailureCode && !isNonEmptyString(value.failureCode)) {
    throw invalidContract()
  }
}

function isProductPatchEvidence(
  value: unknown,
): value is ProductStatePatch['evidence'][number] {
  return (
    isExactObject(value, ['digest', 'field', 'quote', 'rawMaterialId']) &&
    isAssignmentField(value.field) &&
    isMaterialId(value.rawMaterialId) &&
    isDigest(value.digest) &&
    isProductText(value.quote)
  )
}

function isProductPatchStatus(
  value: unknown,
): value is ProductStatePatch['status'] {
  return (
    value === 'pending' ||
    value === 'superseded' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'interrupted'
  )
}

function isAssignmentTerminalStatus(
  value: unknown,
): value is AssignmentOperationSettlement['status'] {
  return (
    value === 'not_accepted' ||
    value === 'acceptance_unknown' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isChatTerminalStatus(
  value: unknown,
): value is ChatOperationSettlement['status'] {
  return (
    value === 'not_accepted' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isProductResolution(
  value: unknown,
): value is 'answered' | 'cancelled' {
  return value === 'answered' || value === 'cancelled'
}

function isProductReviewOutcome(
  value: unknown,
): value is 'accepted' | 'revised' | 'rejected' | 'cancelled' {
  return (
    value === 'accepted' ||
    value === 'revised' ||
    value === 'rejected' ||
    value === 'cancelled'
  )
}

function isActivityId(value: unknown): value is string {
  return typeof value === 'string' && /^activity_[0-9a-f]{32}$/.test(value)
}

function isPublicQuestionId(value: unknown): value is string {
  return value === 'assignment_review_decision' || isProductQuestionId(value)
}

function isProductText(value: unknown): value is string {
  return typeof value === 'string' && utf8Bytes(value) <= 128 * 1024
}

function hasValidJsonEnvelope(value: unknown): boolean {
  try {
    return utf8Bytes(JSON.stringify(value)) <= PRODUCT_JSON_ENVELOPE_MAX_BYTES
  } catch {
    return false
  }
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function invalidContract(): ProductContractError {
  return new ProductContractError()
}

function isExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
