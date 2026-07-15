import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  decodeGeneratedClientResponse,
  type DecodedClientResponseFor,
} from '../app-server/protocol/generated-client-response.js';
import type { GeneratedClientRequestMethod } from '../app-server/protocol/generated-client-contract.js';
import {
  createExactInitializeResponseFixture,
  createExactModelListResponseFixture,
  createExactThreadResumeResponseFixture,
  createExactThreadStartResponseFixture,
  createExactTurnStartResponseFixture,
} from './fixtures/exact-codex-responses.js';

describe('decodeGeneratedClientResponse', () => {
  const exactResponses: ReadonlyArray<
    readonly [GeneratedClientRequestMethod, unknown, Record<string, unknown>]
  > = [
    ['initialize', createExactInitializeResponseFixture(), createExactInitializeResponseFixture()],
    [
      'thread/start',
      createExactThreadStartResponseFixture(),
      createExactThreadStartResponseFixture(),
    ],
    [
      'thread/resume',
      createExactThreadResumeResponseFixture(),
      createExactThreadResumeResponseFixture(),
    ],
    ['turn/start', createExactTurnStartResponseFixture(), createExactTurnStartResponseFixture()],
    ['turn/interrupt', { ignoredExactExtra: true }, { ignoredExactExtra: true }],
    [
      'model/list',
      createExactModelListResponseFixture(),
      { ...createExactModelListResponseFixture(), nextCursor: null },
    ],
  ];

  it.each(exactResponses)(
    'accepts an exact %s result without mutating its wire meaning',
    (method, result, expected) => {
      const original = structuredClone(result);

      expect(decodeGeneratedClientResponse(method, result)).toEqual(expected);
      expect(result).toEqual(original);
    },
  );

  it.each([
    ['thread/start', createExactThreadStartResponseFixture()],
    ['thread/resume', createExactThreadResumeResponseFixture()],
    ['turn/start', createExactTurnStartResponseFixture()],
    ['turn/interrupt', { ignoredExactExtra: true }],
  ] as const)('returns the original schema-valid %s object', (method, result) => {
    expect(decodeGeneratedClientResponse(method, result)).toBe(result);
  });

  it('exposes only generated-backed lifecycle identity fields to internal consumers', () => {
    expectTypeOf<DecodedClientResponseFor<'thread/start'>>().toEqualTypeOf<{
      thread: { id: string };
    }>();
    expectTypeOf<DecodedClientResponseFor<'thread/resume'>>().toEqualTypeOf<{
      thread: { id: string };
    }>();
    expectTypeOf<DecodedClientResponseFor<'turn/start'>>().toEqualTypeOf<{
      turn: { id: string };
    }>();
    expectTypeOf<DecodedClientResponseFor<'turn/interrupt'>>().toEqualTypeOf<
      Record<string, unknown>
    >();
  });

  it('preserves schema-valid omissions and extras without donor default injection', () => {
    const result = createExactThreadStartResponseFixture() as Record<string, unknown>;
    result.extension = { preserved: true };

    const decoded = decodeGeneratedClientResponse('thread/start', result);

    expect(decoded).toBe(result);
    expect(decoded).not.toHaveProperty('reasoningEffort');
    expect(decoded).not.toHaveProperty('runtimeWorkspaceRoots');
    expect(decoded).toHaveProperty('extension', { preserved: true });
  });

  it('preserves schema-valid Turn and ThreadItem omissions without recursive projection', () => {
    const result = {
      turn: {
        id: 'turn_1',
        status: 'failed',
        error: { message: 'failed', codexErrorInfo: { httpConnectionFailed: {} } },
        items: [
          {
            type: 'userMessage',
            id: 'user_1',
            content: [
              { type: 'text', text: 'hello' },
              { type: 'image', url: 'https://example.test/image.png', detail: null },
              { type: 'localImage', path: '/tmp/image.png', detail: null },
            ],
          },
          { type: 'agentMessage', id: 'agent_1', text: 'hello' },
          { type: 'reasoning', id: 'reasoning_1' },
          {
            type: 'commandExecution',
            id: 'command_1',
            command: 'npm test',
            cwd: '/tmp',
            status: 'completed',
            commandActions: [],
          },
          {
            type: 'mcpToolCall',
            id: 'mcp_1',
            server: 'example',
            tool: 'echo',
            status: 'completed',
            arguments: {},
            mcpAppResourceUri: null,
          },
          {
            type: 'dynamicToolCall',
            id: 'dynamic_1',
            tool: 'echo',
            status: 'completed',
            arguments: {},
          },
          {
            type: 'collabAgentToolCall',
            id: 'collab_1',
            tool: 'spawnAgent',
            status: 'completed',
            senderThreadId: 'thr_1',
            receiverThreadIds: [],
            agentsStates: {},
          },
          { type: 'webSearch', id: 'search_1', query: 'codex' },
          {
            type: 'imageGeneration',
            id: 'image_1',
            status: 'completed',
            result: 'image.png',
            savedPath: null,
          },
        ],
      },
    };
    const original = structuredClone(result);

    const decoded = decodeGeneratedClientResponse('turn/start', result);

    expect(decoded).toBe(result);
    expect(decoded).toEqual(original);
    expect(result.turn.error).toEqual({
      message: 'failed',
      codexErrorInfo: { httpConnectionFailed: {} },
    });
    expect(result.turn.items[0]).toMatchObject({
      content: [
        { type: 'text', text: 'hello' },
        { type: 'image', url: 'https://example.test/image.png', detail: null },
        { type: 'localImage', path: '/tmp/image.png', detail: null },
      ],
    });
    expect(result).toEqual(original);
  });

  it('preserves the exact sessionBudgetExceeded error variant without adding fields', () => {
    const result = {
      turn: {
        id: 'turn_1',
        status: 'failed',
        items: [],
        error: { message: 'budget exhausted', codexErrorInfo: 'sessionBudgetExceeded' },
      },
    };

    const decoded = decodeGeneratedClientResponse('turn/start', result);

    expect(decoded).toBe(result);
    expect(result.turn.error).toEqual({
      message: 'budget exhausted',
      codexErrorInfo: 'sessionBudgetExceeded',
    });
  });

  it('rejects a method-mismatched result without exposing its payload', () => {
    const invalidResult = { secret: 'do-not-log', thread: null };

    expect(() => decodeGeneratedClientResponse('thread/start', invalidResult)).toThrow(
      "Generated Codex response for method 'thread/start' failed exact schema validation",
    );

    try {
      decodeGeneratedClientResponse('thread/start', invalidResult);
    } catch (error) {
      expect(String(error)).not.toContain('do-not-log');
    }
  });
});
