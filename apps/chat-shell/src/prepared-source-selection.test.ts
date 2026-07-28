import assert from 'node:assert/strict'
import test from 'node:test'

import type { ProductWorkspaceSource } from '@ay-ple/product-contract'

import {
  preparedSourceActionLimit,
  reconcilePreparedActionPaths,
  togglePreparedActionPath,
} from './prepared-source-workbench.js'

test('prepared action selection follows fresh source-list order and text intersection', () => {
  const initialSources = [
    source('materials/alpha.txt', 'text'),
    source('materials/lecture.pdf', 'pdf'),
    source('materials/zeta.md', 'text'),
  ]
  let selected: readonly string[] = []

  selected = togglePreparedActionPath(
    selected,
    'materials/zeta.md',
    initialSources,
  )
  selected = togglePreparedActionPath(
    selected,
    'materials/alpha.txt',
    initialSources,
  )

  assert.deepEqual(selected, [
    'materials/alpha.txt',
    'materials/zeta.md',
  ])
  assert.deepEqual(
    reconcilePreparedActionPaths(selected, [
      source('materials/zeta.md', 'pdf'),
      source('materials/alpha.txt', 'text'),
      source('materials/new.txt', 'text'),
    ]),
    ['materials/alpha.txt'],
  )
})

test('prepared action selection closes only new choices at the sixteen-file limit', () => {
  const sources = Array.from(
    { length: preparedSourceActionLimit + 1 },
    (_, index) =>
      source(
        `materials/${String(index + 1).padStart(2, '0')}.txt`,
        'text',
      ),
  )
  let selected: readonly string[] = []
  for (const candidate of sources.slice(0, preparedSourceActionLimit)) {
    selected = togglePreparedActionPath(
      selected,
      candidate.relativePath,
      sources,
    )
  }

  assert.equal(selected.length, preparedSourceActionLimit)
  assert.deepEqual(
    togglePreparedActionPath(
      selected,
      sources[preparedSourceActionLimit]!.relativePath,
      sources,
    ),
    selected,
  )
  assert.equal(
    togglePreparedActionPath(selected, selected[0]!, sources).length,
    preparedSourceActionLimit - 1,
  )
})

function source(
  relativePath: string,
  previewKind: ProductWorkspaceSource['previewKind'],
): ProductWorkspaceSource {
  return { relativePath, previewKind, size: 32 }
}
