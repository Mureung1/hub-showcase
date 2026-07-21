import type {
  ModelingRun,
  ModelingRunRecoveryOutcome,
  UserConfirmation,
} from './semester-workspace.js'
import type { PersistedStatePatch } from './semester-workspace-store.js'

export type ModelingInvocationSnapshot = Pick<
  ModelingRun,
  | 'courseId'
  | 'requestedSkillName'
  | 'requestedSkillPath'
  | 'recipeName'
  | 'recipeVersion'
  | 'recipeDigest'
  | 'argumentsDigest'
  | 'sourceBaseline'
>

export function isRetryableModelingRun(run: ModelingRun): boolean {
  return (
    (run.status === 'interrupted' || run.status === 'unknown') &&
    run.recoveryOutcome?.outcome === run.status
  )
}

export function hasSameInvocationSnapshot(
  left: ModelingInvocationSnapshot,
  right: ModelingInvocationSnapshot,
): boolean {
  return (
    left.courseId === right.courseId &&
    left.requestedSkillName === right.requestedSkillName &&
    left.requestedSkillPath === right.requestedSkillPath &&
    left.recipeName === right.recipeName &&
    left.recipeVersion === right.recipeVersion &&
    left.recipeDigest === right.recipeDigest &&
    left.argumentsDigest === right.argumentsDigest &&
    left.sourceBaseline.length === right.sourceBaseline.length &&
    left.sourceBaseline.every(
      (source, index) =>
        source.rawMaterialId === right.sourceBaseline[index]?.rawMaterialId &&
        source.digest === right.sourceBaseline[index]?.digest,
    )
  )
}

export function continuationLossForSettledDecision(
  run: Pick<ModelingRun, 'actionId'>,
  patches: readonly PersistedStatePatch[],
  confirmations: readonly UserConfirmation[],
):
  | Extract<
      ModelingRunRecoveryOutcome,
      { readonly outcome: 'continuation_lost' }
    >
  | undefined {
  const settledPatches = patches.filter(
    (patch) =>
      patch.guardOperationId === run.actionId &&
      (patch.status === 'applied' || patch.status === 'rejected'),
  )
  if (settledPatches.length !== 1) return undefined
  const patch = settledPatches[0]!
  const confirmation = confirmations.find(
    (candidate) => candidate.patchId === patch.id,
  )
  if (!confirmation) return undefined
  if (
    patch.status === 'applied' &&
    patch.applyOutcome?.type === 'applied' &&
    confirmation.decision === 'accepted' &&
    confirmation.resultingRevision === patch.applyOutcome.resultingRevision
  ) {
    return {
      outcome: 'continuation_lost',
      confirmedRevision: confirmation.resultingRevision,
    }
  }
  if (
    patch.status === 'rejected' &&
    confirmation.decision === 'rejected' &&
    patch.applyOutcome?.type === 'not_applied'
  ) {
    return {
      outcome: 'continuation_lost',
      confirmedRevision: patch.applyOutcome.revision,
    }
  }
  return undefined
}
