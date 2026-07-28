import assert from 'node:assert/strict'
import test from 'node:test'

import {
  fetchPreparedWorkspaceSources,
  fetchPreparedWorkspaceText,
  fetchPreparedWorkspacePdf,
  PreparedProductApiError,
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
      PreparedProductApiError,
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

test('prepared Browser fetches text and validated PDF previews', async () => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  globalThis.fetch = async (input) => {
    requested.push(String(input))
    if (String(input).startsWith('/api/product/sources/pdf?')) {
      return new Response(new Blob(['%PDF-1.4'], {
        type: 'application/pdf',
      }), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })
    }
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
    const pdf = await fetchPreparedWorkspacePdf(
      '강의 계획/lecture 01.pdf',
    )
    assert.equal(pdf.type, 'application/pdf')
    assert.equal(await pdf.text(), '%PDF-1.4')
    assert.equal(
      requested.at(-1),
      '/api/product/sources/pdf?relativePath=%EA%B0%95%EC%9D%98+%EA%B3%84%ED%9A%8D%2Flecture+01.pdf',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prepared Browser rejects failed and non-PDF preview responses', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: 'invalid_pdf',
          displayMessage: '자료를 미리볼 수 없습니다.',
        }),
        {
          status: 415,
          headers: { 'content-type': 'application/json' },
        },
      )
    await assert.rejects(
      fetchPreparedWorkspacePdf('broken.pdf'),
      PreparedProductApiError,
    )

    globalThis.fetch = async () =>
      new Response('%PDF-1.4', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    await assert.rejects(
      fetchPreparedWorkspacePdf('wrong-content-type.pdf'),
      PreparedProductApiError,
    )
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
