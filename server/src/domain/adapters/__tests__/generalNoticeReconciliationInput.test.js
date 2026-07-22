import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { normalizeGeneralNoticeReconciliationInput } from '../normalizeGeneralNoticeReconciliationInput.js'

const fixtureRoot = new URL('../../../../../test-corpus/fixtures/', import.meta.url)

function fixture(path) {
  return JSON.parse(readFileSync(new URL(path, fixtureRoot), 'utf8'))
}

function input() {
  return {
    normalizedNotice: fixture('knu-crawler-v0.4.4/normalized-notice-720.sample.json'),
    candidatePayload: fixture('knu-rule-candidates-v0.4/knu-720-900001.candidates.sample.json'),
    boardRegistry: fixture('knu-crawler-v0.4.4/knu-board-registry.v0.2.sample.json'),
  }
}

test('wraps existing KNU adapters in the versioned reconciliation boundary', () => {
  const result = normalizeGeneralNoticeReconciliationInput(input())

  assert.equal(
    result.schemaVersion,
    'noticepilot.generalNoticeReconciliationInput.v0.1',
  )
  assert.equal(result.extractionResult.schemaContractVersion, 'noticepilot.domain.v1')
  assert.deepEqual(result.candidateDispositions, [
    {
      sourceCandidateId: 'cand-knu-720-900001-aaaaaaaaaaaa',
      disposition: 'eligible_for_reconciliation',
    },
    {
      sourceCandidateId: 'cand-knu-720-900001-bbbbbbbbbbbb',
      disposition: 'requires_review',
    },
  ])
  assert.equal(
    result.extractionResult.calendarEventCandidates.every(
      (candidate) => candidate.candidateStatus === 'pending',
    ),
    true,
  )
})

test('rejects a candidate payload that no longer binds the normalized content', () => {
  const value = input()
  value.candidatePayload.sourceContentHash = '0'.repeat(64)
  assert.throws(() => normalizeGeneralNoticeReconciliationInput(value))
})
