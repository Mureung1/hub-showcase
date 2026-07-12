import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertCodexBinaryVersionOutput,
  parseCodexMethodDecisions,
  renderCodexAppServerMethods,
} from './render-codex-app-server-methods.js'

test('renderCodexAppServerMethods lists every stable and experimental-only method with sparse decisions', () => {
  const markdown = renderCodexAppServerMethods({
    codexVersion: '0.144.0',
    stableSources: {
      clientRequest:
        'type ClientRequest = { "method":"initialize" } | { method : "thread/list" }',
      serverRequest:
        'type ServerRequest = { "method": "item/commandExecution/requestApproval" }',
      serverNotification:
        'type ServerNotification = { "method": "item/agentMessage/delta" }',
      clientNotification:
        'type ClientNotification = { "method": "initialized" }',
    },
    experimentalSources: {
      clientRequest:
        'type ClientRequest = { "method":"initialize" } | { method : "thread/list" } | { "method": "thread/turns/list" }',
      serverRequest:
        'type ServerRequest = { "method": "item/commandExecution/requestApproval" }',
      serverNotification:
        'type ServerNotification = { "method": "item/agentMessage/delta" }',
      clientNotification:
        'type ClientNotification = { "method": "initialized" }',
    },
    decisions: {
      'thread/list': {
        integration: 'raw-wrapper',
        adoption: 'baseline',
        note: '활성 workspace의 대화 목록',
      },
      'thread/turns/list': {
        adoption: 'later',
      },
    },
  })

  assert.match(markdown, /\| Codex 패키지 \| `@openai\/codex@0\.144\.0` \|/)
  assert.match(markdown, /\| Stable method 수 \| 5 \|/)
  assert.match(markdown, /\| Experimental-only method 수 \| 1 \|/)
  assert.match(markdown, /\| 전체 method 수 \| 6 \|/)
  assert.match(
    markdown,
    /\| `thread\/list` \| stable \| raw-wrapper \| baseline \| 활성 workspace의 대화 목록 \|/,
  )
  assert.match(
    markdown,
    /\| `thread\/turns\/list` \| experimental \| schema-only \| later \|  \|/,
  )
  assert.match(
    markdown,
    /\| `initialize` \| stable \| schema-only \| unreviewed \|  \|/,
  )
  assert.equal(countOccurrences(markdown, '`thread/list`'), 1)
})

test('renderCodexAppServerMethods fails closed when a schema contains an unparseable method property', () => {
  const malformedSources = completeSources({
    serverNotification:
      'type ServerNotification = { "method": "warning" } | { method: NotificationMethod }',
  })

  assert.throws(
    () =>
      renderCodexAppServerMethods({
        codexVersion: '0.144.0',
        stableSources: malformedSources,
        experimentalSources: completeSources(),
        decisions: {},
      }),
    /Could not extract every method from stable serverNotification schema: found 2 method properties but captured 1 literal methods/,
  )
})

test('assertCodexBinaryVersionOutput rejects an installed binary that differs from the package pin', () => {
  assert.doesNotThrow(() =>
    assertCodexBinaryVersionOutput('codex-cli 0.144.0', '0.144.0'),
  )
  assert.throws(
    () => assertCodexBinaryVersionOutput('codex-cli 0.145.0', '0.144.0'),
    /Codex binary version 0\.145\.0 does not match package pin 0\.144\.0/,
  )
  assert.throws(
    () => assertCodexBinaryVersionOutput('unexpected output', '0.144.0'),
    /Could not read Codex binary version/,
  )
})

test('renderCodexAppServerMethods rejects decisions for methods outside the pinned schemas', () => {
  assert.throws(
    () =>
      renderCodexAppServerMethods({
        codexVersion: '0.144.0',
        stableSources: completeSources({
          clientRequest: 'type ClientRequest = { "method": "thread/list" }',
        }),
        experimentalSources: completeSources({
          clientRequest: 'type ClientRequest = { "method": "thread/list" }',
        }),
        decisions: {
          'thread/missing': {
            adoption: 'baseline',
          },
        },
      }),
    /Decision references unknown Codex method: thread\/missing/,
  )
})

test('parseCodexMethodDecisions validates the sparse decision JSON values', () => {
  assert.deepEqual(
    parseCodexMethodDecisions({
      'thread/list': {
        integration: 'raw-wrapper',
        adoption: 'baseline',
        note: '대화 목록',
      },
    }),
    {
      'thread/list': {
        integration: 'raw-wrapper',
        adoption: 'baseline',
        note: '대화 목록',
      },
    },
  )
  assert.throws(
    () =>
      parseCodexMethodDecisions({
        'thread/list': {
          integration: 'connected-everywhere',
        },
      }),
    /Invalid integration for thread\/list: connected-everywhere/,
  )
  assert.throws(
    () =>
      parseCodexMethodDecisions({
        'thread/list': {
          adoptoin: 'baseline',
        },
      }),
    /Unknown decision field for thread\/list: adoptoin/,
  )
})

test('renderCodexAppServerMethods rejects method names that collide across message directions', () => {
  const collidingSources = completeSources({
    clientRequest: 'type ClientRequest = { "method": "shared/method" }',
    serverRequest: 'type ServerRequest = { "method": "shared/method" }',
  })

  assert.throws(
    () =>
      renderCodexAppServerMethods({
        codexVersion: '0.144.0',
        stableSources: collidingSources,
        experimentalSources: collidingSources,
        decisions: {},
      }),
    /Codex method appears in multiple message directions: shared\/method/,
  )
})

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1
}

function emptySources(
  overrides: Partial<{
    clientRequest: string
    serverRequest: string
    serverNotification: string
    clientNotification: string
  }> = {},
) {
  return {
    clientRequest: '',
    serverRequest: '',
    serverNotification: '',
    clientNotification: '',
    ...overrides,
  }
}

function completeSources(
  overrides: Parameters<typeof emptySources>[0] = {},
) {
  return emptySources({
    clientRequest: 'type ClientRequest = { "method": "placeholder/request" }',
    serverRequest:
      'type ServerRequest = { "method": "placeholder/serverRequest" }',
    serverNotification:
      'type ServerNotification = { "method": "placeholder/serverNotification" }',
    clientNotification:
      'type ClientNotification = { "method": "placeholder/clientNotification" }',
    ...overrides,
  })
}
