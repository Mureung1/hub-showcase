import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCodexTurnSettings,
  isCodexSettingsSettled,
} from './use-prepared-product-chat.js'

test('maps one advertised prepared Chat selection to exact Turn settings', () => {
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

test('unblocks prepared Chat after Codex settings load or fail', () => {
  assert.equal(isCodexSettingsSettled('idle'), false)
  assert.equal(isCodexSettingsSettled('loading'), false)
  assert.equal(isCodexSettingsSettled('loaded'), true)
  assert.equal(isCodexSettingsSettled('failed'), true)
})
