import assert from 'node:assert/strict'
import test from 'node:test'

import {
  OrganizeSourcesActionError,
  renderOrganizeSourcesActionText,
} from './organize-sources-action.js'

test('organize_sources renderer preserves ordered JSON paths without a trailing newline', () => {
  const text = renderOrganizeSourcesActionText([
    { relativePath: '자료/둘째.txt' },
    { relativePath: '자료/첫째 "안내".md' },
  ])

  assert.equal(
    text,
    [
      'ActionInvocation: organize_sources',
      'Selected SemesterWorkspace file references:',
      '- "자료/둘째.txt"',
      '- "자료/첫째 \\"안내\\".md"',
    ].join('\n'),
  )
  assert.equal(text.endsWith('\n'), false)
})

test('organize_sources renderer rejects text beyond its UTF-8 bound', () => {
  assert.throws(
    () =>
      renderOrganizeSourcesActionText(
        Array.from({ length: 16 }, (_, index) => ({
          relativePath: `${index}-${'가'.repeat(1_000)}.md`,
        })),
      ),
    (error: unknown) =>
      error instanceof OrganizeSourcesActionError &&
      error.code === 'action_context_invalid',
  )
})
