import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ApplicationCompatibilityContractError,
  decodeApplicationCompatibilityDescriptor,
} from './host-contract.js'

const compatibility = {
  schemaVersion: 1,
  application: {
    packageName: 'ay-ple',
    version: '0.1.0-preview.1',
  },
  platform: {
    os: 'darwin',
    arch: 'arm64',
    minimumMacosVersion: '13.5',
  },
  node: { range: '>=22.12 <23' },
  npm: { range: '>=10 <11' },
  browsers: [
    {
      name: 'Google Chrome',
      bundleId: 'com.google.Chrome',
      candidateLocations: {
        system: '/Applications/Google Chrome.app',
        userHomeRelative: 'Applications/Google Chrome.app',
      },
      minimumMajor: 130,
    },
    {
      name: 'Chromium',
      bundleId: 'org.chromium.Chromium',
      candidateLocations: {
        system: '/Applications/Chromium.app',
        userHomeRelative: 'Applications/Chromium.app',
      },
      minimumMajor: 130,
    },
  ],
  workspaceBundle: {
    descriptorResource: 'resources/workspace/bundle.json',
    descriptorSha256: 'a'.repeat(64),
  },
} as const

test('compatibility descriptor exact-decodes preflight authority', () => {
  assert.deepEqual(
    decodeApplicationCompatibilityDescriptor(compatibility),
    compatibility,
  )
  assert.throws(
    () =>
      decodeApplicationCompatibilityDescriptor({
        ...compatibility,
        latestBrowser: true,
      }),
    ApplicationCompatibilityContractError,
  )
  assert.throws(
    () =>
      decodeApplicationCompatibilityDescriptor({
        ...compatibility,
        node: { range: '>=20' },
      }),
    ApplicationCompatibilityContractError,
  )
  assert.throws(
    () =>
      decodeApplicationCompatibilityDescriptor({
        ...compatibility,
        browsers: compatibility.browsers.slice().reverse(),
      }),
    ApplicationCompatibilityContractError,
  )
})
