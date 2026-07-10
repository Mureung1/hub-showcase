const steps = [
  {
    eyebrow: 'BEFORE',
    title: '자료는 쌓이는데, 할 일은 흩어져 있습니다',
    description: '마감은 LMS 공지에, 제출 방식은 강의계획서에 있습니다. 학생이 직접 열고 비교해 다시 옮겨 적어야 합니다.',
    label: '흩어진 자료',
    agentStatus: '대기',
    agentMessage: '자료를 고르면, 필요한 정보를 직접 찾아 하나의 과제로 연결할게요.'
  },
  {
    eyebrow: 'SELECT',
    title: '이번 일에 필요한 자료만 고릅니다',
    description: 'LMS 공지와 강의계획서를 선택했습니다. AY가 읽고 행동할 범위를 사용자가 먼저 정합니다.',
    label: '자료 선택',
    agentStatus: '준비됨',
    agentMessage: '선택한 두 자료 안에서 과제명, 마감, 제출 방식을 찾아볼 수 있어요.'
  },
  {
    eyebrow: 'DELEGATE',
    title: '요약을 요청하는 대신, 일을 맡깁니다',
    description: 'AY는 한 번의 답변을 만드는 데서 멈추지 않고, 자료를 읽고 연결해 앱의 변경 제안까지 준비합니다.',
    label: '일 맡기기',
    agentStatus: '작업 시작',
    agentMessage: '두 자료를 직접 열어 과제에 필요한 정보를 찾기 시작할게요.'
  },
  {
    eyebrow: 'ACT',
    title: 'AY가 필요한 도구를 쓰며 여러 단계를 이어갑니다',
    description: 'AY가 어떤 자료를 열었고, 무엇을 찾고 연결했는지 사용자가 확인할 수 있는 작업 기록입니다.',
    label: 'AY의 작업',
    agentStatus: '작업 완료',
    agentMessage: '공지에서 마감을, PDF에서 제출 방식을 찾고 같은 과제 정보로 연결했어요.'
  },
  {
    eyebrow: 'GROUND',
    title: '결론보다 먼저, 원본 근거를 확인합니다',
    description: 'AY가 찾은 값마다 출처가 연결됩니다. 사용자는 AI의 말을 믿는 대신 실제 문장을 바로 대조할 수 있습니다.',
    label: '원본 근거',
    agentStatus: '근거 확인',
    agentMessage: '마감과 제출 방식이 나온 원본 위치를 연결했어요. 표시한 문장을 확인해 주세요.'
  },
  {
    eyebrow: 'REVIEW',
    title: 'AI의 제안은 사용자가 결정합니다',
    description: '수락하거나, 내용을 고치거나, 거절할 수 있습니다. 확인하기 전에는 내 학기 정보가 바뀌지 않습니다.',
    label: '사용자 결정',
    agentStatus: '검토 대기',
    agentMessage: '새 과제 1개를 제안했어요. 수락·수정·거절 중 원하는 결정을 내려 주세요.'
  },
  {
    eyebrow: 'CONFIRMED',
    title: '확인한 내용만 내 학기 정보가 됩니다',
    description: '수락한 과제는 일정, 할 일, 이후의 Agent 작업이 함께 사용하는 확인된 정보가 됩니다.',
    label: '확인된 정보',
    agentStatus: '반영 완료',
    agentMessage: '확인한 과제를 내 학기 정보에 반영했어요. 원본 자료 연결도 함께 보관됩니다.'
  }
]

const variants = ['workspace', 'focus', 'agent']
const targetSources = ['notice', 'syllabus']

const params = new URLSearchParams(window.location.search)
const requestedStep = Number.parseInt(params.get('step') || '1', 10)
const requestedVariant = params.get('variant') || 'focus'
const presentationMode = params.get('present') === '1'

const state = {
  step: Number.isFinite(requestedStep) ? Math.min(7, Math.max(1, requestedStep)) : 1,
  variant: variants.includes(requestedVariant) ? requestedVariant : 'focus',
  selected: new Set(),
  proposal: {
    title: '개요 작성하기',
    deadline: '7월 12일 23:59',
    method: 'LMS 업로드'
  },
  editing: false,
  rejected: false
}

if (state.step >= 2) {
  targetSources.forEach((source) => state.selected.add(source))
}

const elements = {
  body: document.body,
  scenes: [...document.querySelectorAll('[data-scene]')],
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
  agentMessage: document.querySelector('#agentMessage'),
  previousButton: document.querySelector('#previousButton'),
  resetButton: document.querySelector('#resetButton'),
  nextButton: document.querySelector('#nextButton'),
  footerStep: document.querySelector('#footerStep'),
  footerLabel: document.querySelector('#footerLabel'),
  showActivityButton: document.querySelector('#showActivityButton'),
  reviewProposalButton: document.querySelector('#reviewProposalButton'),
  acceptButton: document.querySelector('#acceptButton'),
  editButton: document.querySelector('#editButton'),
  rejectButton: document.querySelector('#rejectButton'),
  proposalActions: document.querySelector('#proposalActions'),
  proposalReadView: document.querySelector('#proposalReadView'),
  proposalEditView: document.querySelector('#proposalEditView'),
  proposalMessage: document.querySelector('#proposalMessage'),
  rejectedState: document.querySelector('#rejectedState'),
  restoreProposalButton: document.querySelector('#restoreProposalButton'),
  cancelEditButton: document.querySelector('#cancelEditButton'),
  titleInput: document.querySelector('#titleInput'),
  deadlineInput: document.querySelector('#deadlineInput'),
  proposalTitle: document.querySelector('#proposalTitle'),
  proposalDeadline: document.querySelector('#proposalDeadline'),
  proposalMethod: document.querySelector('#proposalMethod'),
  acceptedTitle: document.querySelector('#acceptedTitle'),
  acceptedDeadline: document.querySelector('#acceptedDeadline'),
  acceptedMethod: document.querySelector('#acceptedMethod'),
  confirmedTitle: document.querySelector('#confirmedTitle'),
  confirmedDeadline: document.querySelector('#confirmedDeadline'),
  emptyState: document.querySelector('#emptyState'),
  confirmedTask: document.querySelector('#confirmedTask'),
  stateCount: document.querySelector('#stateCount'),
  variantButtons: [...document.querySelectorAll('[data-variant-choice]')],
  previousVariantButton: document.querySelector('#previousVariantButton'),
  nextVariantButton: document.querySelector('#nextVariantButton'),
  toast: document.querySelector('#toast')
}

let toastTimer

function updateUrl() {
  const url = new URL(window.location.href)
  url.searchParams.set('variant', state.variant)
  url.searchParams.set('step', String(state.step))
  window.history.replaceState({}, '', url)
}

function targetSelectionComplete() {
  return targetSources.every((source) => state.selected.has(source))
}

function resetProposalInteraction() {
  state.editing = false
  state.rejected = false
}

function goToStep(nextStep, options = {}) {
  const clampedStep = Math.min(7, Math.max(1, nextStep))
  state.step = clampedStep

  if (clampedStep === 1 && !options.preserveSelection) {
    state.selected.clear()
  } else if (clampedStep >= 2) {
    targetSources.forEach((source) => state.selected.add(source))
  }

  if (clampedStep !== 6) {
    resetProposalInteraction()
  }

  updateUrl()
  render()
}

function advanceStep() {
  if (state.step === 6 && state.editing) {
    showToast('수정안을 저장하거나 취소한 뒤 결정해 주세요.')
    return
  }

  if (state.step === 6 && state.rejected) {
    showToast('거절한 제안은 반영되지 않습니다. 제안을 다시 보거나 이전 단계로 이동하세요.')
    return
  }

  goToStep(state.step + 1)
}

function setVariant(variant) {
  if (!variants.includes(variant)) return
  state.variant = variant
  updateUrl()
  renderVariant()
}

function cycleVariant(direction) {
  const currentIndex = variants.indexOf(state.variant)
  const nextIndex = (currentIndex + direction + variants.length) % variants.length
  setVariant(variants[nextIndex])
}

function renderVariant() {
  elements.body.dataset.variant = state.variant
  elements.body.classList.toggle('presentation-mode', presentationMode)
  elements.variantButtons.forEach((button) => {
    const isCurrent = button.dataset.variantChoice === state.variant
    button.classList.toggle('is-current', isCurrent)
    button.setAttribute('aria-pressed', String(isCurrent))
  })
}

function renderSources() {
  elements.sourceInputs.forEach((input) => {
    input.checked = state.selected.has(input.dataset.source)
    input.disabled = state.step >= 3
  })

  const selectedCount = state.selected.size
  elements.selectionCount.textContent = `${selectedCount}개 선택`
  elements.selectionCount.classList.toggle('has-selection', selectedCount > 0)

  const ready = targetSelectionComplete()
  elements.organizeButton.disabled = state.step !== 2 || !ready

  if (state.step >= 3) {
    elements.sourceHint.textContent = 'AY가 선택한 두 자료를 기준으로 작업 중입니다.'
  } else if (ready) {
    elements.sourceHint.textContent = '준비됐어요. 이 두 자료를 AY에게 맡길 수 있습니다.'
  } else if (selectedCount === 0) {
    elements.sourceHint.textContent = '관련 있는 자료 2개를 선택해 보세요.'
  } else {
    elements.sourceHint.textContent = 'LMS 과제 공지와 강의계획서를 함께 선택해 보세요.'
  }
}

function renderProposal() {
  elements.proposalTitle.textContent = state.proposal.title
  elements.proposalDeadline.textContent = state.proposal.deadline
  elements.proposalMethod.textContent = state.proposal.method
  elements.titleInput.value = state.proposal.title
  elements.deadlineInput.value = state.proposal.deadline

  elements.proposalReadView.hidden = state.editing
  elements.proposalEditView.hidden = !state.editing
  elements.proposalActions.hidden = state.editing || state.rejected
  elements.rejectedState.hidden = !state.rejected

  if (state.rejected) {
    elements.proposalMessage.textContent = '거절한 제안은 내 학기 정보에 반영되지 않습니다.'
  } else if (state.editing) {
    elements.proposalMessage.textContent = '필요한 값을 고친 뒤에도 최종 반영은 다시 수락해야 합니다.'
  } else {
    elements.proposalMessage.textContent = '수락하기 전에는 학기 일정에 아무것도 추가되지 않습니다.'
  }

  if (state.step === 6) {
    elements.nextButton.disabled = state.editing || state.rejected
  }
}

function renderConfirmedState() {
  const accepted = state.step === 7
  elements.emptyState.hidden = accepted
  elements.confirmedTask.hidden = !accepted
  elements.stateCount.textContent = accepted ? '과제 1' : '과제 0'
  elements.stateCount.classList.toggle('has-task', accepted)

  elements.acceptedTitle.textContent = state.proposal.title
  elements.acceptedDeadline.textContent = state.proposal.deadline
  elements.acceptedMethod.textContent = state.proposal.method
  elements.confirmedTitle.textContent = state.proposal.title
  elements.confirmedDeadline.textContent = state.proposal.deadline
}

function render() {
  const current = steps[state.step - 1]
  elements.body.dataset.step = String(state.step)
  elements.stageNumber.textContent = String(state.step).padStart(2, '0')
  elements.stageEyebrow.textContent = current.eyebrow
  elements.stageTitle.textContent = current.title
  elements.stageDescription.textContent = current.description
  elements.agentStatus.textContent = current.agentStatus
  elements.agentMessage.textContent = current.agentMessage
  elements.footerStep.textContent = `${state.step} / 7`
  elements.footerLabel.textContent = current.label

  elements.scenes.forEach((scene) => {
    const isActive = Number(scene.dataset.scene) === state.step
    scene.classList.toggle('is-active', isActive)
    scene.setAttribute('aria-hidden', String(!isActive))
  })

  elements.progressButtons.forEach((button) => {
    const buttonStep = Number(button.dataset.goStep)
    button.classList.toggle('is-current', buttonStep === state.step)
    button.classList.toggle('is-complete', buttonStep < state.step)
    if (buttonStep === state.step) {
      button.setAttribute('aria-current', 'step')
    } else {
      button.removeAttribute('aria-current')
    }
  })

  elements.previousButton.disabled = state.step === 1
  elements.nextButton.disabled = state.step === 7
  elements.nextButton.querySelector('span').textContent = state.step === 6 ? '수락하고 다음' : '다음'

  renderVariant()
  renderSources()
  renderProposal()
  renderConfirmedState()
}

function resetDemo() {
  state.proposal.title = '개요 작성하기'
  state.proposal.deadline = '7월 12일 23:59'
  state.proposal.method = 'LMS 업로드'
  resetProposalInteraction()
  goToStep(1)
  showToast('데모를 처음 상태로 되돌렸습니다.')
}

function showToast(message) {
  window.clearTimeout(toastTimer)
  elements.toast.textContent = message
  elements.toast.classList.add('is-visible')
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible')
  }, 1800)
}

elements.sourceInputs.forEach((input) => {
  input.addEventListener('change', () => {
    if (input.checked) {
      state.selected.add(input.dataset.source)
    } else {
      state.selected.delete(input.dataset.source)
    }

    if (state.step === 2 && !targetSelectionComplete()) {
      state.step = 1
      updateUrl()
    } else if (state.step === 1 && targetSelectionComplete()) {
      state.step = 2
      updateUrl()
    }

    render()
  })
})

elements.organizeButton.addEventListener('click', () => goToStep(3))
elements.showActivityButton.addEventListener('click', () => goToStep(4))
elements.reviewProposalButton.addEventListener('click', () => goToStep(6))
elements.acceptButton.addEventListener('click', () => goToStep(7))

elements.editButton.addEventListener('click', () => {
  state.editing = true
  renderProposal()
  elements.titleInput.focus()
})

elements.cancelEditButton.addEventListener('click', () => {
  state.editing = false
  renderProposal()
})

elements.proposalEditView.addEventListener('submit', (event) => {
  event.preventDefault()
  const nextTitle = elements.titleInput.value.trim()
  const nextDeadline = elements.deadlineInput.value.trim()

  if (!nextTitle || !nextDeadline) {
    showToast('과제명과 마감을 모두 입력해 주세요.')
    return
  }

  state.proposal.title = nextTitle
  state.proposal.deadline = nextDeadline
  state.editing = false
  renderProposal()
  showToast('수정안을 저장했습니다. 수락하면 내 학기 정보에 반영됩니다.')
})

elements.rejectButton.addEventListener('click', () => {
  state.rejected = true
  renderProposal()
})

elements.restoreProposalButton.addEventListener('click', () => {
  state.rejected = false
  renderProposal()
})

elements.progressButtons.forEach((button) => {
  button.addEventListener('click', () => goToStep(Number(button.dataset.goStep)))
})

elements.previousButton.addEventListener('click', () => goToStep(state.step - 1))
elements.nextButton.addEventListener('click', advanceStep)
elements.resetButton.addEventListener('click', resetDemo)

elements.variantButtons.forEach((button) => {
  button.addEventListener('click', () => setVariant(button.dataset.variantChoice))
})

elements.previousVariantButton.addEventListener('click', () => cycleVariant(-1))
elements.nextVariantButton.addEventListener('click', () => cycleVariant(1))

document.addEventListener('keydown', (event) => {
  const target = event.target
  const isTyping = target instanceof HTMLElement && (
    target.matches('input, textarea, select') || target.isContentEditable
  )

  if (isTyping || (event.altKey || event.metaKey || event.ctrlKey)) return

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const variantControlFocused = target instanceof HTMLElement && target.closest('.variant-switcher')

    if (event.shiftKey || variantControlFocused) {
      cycleVariant(direction)
    } else if (direction > 0) {
      advanceStep()
    } else {
      goToStep(state.step - 1)
    }
  }

  if (event.key.toLowerCase() === 'r') {
    event.preventDefault()
    resetDemo()
  }
})

render()
