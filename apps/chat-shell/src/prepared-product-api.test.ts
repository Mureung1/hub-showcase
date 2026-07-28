import assert from 'node:assert/strict'
import test from 'node:test'

import {
  fetchPreparedWorkspaceSources,
  fetchPreparedWorkspaceText,
  preparedWorkspacePdfUrl,
  PreparedProductApiError,
  streamPreparedAction,
  streamPreparedChat,
} from './prepared-product-api.js'

test('prepared Browser stream rejects an unknown operation frame', async () => {
  const originalFetch = globalThis.fetch
  let requestBody: string | undefined
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body)
    return new Response(
      `${JSON.stringify({
        type: 'unknown.frame',
        operationId: `action_${'1'.repeat(32)}`,
      })}\n`,
      {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
      },
    )
  }
  try {
    await assert.rejects(
      streamPreparedChat({ text: '학기 작업을 도와 줘.' }, () => undefined),
      (error: unknown) => {
        assert.ok(error instanceof PreparedProductApiError)
        assert.equal(error.provenance, 'invalid_transport')
        return true
      },
    )
    assert.deepEqual(JSON.parse(requestBody ?? ''), {
      text: '학기 작업을 도와 줘.',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser sends the selected Codex settings as one complete triple', async () => {
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
    await streamPreparedChat(
      {
        text: '학기 작업을 도와 줘.',
        codexSettings: {
          model: 'gpt-current',
          reasoningEffort: 'high',
          serviceTier: 'fast',
        },
      },
      () => undefined,
    )
    assert.deepEqual(JSON.parse(requestBody ?? ''), {
      text: '학기 작업을 도와 줘.',
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'high',
        serviceTier: 'fast',
      },
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser sends one exact organize_sources action through the shared stream', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl: string | undefined
  let requestBody: string | undefined
  const frames: unknown[] = []
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestBody = String(init?.body)
    return new Response(
      `${JSON.stringify({
        type: 'operation.preparing',
        operationId: `operation_${'1'.repeat(32)}`,
      })}\n`,
      {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson' },
      },
    )
  }
  try {
    await streamPreparedAction(
      {
        files: [
          { relativePath: 'materials/notice.md' },
          { relativePath: 'materials/syllabus.txt' },
        ],
        codexSettings: {
          model: 'gpt-current',
          reasoningEffort: 'high',
          serviceTier: 'fast',
        },
      },
      (frame) => frames.push(frame),
    )
    assert.equal(requestUrl, '/api/product/actions')
    assert.deepEqual(JSON.parse(requestBody ?? ''), {
      action: 'organize_sources',
      files: [
        { relativePath: 'materials/notice.md' },
        { relativePath: 'materials/syllabus.txt' },
      ],
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'high',
        serviceTier: 'fast',
      },
    })
    assert.deepEqual(frames, [
      {
        type: 'operation.preparing',
        operationId: `operation_${'1'.repeat(32)}`,
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser marks a valid JSON action rejection as server provenance', async () => {
  const originalFetch = globalThis.fetch
  try {
    for (const status of [400, 409]) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            code: 'action_context_stale',
            displayMessage:
              '선택한 자료가 변경되었습니다. 자료를 다시 확인해 주세요.',
          }),
          {
            status,
            headers: { 'content-type': 'application/json' },
          },
        )
      await assert.rejects(
        streamPreparedAction(
          { files: [{ relativePath: 'assignment.txt' }] },
          () => undefined,
        ),
        (error: unknown) => {
          assert.ok(error instanceof PreparedProductApiError)
          assert.equal(error.provenance, 'server_rejection')
          return true
        },
      )
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser decodes the read-only SemesterWorkspace source projection', async () => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  globalThis.fetch = async (input) => {
    requested.push(String(input))
    return new Response(
      JSON.stringify({
        sources: [
          {
            relativePath: '강의/outline.txt',
            size: 31,
            previewKind: 'text',
          },
          {
            relativePath: 'lecture.pdf',
            size: 2048,
            previewKind: 'pdf',
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  }
  try {
    assert.deepEqual(await fetchPreparedWorkspaceSources(), {
      sources: [
        {
          relativePath: '강의/outline.txt',
          size: 31,
          previewKind: 'text',
        },
        {
          relativePath: 'lecture.pdf',
          size: 2048,
          previewKind: 'pdf',
        },
      ],
    })
    assert.deepEqual(requested, ['/api/product/sources'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser fetches text and builds relative PDF preview URLs', async () => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  globalThis.fetch = async (input) => {
    requested.push(String(input))
    return new Response(
      JSON.stringify({
        relativePath: '강의 계획/outline.txt',
        digest: 'a'.repeat(64),
        text: '마감은 금요일입니다.',
        truncated: false,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  }
  try {
    assert.deepEqual(
      await fetchPreparedWorkspaceText('강의 계획/outline.txt'),
      {
        relativePath: '강의 계획/outline.txt',
        digest: 'a'.repeat(64),
        text: '마감은 금요일입니다.',
        truncated: false,
      },
    )
    assert.deepEqual(requested, [
      '/api/product/sources/text?relativePath=%EA%B0%95%EC%9D%98+%EA%B3%84%ED%9A%8D%2Foutline.txt',
    ])
    assert.equal(
      preparedWorkspacePdfUrl('강의 계획/lecture 01.pdf'),
      '/api/product/sources/pdf?relativePath=%EA%B0%95%EC%9D%98+%EA%B3%84%ED%9A%8D%2Flecture+01.pdf',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser does not preflight the PDF URL', () => {
  const originalFetch = globalThis.fetch
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    throw new Error('unexpected PDF preflight')
  }
  try {
    assert.equal(
      preparedWorkspacePdfUrl('lecture.pdf'),
      '/api/product/sources/pdf?relativePath=lecture.pdf',
    )
    assert.equal(fetched, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser rejects a text preview for a different relative path', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        relativePath: 'other.txt',
        digest: 'b'.repeat(64),
        text: '다른 파일',
        truncated: false,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  try {
    await assert.rejects(
      fetchPreparedWorkspaceText('requested.txt'),
      PreparedProductApiError,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
