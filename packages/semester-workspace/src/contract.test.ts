import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WorkspaceBundleContractError,
  decodeWorkspaceBundleDescriptor,
} from './contract.js'

const descriptor = {
  schemaVersion: 1,
  bundleId: 'semester-workspace-bundle-v1',
  roots: [
    {
      kind: 'instructions',
      root: 'AGENTS.md',
      skillName: null,
      entries: [
        {
          relativePath: 'AGENTS.md',
          type: 'file',
          mode: '0644',
          bytes: 128,
          sha256: 'a'.repeat(64),
        },
      ],
      completeTreeSha256: 'b'.repeat(64),
    },
    {
      kind: 'skill',
      root: '.agents/skills/ay-ple-first-assignment',
      skillName: 'ay-ple-first-assignment',
      entries: [
        {
          relativePath: 'SKILL.md',
          type: 'file',
          mode: '0644',
          bytes: 256,
          sha256: 'c'.repeat(64),
        },
      ],
      completeTreeSha256: 'd'.repeat(64),
    },
  ],
  completeTreeSha256: 'e'.repeat(64),
} as const

test('workspace bundle descriptor exact-decodes the declared root roster', () => {
  assert.deepEqual(decodeWorkspaceBundleDescriptor(descriptor), descriptor)
  assert.throws(
    () =>
      decodeWorkspaceBundleDescriptor({
        ...descriptor,
        setupSkill: 'semester-start',
      }),
    WorkspaceBundleContractError,
  )
  assert.throws(
    () =>
      decodeWorkspaceBundleDescriptor({
        ...descriptor,
        roots: descriptor.roots.slice(0, 1),
      }),
    WorkspaceBundleContractError,
  )
  assert.throws(
    () =>
      decodeWorkspaceBundleDescriptor({
        ...descriptor,
        roots: [
          descriptor.roots[0],
          {
            ...descriptor.roots[1],
            entries: [
              descriptor.roots[1].entries[0],
              descriptor.roots[1].entries[0],
            ],
          },
        ],
      }),
    WorkspaceBundleContractError,
  )
})
