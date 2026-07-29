import assert from 'node:assert/strict'
import test from 'node:test'

import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  PRODUCT_ACTION_FILE_REF_MAX_ENTRIES,
  type ProductWorkspaceSource,
} from '@ay-ple/product-contract'

import { streamPreparedAction } from './prepared-product-api.js'
import {
  PreparedSourceWorkbench,
  reconcilePreparedActionPaths,
  togglePreparedActionPath,
  type PreparedWorkspaceSourcesController,
} from './prepared-source-workbench.js'

test('prepared source display and frozen action request preserve one mixed source-list order', async () => {
  const sources = [
    source('A.txt', 'text'),
    source('A/a.pdf', 'pdf'),
    source('Z.pptx', 'unsupported'),
    source('a.txt', 'text'),
    source('가.pdf', 'pdf'),
  ]
  const expectedPaths = sources.map(({ relativePath }) => relativePath)
  let selected: readonly string[] = []
  for (const candidate of [...sources].reverse()) {
    selected = togglePreparedActionPath(
      selected,
      candidate.relativePath,
      sources,
    )
  }

  const previousReact = Reflect.get(globalThis, 'React')
  Reflect.set(globalThis, 'React', React)
  let markup: string
  try {
    markup = renderToStaticMarkup(
      React.createElement(PreparedSourceWorkbench, {
        controller: {
          listView: { state: 'loaded', sources },
          selectedSource: undefined,
          selectedActionPaths: selected,
          previewView: { state: 'idle' },
          citationNotice: undefined,
          reload: async () => undefined,
          selectSource: () => undefined,
          toggleActionSource: () => undefined,
          navigateCitation: () => undefined,
        } satisfies PreparedWorkspaceSourcesController,
        action: {
          invocationEnabled: true,
          selectionLocked: false,
          onInvoke: () => undefined,
        },
      }),
    )
  } finally {
    if (previousReact === undefined) {
      Reflect.deleteProperty(globalThis, 'React')
    } else {
      Reflect.set(globalThis, 'React', previousReact)
    }
  }
  const displayedEntries = expectedPaths.map((relativePath) => ({
    relativePath,
    position: markup.indexOf(
      `aria-label="${relativePath} 학기 정보 정리 자료 선택`,
    ),
  }))
  assert.ok(displayedEntries.every(({ position }) => position >= 0))
  assert.equal(
    new Set(displayedEntries.map(({ position }) => position)).size,
    expectedPaths.length,
  )
  const displayedPaths = displayedEntries
    .sort((left, right) => left.position - right.position)
    .map(({ relativePath }) => relativePath)

  const originalFetch = globalThis.fetch
  let requestBody: string | undefined
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body)
    return new Response('', {
      status: 200,
      headers: { 'content-type': 'application/x-ndjson' },
    })
  }
  try {
    await streamPreparedAction(
      {
        files: selected.map((relativePath) => ({ relativePath })),
      },
      () => undefined,
    )
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.deepEqual(displayedPaths, expectedPaths)
  assert.deepEqual(selected, expectedPaths)
  assert.deepEqual(
    (JSON.parse(requestBody ?? '') as { files: unknown }).files,
    expectedPaths.map((relativePath) => ({ relativePath })),
  )
})

test('prepared action selection follows fresh source-list order and regular-file intersection', () => {
  const initialSources = [
    source('materials/alpha.txt', 'text'),
    source('materials/lecture.pdf', 'pdf'),
    source('materials/zeta.pptx', 'unsupported'),
  ]
  let selected: readonly string[] = []

  selected = togglePreparedActionPath(
    selected,
    'materials/zeta.pptx',
    initialSources,
  )
  selected = togglePreparedActionPath(
    selected,
    'materials/lecture.pdf',
    initialSources,
  )
  selected = togglePreparedActionPath(
    selected,
    'materials/alpha.txt',
    initialSources,
  )

  assert.deepEqual(selected, [
    'materials/alpha.txt',
    'materials/lecture.pdf',
    'materials/zeta.pptx',
  ])
  assert.deepEqual(
    reconcilePreparedActionPaths(selected, [
      source('materials/zeta.pptx', 'pdf'),
      source('materials/alpha.txt', 'unsupported'),
      source('materials/new.txt', 'text'),
      source('materials/lecture.pdf', 'text'),
    ]),
    [
      'materials/zeta.pptx',
      'materials/alpha.txt',
      'materials/lecture.pdf',
    ],
  )
})

test('prepared action selection closes only new choices at the sixteen-file limit', () => {
  const sources = Array.from(
    { length: PRODUCT_ACTION_FILE_REF_MAX_ENTRIES + 1 },
    (_, index) =>
      source(
        `materials/${String(index + 1).padStart(2, '0')}.txt`,
        'text',
      ),
  )
  let selected: readonly string[] = []
  for (
    const candidate of sources.slice(
      0,
      PRODUCT_ACTION_FILE_REF_MAX_ENTRIES,
    )
  ) {
    selected = togglePreparedActionPath(
      selected,
      candidate.relativePath,
      sources,
    )
  }

  assert.equal(selected.length, PRODUCT_ACTION_FILE_REF_MAX_ENTRIES)
  assert.deepEqual(
    togglePreparedActionPath(
      selected,
      sources[PRODUCT_ACTION_FILE_REF_MAX_ENTRIES]!.relativePath,
      sources,
    ),
    selected,
  )
  assert.equal(
    togglePreparedActionPath(selected, selected[0]!, sources).length,
    PRODUCT_ACTION_FILE_REF_MAX_ENTRIES - 1,
  )
})

function source(
  relativePath: string,
  previewKind: ProductWorkspaceSource['previewKind'],
): ProductWorkspaceSource {
  return { relativePath, previewKind, size: 32 }
}
