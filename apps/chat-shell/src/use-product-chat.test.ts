import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCodexTurnSettings,
  isCodexSettingsSettled,
  isProductChatAvailable,
  productChatMaterials,
} from './use-product-chat.js'

test('keeps general AY Chat available before a course is created', () => {
  assert.equal(
    isProductChatAvailable(
      { state: 'ready' },
      {
        state: 'ready',
        confirmedRevision: 0,
        course: null,
        materials: [],
        recovery: null,
      },
    ),
    true,
  )
})

test('maps the selected advertised controls to one exact Codex Turn setting', () => {
  const model = {
    model: 'gpt-current',
    displayName: 'GPT Current',
    description: 'Current model',
    isDefault: true,
    defaultReasoningEffort: 'medium',
    supportedReasoningEfforts: [
      { reasoningEffort: 'low', description: 'Quick' },
      { reasoningEffort: 'medium', description: 'Balanced' },
    ],
    fastModeAvailable: true,
    fastModeDefault: false,
  } as const

  assert.deepEqual(createCodexTurnSettings(model, 'low', true), {
    model: 'gpt-current',
    reasoningEffort: 'low',
    serviceTier: 'fast',
  })
  assert.equal(createCodexTurnSettings(model, 'unknown', false), undefined)
})

test('keeps product operations closed until Codex settings load or fail', () => {
  assert.equal(isCodexSettingsSettled('idle'), false)
  assert.equal(isCodexSettingsSettled('loading'), false)
  assert.equal(isCodexSettingsSettled('loaded'), true)
  assert.equal(isCodexSettingsSettled('failed'), true)
})

test('omits selected academic materials from course-free general Chat', () => {
  const material = {
    id: 'material_1',
    relativePath: 'note.txt',
    digest: 'a'.repeat(64),
    mediaType: 'text/plain; charset=utf-8',
    size: 4,
  } as const

  assert.deepEqual(
    productChatMaterials(
      {
        state: 'ready',
        confirmedRevision: 0,
        course: null,
        materials: [material],
        recovery: null,
      },
      [material],
    ),
    [],
  )
})
