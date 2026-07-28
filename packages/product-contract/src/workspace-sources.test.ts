import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES,
  PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES,
  PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES,
  ProductContractError,
  decodeProductWorkspaceSourceList,
  decodeProductWorkspaceTextPreview,
} from '@ay-ple/product-contract'

const source = {
  relativePath: '운영체제/강의 자료/week-01.md',
  size: 1_024,
  previewKind: 'text',
} as const

test('workspace source list accepts only bounded Browser-safe file projections', () => {
  const value = {
    sources: [
      source,
      {
        relativePath: '운영체제/slides/week-01.pdf',
        size: 8_192,
        previewKind: 'pdf',
      },
      {
        relativePath: '운영체제/slides/week-01.pptx',
        size: 16_384,
        previewKind: 'unsupported',
      },
    ],
  } as const

  assert.deepEqual(decodeProductWorkspaceSourceList(value), value)
})

test('workspace source list rejects extra fields and unsafe file metadata', () => {
  for (const invalid of [
    { sources: [source], absoluteRoot: '/private/semester' },
    { sources: [{ ...source, absolutePath: '/private/lecture.md' }] },
    { sources: [{ ...source, relativePath: '/lecture.md' }] },
    { sources: [{ ...source, relativePath: '../lecture.md' }] },
    { sources: [{ ...source, relativePath: 'week-01\\lecture.md' }] },
    { sources: [{ ...source, relativePath: 'week-01//lecture.md' }] },
    { sources: [{ ...source, relativePath: 'week-01/\0lecture.md' }] },
    { sources: [{ ...source, size: -1 }] },
    { sources: [{ ...source, size: 1.5 }] },
    { sources: [{ ...source, previewKind: 'html' }] },
    { sources: [source, source] },
    {
      sources: [
        {
          ...source,
          relativePath: '가'.repeat(
            PRODUCT_WORKSPACE_SOURCE_RELATIVE_PATH_MAX_BYTES,
          ),
        },
      ],
    },
    {
      sources: Array.from(
        { length: PRODUCT_WORKSPACE_SOURCE_LIST_MAX_ENTRIES + 1 },
        (_, index) => ({
          ...source,
          relativePath: `lecture-${index}.md`,
        }),
      ),
    },
  ]) {
    assert.throws(
      () => decodeProductWorkspaceSourceList(invalid),
      ProductContractError,
    )
  }
})

test('workspace text preview carries exact content identity without app-owned state', () => {
  const value = {
    relativePath: source.relativePath,
    digest: 'a'.repeat(64),
    text: '# 1주차\n\n프로세스와 스레드',
    truncated: false,
  } as const

  assert.deepEqual(decodeProductWorkspaceTextPreview(value), value)
})

test('workspace text preview rejects stale shapes, unsafe identity, and oversized text', () => {
  for (const invalid of [
    {
      relativePath: source.relativePath,
      digest: 'A'.repeat(64),
      text: '본문',
      truncated: false,
    },
    {
      relativePath: source.relativePath,
      digest: 'a'.repeat(63),
      text: '본문',
      truncated: false,
    },
    {
      relativePath: '../lecture.md',
      digest: 'a'.repeat(64),
      text: '본문',
      truncated: false,
    },
    {
      relativePath: source.relativePath,
      digest: 'a'.repeat(64),
      text: '가'.repeat(PRODUCT_WORKSPACE_TEXT_PREVIEW_MAX_BYTES),
      truncated: true,
    },
    {
      relativePath: source.relativePath,
      digest: 'a'.repeat(64),
      text: '본문',
      truncated: 'false',
    },
    {
      relativePath: source.relativePath,
      digest: 'a'.repeat(64),
      text: '본문',
      truncated: false,
      contentBytes: 6,
    },
  ]) {
    assert.throws(
      () => decodeProductWorkspaceTextPreview(invalid),
      ProductContractError,
    )
  }
})
