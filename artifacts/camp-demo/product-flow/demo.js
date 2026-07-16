import {
  PRODUCT_DEMO_EVENT,
  PRODUCT_DEMO_STEP,
  createProductDemo,
  updateProductDemo,
} from './product-demo-core.mjs'

const params = new URLSearchParams(window.location.search)
const presentationMode = params.get('present') === '1'
const resetStep = PRODUCT_DEMO_STEP.SCATTERED
const requestedStep = Number.parseInt(
  params.get('step') || String(resetStep),
  10,
)

let model = createProductDemo(requestedStep)
let toastTimer
let revisionTimer

const elements = {
  body: document.body,
  brandHome: document.querySelector('#brandHome'),
  progressButtons: [...document.querySelectorAll('[data-go-step]')],
  sourceInputs: [...document.querySelectorAll('[data-source]')],
  selectionCount: document.querySelector('#selectionCount'),
  organizeButton: document.querySelector('#organizeButton'),
  sourceHint: document.querySelector('#sourceHint'),
  stageNumber: document.querySelector('#stageNumber'),
  stageEyebrow: document.querySelector('#stageEyebrow'),
  stageTitle: document.querySelector('#stageTitle'),
  stageDescription: document.querySelector('#stageDescription'),
  agentStatus: document.querySelector('#agentStatus'),
  workspaceEmpty: document.querySelector('#workspaceEmpty'),
  documentWorkspace: document.querySelector('#documentWorkspace'),
  documentTabs: [...document.querySelectorAll('[data-document-tab]')],
  documentPreviews: [...document.querySelectorAll('[data-document-preview]')],
  documentModeButtons: [...document.querySelectorAll('[data-document-mode]')],
  documentModePanels: [...document.querySelectorAll('[data-document-mode-panel]')],
  documentContextStatus: document.querySelector('#documentContextStatus'),
  documentStatusMessage: document.querySelector('#documentStatusMessage'),
  documentFinding: document.querySelector('#documentFinding'),
  evidencePanel: document.querySelector('#evidencePanel'),
  confirmedBanner: document.querySelector('#confirmedBanner'),
  chatThread: document.querySelector('#chatThread'),
  chatEmpty: document.querySelector('#chatEmpty'),
  runRequestCard: document.querySelector('#runRequestCard'),
  runRequestCopy: document.querySelector('#runRequestCopy'),
  runAcknowledgement: document.querySelector('#runAcknowledgement'),
  toolCallStack: document.querySelector('#toolCallStack'),
  evidenceBubble: document.querySelector('#evidenceBubble'),
  proposalIntroduction: document.querySelector('#proposalIntroduction'),
  decisionReceipt: document.querySelector('#decisionReceipt'),
  successBubble: document.querySelector('#successBubble'),
  successTitle: document.querySelector('#successTitle'),
  chatComposer: document.querySelector('#chatComposer'),
  chatInput: document.querySelector('#chatInput'),
  sendMessageButton: document.querySelector('#sendMessageButton'),
  previousButton: document.querySelector('#previousButton'),
  resetButton: document.querySelector('#resetButton'),
  nextButton: document.querySelector('#nextButton'),
  footerStep: document.querySelector('#footerStep'),
  footerLabel: document.querySelector('#footerLabel'),
  chatReviewProposalButton: document.querySelector('#chatReviewProposalButton'),
  proposalCard: document.querySelector('#proposalCard'),
  proposalSymbol: document.querySelector('#proposalSymbol'),
  proposalStatus: document.querySelector('#proposalStatus'),
  acceptButton: document.querySelector('#acceptButton'),
  revisionButton: document.querySelector('#revisionButton'),
  rejectButton: document.querySelector('#rejectButton'),
  proposalActions: document.querySelector('#proposalActions'),
  proposalReadView: document.querySelector('#proposalReadView'),
  proposalRevisionForm: document.querySelector('#proposalRevisionForm'),
  proposalRevisionState: document.querySelector('#proposalRevisionState'),
  proposalRevisionRequest: document.querySelector('#proposalRevisionRequest'),
  proposalRevisionPending: document.querySelector('#proposalRevisionPending'),
  proposalRevisionResponse: document.querySelector('#proposalRevisionResponse'),
  proposalRevisionResponseCopy: document.querySelector('#proposalRevisionResponseCopy'),
  revisionPromptInput: document.querySelector('#revisionPromptInput'),
  revisionSuggestion: document.querySelector('#revisionSuggestion'),
  proposalMessage: document.querySelector('#proposalMessage'),
  rejectedState: document.querySelector('#rejectedState'),
  acceptedProposalState: document.querySelector('#acceptedProposalState'),
  restoreProposalButton: document.querySelector('#restoreProposalButton'),
  cancelRevisionButton: document.querySelector('#cancelRevisionButton'),
  proposalTitle: document.querySelector('#proposalTitle'),
  proposalDeadline: document.querySelector('#proposalDeadline'),
  proposalMethod: document.querySelector('#proposalMethod'),
  acceptedTitle: document.querySelector('#acceptedTitle'),
  acceptedDeadline: document.querySelector('#acceptedDeadline'),
  acceptedMethod: document.querySelector('#acceptedMethod'),
  emptyState: document.querySelector('#emptyState'),
  stateCount: document.querySelector('#stateCount'),
  toast: document.querySelector('#toast'),
}

function updateUrl(step) {
  const url = new URL(window.location.href)
  url.searchParams.delete('variant')
  url.searchParams.set('step', String(step))
  window.history.replaceState({}, '', url)
}

function showToast(message) {
  window.clearTimeout(toastTimer)
  elements.toast.textContent = message
  elements.toast.classList.add('is-visible')
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible')
  }, 1800)
}

function applyEffect(effect) {
  if (effect.syncUrl) updateUrl(model.view.step)
  if (effect.toast) showToast(effect.toast)
  if (effect.focus === 'revision-prompt') elements.revisionPromptInput.focus()

  if (effect.completeRevisionAfterMs !== null) {
    window.clearTimeout(revisionTimer)
    revisionTimer = window.setTimeout(() => {
      dispatch({ type: PRODUCT_DEMO_EVENT.COMPLETE_REVISION })
    }, effect.completeRevisionAfterMs)
  } else if (!model.view.proposal.revision.pendingVisible) {
    window.clearTimeout(revisionTimer)
  }
}

function renderSources(view) {
  elements.sourceInputs.forEach((input) => {
    input.checked = view.sources.selected.includes(input.dataset.source)
    input.disabled = view.sources.disabled
  })

  const selectedCount = view.sources.selected.length
  elements.selectionCount.textContent = `${selectedCount}개 선택`
  elements.selectionCount.classList.toggle('has-selection', selectedCount > 0)
  elements.organizeButton.disabled = view.sources.organizeDisabled
  elements.sourceHint.textContent = view.sources.hint
}

function renderDocuments(view) {
  elements.documentTabs.forEach((tab) => {
    const isActive = tab.dataset.documentTab === view.document.active
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-selected', String(isActive))
  })

  elements.documentPreviews.forEach((preview) => {
    preview.hidden = preview.dataset.documentPreview !== view.document.active
  })

  elements.documentModeButtons.forEach((button) => {
    const isActive = button.dataset.documentMode === view.document.mode
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  })

  elements.documentModePanels.forEach((panel) => {
    panel.hidden = panel.dataset.documentModePanel !== view.document.mode
  })

  elements.documentFinding.textContent = view.document.finding
}

function renderWorkspace(view) {
  const workspace = view.workspace

  elements.workspaceEmpty.hidden = workspace.visible
  elements.documentWorkspace.hidden = !workspace.visible
  elements.evidencePanel.hidden = !workspace.evidenceVisible
  elements.confirmedBanner.hidden = !workspace.confirmed
  elements.documentWorkspace.classList.toggle(
    'is-grounded',
    workspace.evidenceVisible,
  )
  elements.documentWorkspace.classList.toggle(
    'is-confirmed',
    workspace.confirmed,
  )
  elements.documentContextStatus.textContent = workspace.contextStatus
  elements.documentStatusMessage.textContent = workspace.statusMessage
}

function renderProposal(view) {
  const proposal = view.proposal

  elements.proposalTitle.textContent = proposal.values.title
  elements.proposalDeadline.textContent = proposal.values.deadline
  elements.proposalMethod.textContent = proposal.values.method
  elements.proposalReadView.hidden = false
  elements.proposalRevisionForm.hidden = !proposal.revision.formVisible
  elements.proposalRevisionState.hidden = !proposal.revision.requestVisible
  elements.proposalRevisionRequest.textContent = proposal.revision.request || ''
  elements.proposalRevisionPending.hidden = !proposal.revision.pendingVisible
  elements.proposalRevisionResponse.hidden = !proposal.revision.responseVisible
  elements.proposalRevisionResponseCopy.textContent = proposal.revision.response
  elements.revisionSuggestion.dataset.message = proposal.revision.suggestion
  elements.revisionButton.hidden = !proposal.revision.actionVisible
  elements.proposalActions.classList.toggle(
    'has-revision-action',
    proposal.revision.actionVisible,
  )
  if (!proposal.revision.formVisible) elements.revisionPromptInput.value = ''
  elements.proposalCard.classList.toggle('is-accepted', proposal.accepted)
  elements.proposalSymbol.textContent = proposal.symbol
  elements.proposalStatus.textContent = proposal.status
  elements.proposalActions.hidden = !proposal.actionsVisible
  elements.rejectedState.hidden = !proposal.rejected
  elements.acceptedProposalState.hidden = !proposal.accepted
  elements.proposalMessage.textContent = proposal.message
}

function renderConfirmedState(view) {
  const accepted = view.workspace.confirmed
  const proposal = view.proposal.values

  elements.emptyState.hidden = accepted
  elements.stateCount.textContent = String(view.confirmedTaskCount)
  elements.stateCount.classList.toggle('has-task', accepted)
  elements.acceptedTitle.textContent = proposal.title
  elements.acceptedDeadline.textContent = proposal.deadline
  elements.acceptedMethod.textContent = proposal.method
  elements.successTitle.textContent = proposal.title
}

function renderChat(view) {
  const chat = view.chat

  elements.chatEmpty.hidden = !chat.emptyVisible
  elements.runRequestCard.hidden = !chat.runRequestVisible
  elements.runRequestCopy.textContent = chat.runRequest
  elements.runAcknowledgement.hidden = !chat.acknowledgementVisible
  elements.toolCallStack.hidden = !chat.toolActivityVisible
  elements.evidenceBubble.hidden = !chat.evidenceVisible
  elements.proposalIntroduction.hidden = !chat.proposalVisible
  elements.proposalCard.hidden = !chat.proposalVisible
  elements.decisionReceipt.hidden = !chat.decisionReceiptVisible
  elements.successBubble.hidden = !chat.successVisible

  elements.chatInput.disabled = !chat.composer.enabled
  elements.chatInput.placeholder = chat.composer.placeholder
  elements.sendMessageButton.disabled = !chat.composer.enabled
  elements.chatInput.value = ''

  window.requestAnimationFrame(() => {
    elements.chatThread.scrollTop = elements.chatThread.scrollHeight
  })
}

function render() {
  const view = model.view
  const stage = view.stage

  elements.body.dataset.step = String(view.step)
  elements.stageNumber.textContent = String(view.step).padStart(2, '0')
  elements.stageEyebrow.textContent = stage.eyebrow
  elements.stageTitle.textContent = stage.title
  elements.stageDescription.textContent = stage.description
  elements.agentStatus.textContent = stage.agentStatus
  elements.footerStep.textContent = `${view.step} / ${view.stepCount}`
  elements.footerLabel.textContent = stage.label

  elements.progressButtons.forEach((button) => {
    const buttonStep = Number(button.dataset.goStep)
    button.classList.toggle('is-current', buttonStep === view.step)
    button.classList.toggle('is-complete', buttonStep < view.step)
    if (buttonStep === view.step) {
      button.setAttribute('aria-current', 'step')
    } else {
      button.removeAttribute('aria-current')
    }
  })

  elements.previousButton.disabled = view.navigation.previousDisabled
  elements.nextButton.disabled = view.navigation.nextDisabled
  elements.nextButton.querySelector('span').textContent = view.navigation.nextLabel

  renderSources(view)
  renderDocuments(view)
  renderWorkspace(view)
  renderProposal(view)
  renderConfirmedState(view)
  renderChat(view)
}

function dispatch(event) {
  model = updateProductDemo(model, event)
  render()
  applyEffect(model.effect)
}

function resetDemo() {
  dispatch({
    type: PRODUCT_DEMO_EVENT.RESET,
    step: resetStep,
  })
}

function goToStep(step, options = {}) {
  dispatch({
    type: PRODUCT_DEMO_EVENT.GO_TO_STEP,
    step,
    ...options,
  })
}

elements.sourceInputs.forEach((input) => {
  input.addEventListener('change', () => {
    dispatch({
      type: PRODUCT_DEMO_EVENT.TOGGLE_SOURCE,
      source: input.dataset.source,
      selected: input.checked,
    })
  })
})

elements.documentTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    dispatch({
      type: PRODUCT_DEMO_EVENT.SELECT_DOCUMENT,
      document: tab.dataset.documentTab,
    })
  })
})

elements.documentModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    dispatch({
      type: PRODUCT_DEMO_EVENT.SELECT_DOCUMENT_MODE,
      mode: button.dataset.documentMode,
    })
  })
})

elements.organizeButton.addEventListener('click', () => {
  goToStep(PRODUCT_DEMO_STEP.DELEGATED)
})
elements.chatReviewProposalButton.addEventListener('click', () => {
  goToStep(PRODUCT_DEMO_STEP.REVIEW)
})
elements.acceptButton.addEventListener('click', () => {
  goToStep(PRODUCT_DEMO_STEP.CONFIRMED, { accepted: true })
})

elements.revisionButton.addEventListener('click', () => {
  dispatch({ type: PRODUCT_DEMO_EVENT.START_REVISION })
})
elements.cancelRevisionButton.addEventListener('click', () => {
  dispatch({ type: PRODUCT_DEMO_EVENT.CANCEL_REVISION })
})
elements.rejectButton.addEventListener('click', () => {
  dispatch({ type: PRODUCT_DEMO_EVENT.REJECT_PROPOSAL })
})
elements.restoreProposalButton.addEventListener('click', () => {
  dispatch({ type: PRODUCT_DEMO_EVENT.RESTORE_PROPOSAL })
})

elements.revisionSuggestion.addEventListener('click', () => {
  elements.revisionPromptInput.value = elements.revisionSuggestion.dataset.message
  elements.revisionPromptInput.focus()
})

elements.proposalRevisionForm.addEventListener('submit', (event) => {
  event.preventDefault()
  dispatch({
    type: PRODUCT_DEMO_EVENT.SUBMIT_REVISION,
    message: elements.revisionPromptInput.value,
  })
})

elements.chatComposer.addEventListener('submit', (event) => {
  event.preventDefault()
})

elements.progressButtons.forEach((button) => {
  button.addEventListener('click', () => {
    goToStep(Number(button.dataset.goStep))
  })
})

elements.previousButton.addEventListener('click', () => {
  goToStep(model.view.step - 1)
})
elements.nextButton.addEventListener('click', () => {
  dispatch({ type: PRODUCT_DEMO_EVENT.ADVANCE })
})
elements.resetButton.addEventListener('click', () => {
  resetDemo()
})

document.addEventListener('keydown', (event) => {
  const target = event.target
  const isTyping = target instanceof HTMLElement && (
    target.matches('input, textarea, select') || target.isContentEditable
  )

  if (isTyping || event.altKey || event.metaKey || event.ctrlKey) return

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    if (event.key === 'ArrowRight') {
      dispatch({ type: PRODUCT_DEMO_EVENT.ADVANCE })
    } else {
      goToStep(model.view.step - 1)
    }
  }

  if (event.key.toLowerCase() === 'r') {
    event.preventDefault()
    resetDemo()
  }
})

elements.brandHome.href = presentationMode
  ? '?step=1&present=1'
  : '?step=1'

render()
