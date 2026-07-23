/// <reference types="node" />

import path from 'node:path'

const materialMediaType = 'text/plain; charset=utf-8'
const materialFileMaxBytes = 1024 * 1024
const textMaxBytes = 1024
const metadataMaxBytes = 512
const proposalSummaryMaxBytes = 2 * 1024
const evidenceQuoteMaxBytes = 16 * 1024
const actionPathMaxBytes = 16 * 1024

export class SemesterWorkspaceV2CodecError extends TypeError {
  constructor() {
    super('The current SemesterWorkspace v2 aggregate is invalid.')
    this.name = 'SemesterWorkspaceV2CodecError'
  }
}

export function isDecoderValidCurrentV2(value: unknown): boolean {
  try {
    decodeCurrentSemesterWorkspaceV2(value)
    return true
  } catch (error) {
    if (error instanceof SemesterWorkspaceV2CodecError) return false
    throw error
  }
}

export function decodeCurrentSemesterWorkspaceV2(
  value: unknown,
): CurrentSemesterWorkspaceV2 {
  if (
    !isExactRecord(value, [
      'assignments',
      'confirmedRevision',
      'course',
      'executionGuard',
      'formatVersion',
      'materials',
      'modelingRuns',
      'sourceRecovery',
      'statePatches',
      'userConfirmations',
      'workspaceId',
    ]) ||
    value.formatVersion !== 2 ||
    !isId(value.workspaceId, 'workspace') ||
    !isNonNegativeSafeInteger(value.confirmedRevision) ||
    !isCourseOrNull(value.course) ||
    !isMaterials(value.materials) ||
    !isAssignments(value.assignments) ||
    !isStatePatches(value.statePatches) ||
    !isConfirmations(value.userConfirmations) ||
    !isModelingRuns(value.modelingRuns) ||
    !isExecutionGuardOrNull(value.executionGuard) ||
    !isSourceRecoveryOrNull(value.sourceRecovery)
  ) {
    throw new SemesterWorkspaceV2CodecError()
  }
  const decoded = value as CurrentSemesterWorkspaceV2
  if (!hasCurrentV2Invariants(decoded)) {
    throw new SemesterWorkspaceV2CodecError()
  }
  return decoded
}

export type CurrentSemesterWorkspaceV2 = Record<string, unknown> & {
  readonly workspaceId: string
  readonly confirmedRevision: number
  readonly course: Record<string, unknown> | null
  readonly materials: readonly Record<string, unknown>[]
  readonly assignments: readonly Record<string, unknown>[]
  readonly statePatches: readonly Record<string, unknown>[]
  readonly userConfirmations: readonly Record<string, unknown>[]
  readonly modelingRuns: readonly Record<string, unknown>[]
  readonly executionGuard: Record<string, unknown> | null
  readonly sourceRecovery: Record<string, unknown> | null
}

function isCourseOrNull(value: unknown): boolean {
  return (
    value === null ||
    (isExactRecord(value, ['displayName', 'id']) &&
      isId(value.id, 'course') &&
      isBoundedMeaningfulText(value.displayName, metadataMaxBytes))
  )
}

function isMaterials(
  value: unknown,
): value is readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  const paths = new Set<string>()
  for (const material of value) {
    if (
      !isExactRecord(material, [
        'digest',
        'id',
        'mediaType',
        'relativePath',
        'size',
      ]) ||
      !isId(material.id, 'material') ||
      !isSafeMaterialPath(material.relativePath) ||
      !isSha256(material.digest) ||
      material.mediaType !== materialMediaType ||
      !isNonNegativeSafeInteger(material.size) ||
      Number(material.size) > materialFileMaxBytes ||
      ids.has(material.id) ||
      paths.has(material.relativePath as string)
    ) {
      return false
    }
    ids.add(material.id)
    paths.add(material.relativePath as string)
  }
  return true
}

function isAssignments(
  value: unknown,
): value is readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  for (const assignment of value) {
    if (
      !isExactRecord(assignment, [
        'courseId',
        'dueAt',
        'evidence',
        'id',
        'submissionMethod',
        'title',
      ]) ||
      !isId(assignment.id, 'assignment') ||
      !isId(assignment.courseId, 'course') ||
      !isBoundedMeaningfulText(assignment.title, textMaxBytes) ||
      !isExplicitOffsetRfc3339(assignment.dueAt) ||
      !isBoundedMeaningfulText(assignment.submissionMethod, textMaxBytes) ||
      !isEvidence(assignment.evidence) ||
      ids.has(assignment.id)
    ) {
      return false
    }
    ids.add(assignment.id)
  }
  return true
}

function isStatePatches(
  value: unknown,
): value is readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  const requestKeys = new Set<string>()
  for (const patch of value) {
    if (
      !isExactRecord(
        patch,
        [
          'applyOutcome',
          'baseRevision',
          'canonicalPayload',
          'changes',
          'courseId',
          'createdAt',
          'evidence',
          'id',
          'requestKey',
          'status',
          'summary',
          'workspaceId',
        ],
        ['guardOperationId', 'origin'],
      ) ||
      !isId(patch.id, 'patch') ||
      !isId(patch.workspaceId, 'workspace') ||
      !isId(patch.courseId, 'course') ||
      !isId(patch.requestKey, 'proposal') ||
      !isNonNegativeSafeInteger(patch.baseRevision) ||
      !isBoundedMeaningfulText(patch.summary, proposalSummaryMaxBytes) ||
      !isAssignmentUpsert(patch.changes) ||
      !isEvidence(patch.evidence) ||
      (patch.origin !== undefined &&
        !isBoundedMeaningfulText(patch.origin, proposalSummaryMaxBytes)) ||
      (patch.guardOperationId !== undefined &&
        !isProductOperationId(patch.guardOperationId)) ||
      ![
        'pending',
        'superseded',
        'applied',
        'rejected',
        'interrupted',
      ].includes(patch.status as string) ||
      !isIsoInstant(patch.createdAt) ||
      !isPatchApplyOutcome(patch.applyOutcome) ||
      typeof patch.canonicalPayload !== 'string' ||
      Buffer.byteLength(patch.canonicalPayload, 'utf8') >
        materialFileMaxBytes ||
      ids.has(patch.id) ||
      requestKeys.has(patch.requestKey as string)
    ) {
      return false
    }
    ids.add(patch.id)
    requestKeys.add(patch.requestKey as string)
  }
  return true
}

function isConfirmations(
  value: unknown,
): value is readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  const decisionKeys = new Set<string>()
  for (const confirmation of value) {
    if (!isRecord(confirmation)) return false
    const accepted = confirmation.decision === 'accepted'
    if (
      !isExactRecord(
        confirmation,
        accepted
          ? [
              'assignmentId',
              'decision',
              'decisionKey',
              'id',
              'outcome',
              'patchId',
              'resultingRevision',
              'settledAt',
            ]
          : [
              'decision',
              'decisionKey',
              'id',
              'outcome',
              'patchId',
              'settledAt',
            ],
      ) ||
      !isId(confirmation.id, 'confirmation') ||
      !isId(confirmation.patchId, 'patch') ||
      !isId(confirmation.decisionKey, 'decision') ||
      !isIsoInstant(confirmation.settledAt) ||
      (accepted
        ? confirmation.outcome !== 'applied' ||
          !isId(confirmation.assignmentId, 'assignment') ||
          !isPositiveSafeInteger(confirmation.resultingRevision)
        : confirmation.decision !== 'rejected' ||
          confirmation.outcome !== 'not_applied') ||
      ids.has(confirmation.id) ||
      decisionKeys.has(confirmation.decisionKey as string)
    ) {
      return false
    }
    ids.add(confirmation.id)
    decisionKeys.add(confirmation.decisionKey as string)
  }
  return true
}

function isModelingRuns(
  value: unknown,
): value is readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  const actionIds = new Set<string>()
  for (const run of value) {
    if (
      !isExactRecord(
        run,
        [
          'actionId',
          'argumentsDigest',
          'courseId',
          'createdAt',
          'id',
          'invocationFingerprint',
          'recipeDigest',
          'recipeName',
          'recipeVersion',
          'requestedSkillName',
          'requestedSkillPath',
          'sourceBaseline',
          'status',
          'updatedAt',
          'validationOutcome',
        ],
        [
          'failureCode',
          'nativeCorrelation',
          'recoveryOutcome',
          'retryOfRunId',
          'settledAt',
        ],
      ) ||
      !isId(run.id, 'run') ||
      !isId(run.actionId, 'action') ||
      !isId(run.courseId, 'course') ||
      !isSha256(run.invocationFingerprint) ||
      !isSafeSkillName(run.requestedSkillName) ||
      !isSafeAbsolutePath(run.requestedSkillPath) ||
      !isBoundedMeaningfulText(run.recipeName, metadataMaxBytes) ||
      !isBoundedMeaningfulText(run.recipeVersion, metadataMaxBytes) ||
      !isSha256(run.recipeDigest) ||
      !isSha256(run.argumentsDigest) ||
      !isSourceBaseline(run.sourceBaseline) ||
      ![
        'starting',
        'not_accepted',
        'acceptance_unknown',
        'running',
        'completed',
        'failed',
        'interrupted',
        'unknown',
      ].includes(run.status as string) ||
      !['pending', 'passed', 'failed', 'unknown'].includes(
        run.validationOutcome as string,
      ) ||
      (run.retryOfRunId !== undefined && !isId(run.retryOfRunId, 'run')) ||
      (run.recoveryOutcome !== undefined &&
        !isRecoveryOutcome(run.recoveryOutcome)) ||
      !isIsoInstant(run.createdAt) ||
      !isIsoInstant(run.updatedAt) ||
      (run.nativeCorrelation !== undefined &&
        !isNativeCorrelation(run.nativeCorrelation)) ||
      (run.failureCode !== undefined &&
        !isSafeFailureCode(run.failureCode)) ||
      (run.settledAt !== undefined && !isIsoInstant(run.settledAt)) ||
      ids.has(run.id) ||
      actionIds.has(run.actionId as string)
    ) {
      return false
    }
    ids.add(run.id)
    actionIds.add(run.actionId as string)
  }
  return true
}

function isExecutionGuardOrNull(value: unknown): boolean {
  if (value === null) return true
  if (
    !isExactRecord(
      value,
      [
        'confirmedRevision',
        'createdAt',
        'kind',
        'materials',
        'operationId',
        'scratchRelativePath',
        'selectedMaterials',
        'state',
      ],
      ['nativeCorrelation', 'runId'],
    ) ||
    !isProductOperationId(value.operationId) ||
    (value.kind !== 'assignment_action' && value.kind !== 'product_chat') ||
    !isNonNegativeSafeInteger(value.confirmedRevision) ||
    !isMaterials(value.materials) ||
    !isGuardSources(value.selectedMaterials) ||
    value.scratchRelativePath !==
      `.ay-ple/runtime-scratch/${value.operationId as string}` ||
    !['active', 'cleanup_required', 'recovery_required'].includes(
      value.state as string,
    ) ||
    !isIsoInstant(value.createdAt) ||
    (value.nativeCorrelation !== undefined &&
      !isNativeCorrelation(value.nativeCorrelation))
  ) {
    return false
  }
  return value.kind === 'assignment_action'
    ? isId(value.operationId, 'action') && isId(value.runId, 'run')
    : isId(value.operationId, 'chat') && value.runId === undefined
}

function isSourceRecoveryOrNull(value: unknown): boolean {
  return (
    value === null ||
    (isExecutionGuardOrNull(value) &&
      isRecord(value) &&
      value.state === 'recovery_required')
  )
}

function hasCurrentV2Invariants(
  store: CurrentSemesterWorkspaceV2,
): boolean {
  if (
    store.sourceRecovery &&
    !sourcesMatchMaterials(
      store.sourceRecovery.selectedMaterials,
      store.sourceRecovery.materials,
    )
  ) {
    return false
  }
  const courseId = store.course?.id
  if (typeof courseId !== 'string') {
    return (
      store.confirmedRevision === 0 &&
      store.assignments.length === 0 &&
      store.statePatches.length === 0 &&
      store.userConfirmations.length === 0 &&
      store.modelingRuns.length === 0 &&
      store.executionGuard === null
    )
  }
  if (
    store.assignments.some((assignment) => assignment.courseId !== courseId)
  ) {
    return false
  }

  const patches = new Map<string, Record<string, unknown>>()
  for (const patch of store.statePatches) {
    if (
      patch.workspaceId !== store.workspaceId ||
      patch.courseId !== courseId ||
      Number(patch.baseRevision) > store.confirmedRevision ||
      !hasPatchLifecycle(patch, store.confirmedRevision) ||
      !isCanonicallyOrderedEvidence(patch.evidence) ||
      patch.canonicalPayload !== canonicalPatchPayload(patch)
    ) {
      return false
    }
    patches.set(patch.id as string, patch)
  }

  const confirmations = new Map<string, Record<string, unknown>>()
  const acceptedRevisions = new Set<number>()
  for (const confirmation of store.userConfirmations) {
    if (confirmations.has(confirmation.patchId as string)) return false
    const patch = patches.get(confirmation.patchId as string)
    if (!patch) return false
    if (confirmation.decision === 'accepted') {
      const outcome = patch.applyOutcome as Record<string, unknown>
      if (
        patch.status !== 'applied' ||
        outcome?.type !== 'applied' ||
        outcome.assignmentId !== confirmation.assignmentId ||
        ((patch.changes as Record<string, unknown>).assignmentId !==
          undefined &&
          (patch.changes as Record<string, unknown>).assignmentId !==
            confirmation.assignmentId) ||
        outcome.resultingRevision !== confirmation.resultingRevision ||
        confirmation.resultingRevision !== Number(patch.baseRevision) + 1 ||
        Number(confirmation.resultingRevision) > store.confirmedRevision ||
        acceptedRevisions.has(Number(confirmation.resultingRevision)) ||
        !store.assignments.some(
          (assignment) => assignment.id === confirmation.assignmentId,
        )
      ) {
        return false
      }
      acceptedRevisions.add(Number(confirmation.resultingRevision))
    } else {
      const outcome = patch.applyOutcome as Record<string, unknown>
      if (
        patch.status !== 'rejected' ||
        outcome?.type !== 'not_applied' ||
        outcome.revision !== patch.baseRevision
      ) {
        return false
      }
    }
    confirmations.set(confirmation.patchId as string, confirmation)
  }
  if (acceptedRevisions.size !== store.confirmedRevision) return false

  const runs = new Map<string, Record<string, unknown>>()
  const retried = new Set<string>()
  for (const run of store.modelingRuns) {
    const retrySource =
      run.retryOfRunId === undefined
        ? undefined
        : runs.get(run.retryOfRunId as string)
    const settledDecisionPatches = store.statePatches.filter(
      (patch) =>
        patch.guardOperationId === run.actionId &&
        (patch.status === 'applied' || patch.status === 'rejected'),
    )
    const continuationLoss = continuationLossForSettledDecision(
      run,
      store.statePatches,
      store.userConfirmations,
    )
    if (
      run.courseId !== courseId ||
      !hasRunLifecycle(run) ||
      (run.retryOfRunId !== undefined &&
        (!retrySource ||
          retried.has(run.retryOfRunId as string) ||
          !isRetryableRun(retrySource) ||
          !hasSameInvocation(retrySource, run))) ||
      (isRecord(run.recoveryOutcome) &&
        run.recoveryOutcome.outcome === 'continuation_lost' &&
        (Number(run.recoveryOutcome.confirmedRevision) >
          store.confirmedRevision ||
          continuationLoss?.confirmedRevision !==
            run.recoveryOutcome.confirmedRevision)) ||
      (isRecord(run.recoveryOutcome) &&
        (run.recoveryOutcome.outcome === 'interrupted' ||
          run.recoveryOutcome.outcome === 'unknown') &&
        (run.recoveryOutcome.outcome !== run.status ||
          settledDecisionPatches.length > 0))
    ) {
      return false
    }
    if (run.retryOfRunId !== undefined) {
      retried.add(run.retryOfRunId as string)
    }
    runs.set(run.id as string, run)
  }

  const unfinished = store.modelingRuns.filter((run) =>
    ['starting', 'running', 'acceptance_unknown'].includes(
      run.status as string,
    ),
  )
  if (unfinished.length > 1) return false
  if (store.executionGuard) {
    if (
      store.executionGuard.confirmedRevision !== store.confirmedRevision ||
      JSON.stringify(store.executionGuard.materials) !==
        JSON.stringify(store.materials) ||
      !sourcesMatchMaterials(
        store.executionGuard.selectedMaterials,
        store.materials,
      )
    ) {
      return false
    }
    if (store.executionGuard.kind === 'assignment_action') {
      const run = runs.get(store.executionGuard.runId as string)
      if (
        !run ||
        run.actionId !== store.executionGuard.operationId ||
        !hasSameSourceBaseline(
          run.sourceBaseline,
          store.executionGuard.selectedMaterials,
        ) ||
        JSON.stringify(run.nativeCorrelation) !==
          JSON.stringify(store.executionGuard.nativeCorrelation) ||
        (unfinished.length === 1 && unfinished[0]?.id !== run.id)
      ) {
        return false
      }
    } else if (unfinished.length > 0) {
      return false
    }
  } else if (unfinished.length > 0) {
    return false
  }

  for (const patch of store.statePatches) {
    const confirmed = confirmations.has(patch.id as string)
    if (
      ((patch.status === 'applied' || patch.status === 'rejected') &&
        !confirmed) ||
      ((patch.status === 'pending' ||
        patch.status === 'superseded' ||
        patch.status === 'interrupted') &&
        confirmed)
    ) {
      return false
    }
  }

  for (const assignment of store.assignments) {
    const latest = store.userConfirmations
      .filter(
        (confirmation) =>
          confirmation.decision === 'accepted' &&
          confirmation.assignmentId === assignment.id,
      )
      .sort(
        (left, right) =>
          Number(right.resultingRevision) - Number(left.resultingRevision),
      )[0]
    if (!latest) return false
    const patch = patches.get(latest.patchId as string)
    const changes = patch?.changes as Record<string, unknown> | undefined
    const values = changes?.values as Record<string, unknown> | undefined
    if (
      values?.title !== assignment.title ||
      values?.dueAt !== assignment.dueAt ||
      values?.submissionMethod !== assignment.submissionMethod ||
      JSON.stringify(patch?.evidence) !== JSON.stringify(assignment.evidence)
    ) {
      return false
    }
  }
  return true
}

function isAssignmentUpsert(value: unknown): boolean {
  return (
    isExactRecord(value, ['operation', 'values'], ['assignmentId']) &&
    value.operation === 'assignment.upsert' &&
    (value.assignmentId === undefined ||
      isId(value.assignmentId, 'assignment')) &&
    isExactRecord(value.values, ['dueAt', 'submissionMethod', 'title']) &&
    isBoundedMeaningfulText(value.values.title, textMaxBytes) &&
    isExplicitOffsetRfc3339(value.values.dueAt) &&
    isBoundedMeaningfulText(value.values.submissionMethod, textMaxBytes)
  )
}

function isEvidence(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 64 &&
    value.every(
      (evidence) =>
        isExactRecord(evidence, [
          'digest',
          'field',
          'quote',
          'rawMaterialId',
        ]) &&
        ['title', 'dueAt', 'submissionMethod'].includes(
          evidence.field as string,
        ) &&
        isId(evidence.rawMaterialId, 'material') &&
        isSha256(evidence.digest) &&
        isBoundedMeaningfulText(evidence.quote, evidenceQuoteMaxBytes),
    ) &&
    ['title', 'dueAt', 'submissionMethod'].every((field) =>
      value.some(
        (evidence) => isRecord(evidence) && evidence.field === field,
      ),
    )
  )
}

function isPatchApplyOutcome(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      ((value.type === 'applied' &&
        isExactRecord(value, ['assignmentId', 'resultingRevision', 'type']) &&
        isId(value.assignmentId, 'assignment') &&
        isPositiveSafeInteger(value.resultingRevision)) ||
        (value.type === 'not_applied' &&
          isExactRecord(value, ['revision', 'type']) &&
          isNonNegativeSafeInteger(value.revision))))
  )
}

function isSourceBaseline(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(isSource) &&
    value[0]?.rawMaterialId !== value[1]?.rawMaterialId
  )
}

function isGuardSources(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= 2 &&
    value.every(isSource) &&
    new Set(value.map((source) => source.rawMaterialId)).size === value.length
  )
}

function isSource(value: unknown): value is Record<string, unknown> {
  return (
    isExactRecord(value, ['digest', 'rawMaterialId']) &&
    isId(value.rawMaterialId, 'material') &&
    isSha256(value.digest)
  )
}

function isRecoveryOutcome(value: unknown): boolean {
  return (
    isRecord(value) &&
    (((value.outcome === 'interrupted' || value.outcome === 'unknown') &&
      isExactRecord(value, ['outcome'])) ||
      (value.outcome === 'continuation_lost' &&
        isExactRecord(value, ['confirmedRevision', 'outcome']) &&
        isNonNegativeSafeInteger(value.confirmedRevision)))
  )
}

function isNativeCorrelation(value: unknown): boolean {
  return (
    isExactRecord(value, ['threadId', 'turnId']) &&
    isOpaqueIdentity(value.threadId) &&
    isOpaqueIdentity(value.turnId)
  )
}

function hasPatchLifecycle(
  patch: Record<string, unknown>,
  confirmedRevision: number,
): boolean {
  const outcome = patch.applyOutcome as Record<string, unknown> | null
  if (patch.status === 'pending') return outcome === null
  if (patch.status === 'applied') {
    return (
      outcome?.type === 'applied' &&
      Number(outcome.resultingRevision) <= confirmedRevision
    )
  }
  if (patch.status === 'rejected') {
    return (
      outcome?.type === 'not_applied' &&
      Number(outcome.revision) <= confirmedRevision
    )
  }
  return (
    outcome === null ||
    (outcome.type === 'not_applied' &&
      Number(outcome.revision) <= confirmedRevision)
  )
}

function hasRunLifecycle(run: Record<string, unknown>): boolean {
  if ((run.updatedAt as string) < (run.createdAt as string)) return false
  if (run.status === 'starting') {
    return (
      run.validationOutcome === 'pending' &&
      run.nativeCorrelation === undefined &&
      run.failureCode === undefined &&
      run.settledAt === undefined
    )
  }
  if (run.status === 'running') {
    return (
      run.validationOutcome === 'pending' &&
      run.nativeCorrelation !== undefined &&
      run.failureCode === undefined &&
      run.settledAt === undefined
    )
  }
  return (
    run.validationOutcome !== 'pending' &&
    run.settledAt !== undefined &&
    run.settledAt === run.updatedAt &&
    (run.status !== 'not_accepted' || run.nativeCorrelation === undefined)
  )
}

function isRetryableRun(run: Record<string, unknown>): boolean {
  return (
    (run.status === 'interrupted' || run.status === 'unknown') &&
    isRecord(run.recoveryOutcome) &&
    run.recoveryOutcome.outcome === run.status
  )
}

function hasSameInvocation(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const leftBaseline = left.sourceBaseline
  const rightBaseline = right.sourceBaseline
  return [
    'courseId',
    'requestedSkillName',
    'requestedSkillPath',
    'recipeName',
    'recipeVersion',
    'recipeDigest',
    'argumentsDigest',
  ].every((key) => left[key] === right[key]) &&
    hasSameSourceBaseline(leftBaseline, rightBaseline)
}

function hasSameSourceBaseline(
  left: unknown,
  right: unknown,
): boolean {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((source, index) => {
      const other = right[index]
      return (
        isRecord(source) &&
        isRecord(other) &&
        source.rawMaterialId === other.rawMaterialId &&
        source.digest === other.digest
      )
    })
  )
}

function sourcesMatchMaterials(
  sources: unknown,
  materials: unknown,
): boolean {
  if (!Array.isArray(sources) || !Array.isArray(materials)) return false
  return sources.every((source) => {
    if (!isRecord(source)) return false
    const material = materials.find(
      (candidate) =>
        isRecord(candidate) && candidate.id === source.rawMaterialId,
    )
    return isRecord(material) && material.digest === source.digest
  })
}

function canonicalPatchPayload(patch: Record<string, unknown>): string {
  const evidence = (patch.evidence as Record<string, unknown>[]).map(
    (candidate) => ({
      field: candidate.field,
      rawMaterialId: candidate.rawMaterialId,
      digest: candidate.digest,
      quote: candidate.quote,
    }),
  )
  evidence.sort(compareEvidence)
  const changes = patch.changes as Record<string, unknown>
  const values = changes.values as Record<string, unknown>
  return JSON.stringify({
    requestKey: patch.requestKey,
    workspaceId: patch.workspaceId,
    courseId: patch.courseId,
    baseRevision: patch.baseRevision,
    summary: patch.summary,
    changes: {
      operation: 'assignment.upsert',
      ...(changes.assignmentId === undefined
        ? {}
        : { assignmentId: changes.assignmentId }),
      values: {
        title: values.title,
        dueAt: values.dueAt,
        submissionMethod: values.submissionMethod,
      },
    },
    evidence,
    ...(patch.origin === undefined ? {} : { origin: patch.origin }),
  })
}

function continuationLossForSettledDecision(
  run: Record<string, unknown>,
  patches: readonly Record<string, unknown>[],
  confirmations: readonly Record<string, unknown>[],
): { readonly confirmedRevision: number } | undefined {
  const settled = patches.filter(
    (patch) =>
      patch.guardOperationId === run.actionId &&
      (patch.status === 'applied' || patch.status === 'rejected'),
  )
  if (settled.length !== 1) return undefined
  const patch = settled[0]!
  const confirmation = confirmations.find(
    (candidate) => candidate.patchId === patch.id,
  )
  const outcome = patch.applyOutcome as Record<string, unknown> | null
  if (
    confirmation &&
    patch.status === 'applied' &&
    outcome?.type === 'applied' &&
    confirmation.decision === 'accepted' &&
    confirmation.resultingRevision === outcome.resultingRevision
  ) {
    return { confirmedRevision: Number(confirmation.resultingRevision) }
  }
  if (
    confirmation &&
    patch.status === 'rejected' &&
    confirmation.decision === 'rejected' &&
    outcome?.type === 'not_applied'
  ) {
    return { confirmedRevision: Number(outcome.revision) }
  }
  return undefined
}

function isCanonicallyOrderedEvidence(value: unknown): boolean {
  if (!Array.isArray(value)) return false
  return value.every(
    (candidate, index) =>
      index === 0 ||
      compareEvidence(value[index - 1]!, candidate) <= 0,
  )
}

function compareEvidence(left: unknown, right: unknown): number {
  if (!isRecord(left) || !isRecord(right)) return 0
  for (const key of ['field', 'rawMaterialId', 'digest', 'quote']) {
    const leftValue = String(left[key])
    const rightValue = String(right[key])
    if (leftValue < rightValue) return -1
    if (leftValue > rightValue) return 1
  }
  return 0
}

function isSafeMaterialPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    !path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value &&
    value !== '..' &&
    !value.startsWith('../') &&
    path.posix.extname(value).toLowerCase() === '.txt'
  )
}

function isExplicitOffsetRfc3339(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value,
    )
  if (!match || match[7] === '-00:00') return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = match[7] === 'Z' ? 0 : Number(match[9])
  const offsetMinute = match[7] === 'Z' ? 0 : Number(match[10])
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  )
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isIsoInstant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isSafeAbsolutePath(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    Buffer.byteLength(value, 'utf8') <= actionPathMaxBytes
  )
}

function isSafeSkillName(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[a-z0-9][a-z0-9_-]{0,127}$/.test(value)
  )
}

function isSafeFailureCode(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[a-z][a-z0-9_]{0,127}$/.test(value)
  )
}

function isOpaqueIdentity(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= metadataMaxBytes
  )
}

function isProductOperationId(value: unknown): boolean {
  return isId(value, 'action') || isId(value, 'chat')
}

function isId(value: unknown, prefix: string): value is string {
  return (
    typeof value === 'string' &&
    new RegExp(`^${prefix}_[0-9a-f]{32}$`).test(value)
  )
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isBoundedMeaningfulText(
  value: unknown,
  maxBytes: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= maxBytes
  )
}

function isPositiveSafeInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isNonNegativeSafeInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isExactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  const allowed = new Set([...required, ...optional])
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => allowed.has(key)) &&
    keys.length >= required.length &&
    keys.length <= required.length + optional.length
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
