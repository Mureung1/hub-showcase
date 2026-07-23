import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LandingReleaseDisplayError,
  decodeLandingReleaseDisplay,
} from './release-display.js'
import {
  landingReleaseDisplayWith,
  validLandingReleaseDisplay,
} from './testing/release-display-fixtures.test.js'

test('release display exact-decodes a version-bound publication artifact', () => {
  assert.deepEqual(
    decodeLandingReleaseDisplay(validLandingReleaseDisplay),
    validLandingReleaseDisplay,
  )
})

test('release display rejects missing and unknown fields', () => {
  assertInvalidReleaseDisplay(undefined)
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      delete value.runtime
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      value.latest = true
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const links = value.links as Record<string, unknown>
      delete links.security
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const runtime = value.runtime as Record<string, unknown>
      runtime.downloadLabel = 'small'
    }),
  )
})

test('release display rejects moving commands, placeholders and release mismatch', () => {
  for (const command of [
    'npx ay-ple',
    'npx ay-ple@latest',
    'npx --yes ay-ple@7.4.2-preview.fixture.3',
    'npx ay-ple@<release-version>',
    'npm install -g ay-ple@7.4.2-preview.fixture.3',
  ]) {
    assertInvalidReleaseDisplay(
      landingReleaseDisplayWith((value) => {
        const release = value.release as Record<string, unknown>
        release.exactCommand = command
      }),
    )
  }

  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const runtime = value.runtime as Record<string, unknown>
      runtime.applicationVersion = '7.4.2-preview.fixture.4'
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const compatibility = value.compatibility as Record<string, unknown>
      compatibility.applicationVersion = '7.4.2-preview.fixture.4'
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const links = value.links as Record<string, unknown>
      links.applicationVersion = '7.4.2-preview.fixture.4'
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const release = value.release as Record<string, unknown>
      release.applicationReleaseTag = 'preview-current'
    }),
  )
})

test('release display rejects unsafe size, cache and public destination values', () => {
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const runtime = value.runtime as Record<string, unknown>
      runtime.conservativeFreeSpaceBytes = 1
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const runtime = value.runtime as Record<string, unknown>
      runtime.cacheDisplayLocation = '/Users/student/Library/AY-PLE'
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const links = value.links as Record<string, unknown>
      links.docs = { url: 'http://example.com/docs' }
    }),
  )
  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      const links = value.links as Record<string, unknown>
      links.docs = {}
    }),
  )
})

test('rollback is absent by default and exact-version-bound when available', () => {
  const withRollback = landingReleaseDisplayWith((value) => {
    value.rollback = {
      status: 'still-supported',
      applicationVersion: '7.3.1',
      exactCommand: 'npx ay-ple@7.3.1',
      releaseEvidence: {
        url: 'https://example.com/ay-ple-fixture/releases/v7.3.1',
      },
    }
  })
  const decoded = decodeLandingReleaseDisplay(withRollback)
  assert.equal(decoded.rollback?.exactCommand, 'npx ay-ple@7.3.1')

  assertInvalidReleaseDisplay(
    landingReleaseDisplayWith((value) => {
      value.rollback = {
        status: 'still-supported',
        applicationVersion: '7.3.1',
        exactCommand: 'npx ay-ple@latest',
        releaseEvidence: {
          url: 'https://example.com/ay-ple-fixture/releases/v7.3.1',
        },
      }
    }),
  )
})

function assertInvalidReleaseDisplay(value: unknown): void {
  assert.throws(
    () => decodeLandingReleaseDisplay(value),
    LandingReleaseDisplayError,
  )
}
