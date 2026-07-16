import {
  PRODUCT_DEMO_STEP,
  productDemoScenario,
} from './scenario.mjs'

export { PRODUCT_DEMO_STEP }

export const PRODUCT_DEMO_EVENT = Object.freeze({
  TOGGLE_SOURCE: 'toggle-source',
  GO_TO_STEP: 'go-to-step',
  ADVANCE: 'advance',
  SELECT_DOCUMENT: 'select-document',
  SELECT_DOCUMENT_MODE: 'select-document-mode',
  START_REVISION: 'start-revision',
  CANCEL_REVISION: 'cancel-revision',
  SUBMIT_REVISION: 'submit-revision',
  COMPLETE_REVISION: 'complete-revision',
  REJECT_PROPOSAL: 'reject-proposal',
  RESTORE_PROPOSAL: 'restore-proposal',
  RESET: 'reset',
})

const REVISION_PHASE = Object.freeze({
  IDLE: 'idle',
  PROMPTING: 'prompting',
  PENDING: 'pending',
  COMPLETED: 'completed',
})

const emptyEffect = Object.freeze({
  toast: null,
  focus: null,
  syncUrl: false,
  completeRevisionAfterMs: null,
})

function clampStep(step) {
  if (!Number.isFinite(step)) return PRODUCT_DEMO_STEP.SCATTERED
  return Math.min(
    PRODUCT_DEMO_STEP.CONFIRMED,
    Math.max(PRODUCT_DEMO_STEP.SCATTERED, step),
  )
}

function createState(initialStep = PRODUCT_DEMO_STEP.SCATTERED) {
  const step = clampStep(initialStep)
  const canonicalRevision = step === PRODUCT_DEMO_STEP.CONFIRMED

  return {
    step,
    selected: step >= PRODUCT_DEMO_STEP.SELECTED
      ? [...productDemoScenario.targetSources]
      : [],
    proposal: {
      ...productDemoScenario.initialProposal,
      ...(canonicalRevision
        ? { title: productDemoScenario.revision.title }
        : {}),
    },
    activeDocument: productDemoScenario.initialDocument,
    documentMode: productDemoScenario.initialDocumentMode,
    revision: {
      phase: canonicalRevision
        ? REVISION_PHASE.COMPLETED
        : REVISION_PHASE.IDLE,
      request: canonicalRevision ? productDemoScenario.revision.request : null,
    },
    rejected: false,
  }
}

function targetSelectionComplete(state) {
  return productDemoScenario.targetSources.every((source) => (
    state.selected.includes(source)
  ))
}

function selectWorkspaceStatus(step) {
  const statuses = productDemoScenario.workspaceStatuses

  if (step === PRODUCT_DEMO_STEP.CONFIRMED) return statuses.confirmed
  if (step >= PRODUCT_DEMO_STEP.EVIDENCE) return statuses.evidence
  if (step >= PRODUCT_DEMO_STEP.ACTIVITY) return statuses.activity
  if (step === PRODUCT_DEMO_STEP.DELEGATED) return statuses.delegated
  return statuses.selected
}

function selectSourceHint(state, ready) {
  const hints = productDemoScenario.sourceHints

  if (state.step >= PRODUCT_DEMO_STEP.DELEGATED) return hints.working
  if (ready) return hints.ready
  if (state.selected.length === 0) return hints.empty
  return hints.partial
}

function selectProposalMessage(state, accepted) {
  const messages = productDemoScenario.proposalMessages

  if (accepted) return messages.accepted
  if (state.rejected) return messages.rejected
  return messages[state.revision.phase]
}

function revisionInProgress(state) {
  return state.revision.phase === REVISION_PHASE.PROMPTING
    || state.revision.phase === REVISION_PHASE.PENDING
}

function selectView(state) {
  const ready = targetSelectionComplete(state)
  const accepted = state.step === PRODUCT_DEMO_STEP.CONFIRMED
  const evidenceVisible = state.step >= PRODUCT_DEMO_STEP.EVIDENCE
  const workspaceStatus = selectWorkspaceStatus(state.step)

  return {
    step: state.step,
    stepCount: productDemoScenario.steps.length,
    stage: productDemoScenario.steps[state.step - 1],
    sources: {
      selected: [...state.selected],
      ready,
      disabled: state.step >= PRODUCT_DEMO_STEP.DELEGATED,
      organizeDisabled: state.step !== PRODUCT_DEMO_STEP.SELECTED || !ready,
      hint: selectSourceHint(state, ready),
    },
    document: {
      active: state.activeDocument,
      mode: state.documentMode,
      finding: productDemoScenario.documentFindings[state.activeDocument],
    },
    workspace: {
      visible: state.step >= PRODUCT_DEMO_STEP.SELECTED || ready,
      evidenceVisible,
      confirmed: accepted,
      contextStatus: workspaceStatus.context,
      statusMessage: workspaceStatus.message,
    },
    proposal: {
      values: { ...state.proposal },
      revision: {
        phase: state.revision.phase,
        formVisible: state.revision.phase === REVISION_PHASE.PROMPTING,
        request: state.revision.request,
        requestVisible: state.revision.phase === REVISION_PHASE.PENDING
          || state.revision.phase === REVISION_PHASE.COMPLETED,
        pendingVisible: state.revision.phase === REVISION_PHASE.PENDING,
        responseVisible: state.revision.phase === REVISION_PHASE.COMPLETED,
        actionVisible: state.revision.phase === REVISION_PHASE.IDLE,
        response: productDemoScenario.revision.response,
        suggestion: productDemoScenario.revision.request,
      },
      rejected: state.rejected,
      accepted,
      status: accepted
        ? '반영됨'
        : state.revision.phase === REVISION_PHASE.COMPLETED
          ? '수정됨 · 내 확인 필요'
          : '내 확인 필요',
      symbol: accepted ? '✓' : '✦',
      message: selectProposalMessage(state, accepted),
      actionsVisible: !revisionInProgress(state)
        && !state.rejected
        && !accepted,
    },
    chat: {
      emptyVisible: state.step < PRODUCT_DEMO_STEP.DELEGATED,
      runRequestVisible: state.step >= PRODUCT_DEMO_STEP.DELEGATED,
      runRequest: productDemoScenario.workRequest,
      acknowledgementVisible: state.step >= PRODUCT_DEMO_STEP.DELEGATED,
      toolActivityVisible: state.step >= PRODUCT_DEMO_STEP.ACTIVITY,
      evidenceVisible: state.step === PRODUCT_DEMO_STEP.EVIDENCE,
      proposalVisible: state.step >= PRODUCT_DEMO_STEP.REVIEW,
      decisionReceiptVisible: accepted,
      successVisible: accepted,
      composer: {
        enabled: false,
        placeholder: accepted
          ? '확인된 학기 정보에 반영했습니다'
          : '제안 카드에서 AY에게 수정 요청을 보낼 수 있어요',
      },
    },
    confirmedTaskCount: accepted ? 1 : 0,
    navigation: {
      previousDisabled: state.step === PRODUCT_DEMO_STEP.SCATTERED,
      nextDisabled: state.step >= PRODUCT_DEMO_STEP.REVIEW,
      nextLabel: state.step === PRODUCT_DEMO_STEP.REVIEW
        ? '채팅에서 결정'
        : '다음',
    },
  }
}

function createModel(state, effect = emptyEffect) {
  return {
    state,
    view: selectView(state),
    effect: { ...emptyEffect, ...effect },
  }
}

function goToStep(state, nextStep, options = {}) {
  const step = clampStep(nextStep)

  if (
    revisionInProgress(state)
    && step === PRODUCT_DEMO_STEP.CONFIRMED
  ) {
    return createModel(state, {
      toast: productDemoScenario.notices.revisionPending,
    })
  }

  if (
    step === PRODUCT_DEMO_STEP.CONFIRMED
    && state.step !== PRODUCT_DEMO_STEP.CONFIRMED
    && !options.accepted
  ) {
    return createModel(state, {
      toast: productDemoScenario.notices.acceptRequired,
    })
  }

  let selected = [...state.selected]
  if (step === PRODUCT_DEMO_STEP.SCATTERED && !options.preserveSelection) {
    selected = []
  } else if (step >= PRODUCT_DEMO_STEP.SELECTED) {
    selected = [...new Set([
      ...selected,
      ...productDemoScenario.targetSources,
    ])]
  }

  const revision = step === PRODUCT_DEMO_STEP.REVIEW
    ? state.revision
    : revisionInProgress(state)
      ? { phase: REVISION_PHASE.IDLE, request: null }
      : state.revision

  return createModel({
    ...state,
    step,
    selected,
    revision,
    rejected: step === PRODUCT_DEMO_STEP.REVIEW ? state.rejected : false,
  }, { syncUrl: true })
}

function toggleSource(state, source, selected) {
  if (state.step >= PRODUCT_DEMO_STEP.DELEGATED) return createModel(state)

  const nextSelected = selected
    ? [...new Set([...state.selected, source])]
    : state.selected.filter((candidate) => candidate !== source)
  const nextState = { ...state, selected: nextSelected }
  const ready = targetSelectionComplete(nextState)

  if (state.step === PRODUCT_DEMO_STEP.SELECTED && !ready) {
    nextState.step = PRODUCT_DEMO_STEP.SCATTERED
  } else if (state.step === PRODUCT_DEMO_STEP.SCATTERED && ready) {
    nextState.step = PRODUCT_DEMO_STEP.SELECTED
  }

  return createModel(nextState, {
    syncUrl: nextState.step !== state.step,
  })
}

function advance(state) {
  if (
    state.step === PRODUCT_DEMO_STEP.REVIEW
    && revisionInProgress(state)
  ) {
    return createModel(state, {
      toast: productDemoScenario.notices.revisionPending,
    })
  }

  if (state.step === PRODUCT_DEMO_STEP.REVIEW && state.rejected) {
    return createModel(state, {
      toast: productDemoScenario.notices.rejected,
    })
  }

  if (state.step === PRODUCT_DEMO_STEP.REVIEW) {
    return createModel(state, {
      toast: productDemoScenario.notices.reviewPending,
    })
  }

  return goToStep(state, state.step + 1)
}

function startRevision(state) {
  const available = state.step === PRODUCT_DEMO_STEP.REVIEW
    && !state.rejected
    && state.revision.phase === REVISION_PHASE.IDLE

  if (!available) {
    return createModel(state, {
      toast: productDemoScenario.notices.revisionUnavailable,
    })
  }

  return createModel({
    ...state,
    revision: { phase: REVISION_PHASE.PROMPTING, request: null },
  }, {
    focus: 'revision-prompt',
  })
}

function submitRevision(state, message) {
  const nextMessage = typeof message === 'string' ? message.trim() : ''
  const available = state.step === PRODUCT_DEMO_STEP.REVIEW
    && !state.rejected
    && state.revision.phase === REVISION_PHASE.PROMPTING

  if (!available) {
    return createModel(state, {
      toast: productDemoScenario.notices.revisionUnavailable,
    })
  }

  if (nextMessage !== productDemoScenario.revision.request) {
    return createModel(state, {
      toast: productDemoScenario.notices.revisionFixtureOnly,
    })
  }

  return createModel({
    ...state,
    revision: {
      phase: REVISION_PHASE.PENDING,
      request: nextMessage,
    },
  }, {
    completeRevisionAfterMs: productDemoScenario.revision.completionDelayMs,
  })
}

function completeRevision(state) {
  if (
    state.step !== PRODUCT_DEMO_STEP.REVIEW
    || state.revision.phase !== REVISION_PHASE.PENDING
  ) {
    return createModel(state)
  }

  return createModel({
    ...state,
    proposal: {
      ...state.proposal,
      title: productDemoScenario.revision.title,
    },
    revision: {
      ...state.revision,
      phase: REVISION_PHASE.COMPLETED,
    },
  })
}

export function createProductDemo(initialStep) {
  return createModel(createState(initialStep))
}

export function updateProductDemo(model, event) {
  const state = model.state

  switch (event.type) {
    case PRODUCT_DEMO_EVENT.TOGGLE_SOURCE:
      return toggleSource(state, event.source, event.selected)
    case PRODUCT_DEMO_EVENT.GO_TO_STEP:
      return goToStep(state, event.step, event)
    case PRODUCT_DEMO_EVENT.ADVANCE:
      return advance(state)
    case PRODUCT_DEMO_EVENT.SELECT_DOCUMENT:
      if (!(event.document in productDemoScenario.documentFindings)) {
        return createModel(state)
      }
      return createModel({ ...state, activeDocument: event.document })
    case PRODUCT_DEMO_EVENT.SELECT_DOCUMENT_MODE:
      if (!['edit', 'preview'].includes(event.mode)) return createModel(state)
      return createModel({ ...state, documentMode: event.mode })
    case PRODUCT_DEMO_EVENT.START_REVISION:
      return startRevision(state)
    case PRODUCT_DEMO_EVENT.CANCEL_REVISION:
      return createModel({
        ...state,
        revision: { phase: REVISION_PHASE.IDLE, request: null },
      })
    case PRODUCT_DEMO_EVENT.SUBMIT_REVISION:
      return submitRevision(state, event.message)
    case PRODUCT_DEMO_EVENT.COMPLETE_REVISION:
      return completeRevision(state)
    case PRODUCT_DEMO_EVENT.REJECT_PROPOSAL:
      return createModel({
        ...state,
        revision: revisionInProgress(state)
          ? { phase: REVISION_PHASE.IDLE, request: null }
          : state.revision,
        rejected: true,
      })
    case PRODUCT_DEMO_EVENT.RESTORE_PROPOSAL:
      return createModel({ ...state, rejected: false })
    case PRODUCT_DEMO_EVENT.RESET:
      return createModel(createState(event.step), {
        toast: productDemoScenario.notices.reset,
        syncUrl: true,
      })
    default:
      throw new Error(`Unknown product demo event: ${event.type}`)
  }
}
