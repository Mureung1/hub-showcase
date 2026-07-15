import { describe, expect, it } from 'vitest';
import { decodeInboundMessage } from '../app-server/protocol/inbound-codec.js';
import { createExactCodexThreadFixture } from './fixtures/exact-codex-thread.js';

const exactThread = createExactCodexThreadFixture();

const exactTurn = {
  id: 'turn_1',
  items: [],
  status: 'completed',
};

function processExited(exitCode: number) {
  return {
    method: 'process/exited',
    params: {
      processHandle: 'process_1',
      exitCode,
      stdout: '',
      stderr: '',
      stdoutCapReached: false,
      stderrCapReached: false,
    },
  };
}

function errorWithHttpStatus(httpStatusCode: number) {
  return {
    method: 'error',
    params: {
      threadId: 'thr_2',
      turnId: 'turn_1',
      willRetry: false,
      error: {
        message: 'failed',
        codexErrorInfo: { httpConnectionFailed: { httpStatusCode } },
      },
    },
  };
}

function fuzzySearchUpdated(score: number) {
  return {
    method: 'fuzzyFileSearch/sessionUpdated',
    params: {
      sessionId: 'search_1',
      query: 'file',
      files: [
        {
          file_name: 'file.ts',
          match_type: 'file',
          path: 'src/file.ts',
          root: '/tmp',
          score,
        },
      ],
    },
  };
}

describe('exact 0.144.4 App Server inbound codec', () => {
  it('classifies correlated responses and errors before request-shaped fields', () => {
    expect(
      decodeInboundMessage({
        id: 1,
        result: { ok: true },
        error: { code: -1, message: 'ignored' },
        method: 'future/request',
      }),
    ).toEqual({ kind: 'response', message: expect.objectContaining({ id: 1 }) });

    expect(
      decodeInboundMessage({
        id: 'rpc-2',
        error: { code: -32603, message: 'failed' },
        method: 'future/request',
      }),
    ).toEqual({ kind: 'error-response', message: expect.objectContaining({ id: 'rpc-2' }) });
  });

  it('does not downgrade invalid correlated ids into notifications', () => {
    expect(decodeInboundMessage({ id: null, error: { code: -32603, message: 'failed' } })).toEqual({
      kind: 'unrecognized',
    });
    expect(decodeInboundMessage({ id: 1.5, method: 'future/request', params: {} })).toEqual({
      kind: 'unrecognized',
    });
  });

  it.each([
    {
      method: 'thread/started',
      params: { thread: exactThread },
    },
    {
      method: 'turn/started',
      params: { threadId: 'thr_2', turn: { ...exactTurn, status: 'inProgress' } },
    },
    {
      method: 'item/agentMessage/delta',
      params: { threadId: 'thr_2', turnId: 'turn_1', itemId: 'item_1', delta: 'hello' },
    },
    {
      method: 'item/completed',
      params: {
        threadId: 'thr_2',
        turnId: 'turn_1',
        completedAtMs: 1,
        item: { type: 'agentMessage', id: 'item_1', text: 'hello' },
      },
    },
    {
      method: 'turn/completed',
      params: { threadId: 'thr_2', turn: exactTurn },
    },
  ])('accepts exact known notification $method', (message) => {
    expect(decodeInboundMessage(message)).toEqual({
      kind: 'server-notification',
      message,
    });
  });

  it('accepts exact generated Server requests without applying schema defaults', () => {
    const commandApproval = {
      id: 7,
      method: 'item/commandExecution/requestApproval',
      params: {
        threadId: 'thr_2',
        turnId: 'turn_1',
        itemId: 'item_1',
        startedAtMs: 123,
      },
    };
    const before = structuredClone(commandApproval);

    expect(decodeInboundMessage(commandApproval)).toEqual({
      kind: 'server-request',
      message: commandApproval,
    });
    expect(commandApproval).toEqual(before);
    expect(commandApproval.params).not.toHaveProperty('environmentId');

    const currentTime = {
      id: 'clock-1',
      method: 'currentTime/read',
      params: { threadId: 'thr_2' },
    };
    expect(decodeInboundMessage(currentTime)).toEqual({
      kind: 'server-request',
      message: currentTime,
    });
  });

  it('keeps known-invalid methods distinct from unknown methods', () => {
    expect(
      decodeInboundMessage({
        id: 8,
        method: 'item/commandExecution/requestApproval',
        params: { threadId: 'thr_2', turnId: 'turn_1', itemId: 'item_1' },
      }),
    ).toEqual({
      kind: 'invalid-server-request',
      message: { id: 8, method: 'item/commandExecution/requestApproval' },
    });

    expect(
      decodeInboundMessage({
        method: 'turn/completed',
        params: { turn: { ...exactTurn, status: 'futureStatus' } },
      }),
    ).toEqual({
      kind: 'invalid-server-notification',
      message: { method: 'turn/completed' },
    });
  });

  it.each([
    {
      label: 'int64',
      message: {
        id: 12,
        method: 'item/commandExecution/requestApproval',
        params: {
          threadId: 'thr_2',
          turnId: 'turn_1',
          itemId: 'item_1',
          startedAtMs: 1e20,
        },
      },
      expected: 'invalid-server-request',
    },
    {
      label: 'uint64',
      message: {
        id: 13,
        method: 'item/tool/requestUserInput',
        params: {
          threadId: 'thr_2',
          turnId: 'turn_1',
          itemId: 'item_1',
          questions: [],
          autoResolutionMs: 1e20,
        },
      },
      expected: 'invalid-server-request',
    },
    {
      label: 'int32',
      message: processExited(2_147_483_648),
      expected: 'invalid-server-notification',
    },
    {
      label: 'uint16',
      message: errorWithHttpStatus(65_536),
      expected: 'invalid-server-notification',
    },
    {
      label: 'uint32',
      message: fuzzySearchUpdated(4_294_967_296),
      expected: 'invalid-server-notification',
    },
  ])('rejects an out-of-range generated $label value as known-invalid', ({ message, expected }) => {
    expect(decodeInboundMessage(message).kind).toBe(expected);
  });

  it.each([
    { label: 'int32', message: processExited(2_147_483_647) },
    { label: 'uint16', message: errorWithHttpStatus(65_535) },
    { label: 'uint32', message: fuzzySearchUpdated(4_294_967_295) },
  ])('accepts the generated $label upper boundary', ({ message }) => {
    expect(decodeInboundMessage(message).kind).toBe('server-notification');
  });

  it('preserves generic routing for unknown requests and notifications', () => {
    expect(decodeInboundMessage({ id: 9, method: 'future/request' })).toEqual({
      kind: 'unknown-server-request',
      message: { id: 9, method: 'future/request', params: {} },
    });
    expect(decodeInboundMessage({ method: 'future/notification' })).toEqual({
      kind: 'unknown-notification',
      message: { method: 'future/notification', params: {} },
    });
    expect(decodeInboundMessage({ id: 10, method: 'future/request', params: [] })).toEqual({
      kind: 'unrecognized',
    });
    expect(decodeInboundMessage({ method: 'future/notification', params: 'invalid' })).toEqual({
      kind: 'unrecognized',
    });
  });

  it.each([
    { id: 11, method: 'skill/requestApproval', params: { itemId: 'item_1', skillName: 'web' } },
    {
      method: 'reasoningTextDelta',
      params: { threadId: 'thr_2', turnId: 'turn_1', itemId: 'item_1', delta: 'x' },
    },
    {
      method: 'reasoningSummaryTextDelta',
      params: { threadId: 'thr_2', turnId: 'turn_1', itemId: 'item_1', delta: 'x' },
    },
    {
      method: 'rawResponseItem/completed',
      params: { threadId: 'thr_2', turnId: 'turn_1', item: {} },
    },
  ])('does not disguise legacy or TypeScript-only $method as exact schema coverage', (message) => {
    expect(decodeInboundMessage(message).kind).toMatch(/^unknown-/);
  });
});
