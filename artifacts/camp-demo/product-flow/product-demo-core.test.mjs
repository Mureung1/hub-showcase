import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PRODUCT_DEMO_EVENT,
  PRODUCT_DEMO_STEP,
  createProductDemo,
  updateProductDemo,
} from './product-demo-core.mjs'

function dispatch(model, type, detail = {}) {
  return updateProductDemo(model, { type, ...detail })
}

test('deep links start from a coherent step snapshot', () => {
  const model = createProductDemo(PRODUCT_DEMO_STEP.EVIDENCE)

  assert.equal(model.view.step, PRODUCT_DEMO_STEP.EVIDENCE)
  assert.deepEqual(model.view.sources.selected, ['notice', 'syllabus'])
  assert.equal(model.view.workspace.evidenceVisible, true)
  assert.equal(model.view.workspace.confirmed, false)
  assert.equal(model.view.navigation.nextDisabled, false)
})

test('the selected step starts with a coherent presentation snapshot', () => {
  const model = createProductDemo(PRODUCT_DEMO_STEP.SELECTED)

  assert.equal(model.view.step, PRODUCT_DEMO_STEP.SELECTED)
  assert.deepEqual(model.view.sources.selected, ['notice', 'syllabus'])
  assert.equal(model.view.sources.ready, true)
  assert.equal(model.view.sources.organizeDisabled, false)
  assert.equal(model.view.workspace.visible, true)
})

test('chat stays empty until a modeling run is delegated', () => {
  const scattered = createProductDemo(PRODUCT_DEMO_STEP.SCATTERED)
  const selected = createProductDemo(PRODUCT_DEMO_STEP.SELECTED)
  const delegated = createProductDemo(PRODUCT_DEMO_STEP.DELEGATED)

  assert.equal(scattered.view.chat.emptyVisible, true)
  assert.equal(scattered.view.chat.runRequestVisible, false)
  assert.equal(scattered.view.chat.composer.enabled, false)
  assert.equal(selected.view.chat.emptyVisible, true)
  assert.equal(selected.view.chat.runRequestVisible, false)
  assert.equal(delegated.view.chat.emptyVisible, false)
  assert.equal(delegated.view.chat.runRequestVisible, true)
  assert.equal(
    delegated.view.chat.runRequest,
    '선택한 자료 2개에서 챙겨야 할 과제를 정리하기',
  )
  assert.equal(delegated.view.chat.acknowledgementVisible, true)
})

test('target source selection advances and retreats around the selection step', () => {
  let model = createProductDemo()

  model = dispatch(model, PRODUCT_DEMO_EVENT.TOGGLE_SOURCE, {
    source: 'notice',
    selected: true,
  })
  assert.equal(model.view.step, PRODUCT_DEMO_STEP.SCATTERED)
  assert.equal(model.view.sources.ready, false)

  model = dispatch(model, PRODUCT_DEMO_EVENT.TOGGLE_SOURCE, {
    source: 'syllabus',
    selected: true,
  })
  assert.equal(model.view.step, PRODUCT_DEMO_STEP.SELECTED)
  assert.equal(model.view.sources.ready, true)
  assert.equal(model.effect.syncUrl, true)

  model = dispatch(model, PRODUCT_DEMO_EVENT.TOGGLE_SOURCE, {
    source: 'notice',
    selected: false,
  })
  assert.equal(model.view.step, PRODUCT_DEMO_STEP.SCATTERED)
  assert.equal(model.view.sources.ready, false)
})

test('review cannot become confirmed through generic navigation', () => {
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)

  model = dispatch(model, PRODUCT_DEMO_EVENT.GO_TO_STEP, {
    step: PRODUCT_DEMO_STEP.CONFIRMED,
  })

  assert.equal(model.view.step, PRODUCT_DEMO_STEP.REVIEW)
  assert.match(model.effect.toast, /수락하고 반영/)

  model = dispatch(model, PRODUCT_DEMO_EVENT.GO_TO_STEP, {
    step: PRODUCT_DEMO_STEP.CONFIRMED,
    accepted: true,
  })

  assert.equal(model.view.step, PRODUCT_DEMO_STEP.CONFIRMED)
  assert.equal(model.view.workspace.confirmed, true)
  assert.equal(model.view.proposal.status, '반영됨')
  assert.equal(model.view.proposal.values.title, '개요 작성하기')
  assert.equal(model.view.confirmedTaskCount, 1)
})

test('the proposal card sends a revision prompt to AY before acceptance', () => {
  const request = '과제 이름을 ‘문제해결글쓰기 개요 작성’으로 바꿔줘.'
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)

  assert.equal(model.view.proposal.revision.phase, 'idle')
  assert.equal(model.view.chat.composer.enabled, false)

  model = dispatch(model, PRODUCT_DEMO_EVENT.START_REVISION)
  assert.equal(model.view.proposal.revision.formVisible, true)
  assert.equal(model.view.proposal.actionsVisible, false)
  assert.equal(model.effect.focus, 'revision-prompt')

  model = dispatch(model, PRODUCT_DEMO_EVENT.SUBMIT_REVISION, {
    message: '마감도 바꿔줘.',
  })
  assert.equal(model.view.proposal.revision.formVisible, true)
  assert.match(model.effect.toast, /시제품/)

  model = dispatch(model, PRODUCT_DEMO_EVENT.SUBMIT_REVISION, {
    message: request,
  })
  assert.equal(model.view.proposal.revision.phase, 'pending')
  assert.equal(model.view.proposal.revision.request, request)
  assert.equal(model.view.proposal.revision.pendingVisible, true)
  assert.equal(model.effect.completeRevisionAfterMs, 700)

  model = dispatch(model, PRODUCT_DEMO_EVENT.GO_TO_STEP, {
    step: PRODUCT_DEMO_STEP.CONFIRMED,
    accepted: true,
  })
  assert.equal(model.view.step, PRODUCT_DEMO_STEP.REVIEW)
  assert.match(model.effect.toast, /수정 요청/)

  model = dispatch(model, PRODUCT_DEMO_EVENT.COMPLETE_REVISION)
  assert.equal(model.view.proposal.revision.phase, 'completed')
  assert.equal(model.view.proposal.revision.responseVisible, true)
  assert.equal(
    model.view.proposal.revision.response,
    '과제 이름만 바꿨어요. 마감, 제출 방식과 원본 근거는 그대로 유지했습니다.',
  )
  assert.equal(model.view.proposal.values.title, '문제해결글쓰기 개요 작성')
  assert.equal(model.view.proposal.status, '수정됨 · 내 확인 필요')

  model = dispatch(model, PRODUCT_DEMO_EVENT.GO_TO_STEP, {
    step: PRODUCT_DEMO_STEP.CONFIRMED,
    accepted: true,
  })
  assert.equal(model.view.step, PRODUCT_DEMO_STEP.CONFIRMED)
  assert.equal(model.view.proposal.values.title, '문제해결글쓰기 개요 작성')
})

test('proposal rejection keeps an explicit user-decision guard', () => {
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)

  model = dispatch(model, PRODUCT_DEMO_EVENT.REJECT_PROPOSAL)
  model = dispatch(model, PRODUCT_DEMO_EVENT.ADVANCE)
  assert.equal(model.view.step, PRODUCT_DEMO_STEP.REVIEW)
  assert.match(model.effect.toast, /반영되지 않습니다/)

  model = dispatch(model, PRODUCT_DEMO_EVENT.RESTORE_PROPOSAL)
  assert.equal(model.view.proposal.rejected, false)
})

test('cancelling an inline revision prompt preserves the proposal', () => {
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)
  model = dispatch(model, PRODUCT_DEMO_EVENT.START_REVISION)
  model = dispatch(model, PRODUCT_DEMO_EVENT.CANCEL_REVISION)

  assert.equal(model.view.proposal.revision.phase, 'idle')
  assert.equal(model.view.proposal.revision.formVisible, false)
  assert.equal(model.view.proposal.values.title, '개요 작성하기')
})

test('leaving review cancels a pending revision and ignores stale completion', () => {
  const request = '과제 이름을 ‘문제해결글쓰기 개요 작성’으로 바꿔줘.'
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)

  model = dispatch(model, PRODUCT_DEMO_EVENT.START_REVISION)
  model = dispatch(model, PRODUCT_DEMO_EVENT.SUBMIT_REVISION, {
    message: request,
  })
  assert.equal(model.view.proposal.revision.phase, 'pending')

  model = dispatch(model, PRODUCT_DEMO_EVENT.GO_TO_STEP, {
    step: PRODUCT_DEMO_STEP.EVIDENCE,
  })
  assert.equal(model.view.proposal.revision.phase, 'idle')

  model = dispatch(model, PRODUCT_DEMO_EVENT.COMPLETE_REVISION)
  assert.equal(model.view.proposal.revision.phase, 'idle')
  assert.equal(model.view.proposal.values.title, '개요 작성하기')
})

test('reset restores the complete scenario state', () => {
  const request = '과제 이름을 ‘문제해결글쓰기 개요 작성’으로 바꿔줘.'
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)
  model = dispatch(model, PRODUCT_DEMO_EVENT.SELECT_DOCUMENT, {
    document: 'syllabus',
  })
  model = dispatch(model, PRODUCT_DEMO_EVENT.SELECT_DOCUMENT_MODE, {
    mode: 'edit',
  })
  model = dispatch(model, PRODUCT_DEMO_EVENT.START_REVISION)
  model = dispatch(model, PRODUCT_DEMO_EVENT.SUBMIT_REVISION, {
    message: request,
  })
  model = dispatch(model, PRODUCT_DEMO_EVENT.COMPLETE_REVISION)
  model = dispatch(model, PRODUCT_DEMO_EVENT.RESET)

  assert.equal(model.view.step, PRODUCT_DEMO_STEP.SCATTERED)
  assert.deepEqual(model.view.sources.selected, [])
  assert.equal(model.view.document.active, 'notice')
  assert.equal(model.view.document.mode, 'preview')
  assert.equal(model.view.proposal.values.title, '개요 작성하기')
  assert.equal(model.view.proposal.revision.phase, 'idle')
  assert.match(model.effect.toast, /처음 상태/)
})

test('confirmed deep links materialize the canonical revised proposal', () => {
  const model = createProductDemo(PRODUCT_DEMO_STEP.CONFIRMED)

  assert.equal(model.view.chat.decisionReceiptVisible, true)
  assert.equal(model.view.proposal.revision.phase, 'completed')
  assert.equal(model.view.proposal.revision.responseVisible, true)
  assert.equal(model.view.proposal.values.title, '문제해결글쓰기 개요 작성')
})

test('reset accepts an explicit presentation start step', () => {
  let model = createProductDemo(PRODUCT_DEMO_STEP.REVIEW)

  model = dispatch(model, PRODUCT_DEMO_EVENT.RESET, {
    step: PRODUCT_DEMO_STEP.SELECTED,
  })

  assert.equal(model.view.step, PRODUCT_DEMO_STEP.SELECTED)
  assert.deepEqual(model.view.sources.selected, ['notice', 'syllabus'])
  assert.equal(model.view.sources.organizeDisabled, false)
  assert.equal(model.effect.syncUrl, true)
})
