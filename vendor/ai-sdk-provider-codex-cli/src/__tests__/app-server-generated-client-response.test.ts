import { describe, expect, it } from 'vitest';
import { decodeGeneratedClientResponse } from '../app-server/protocol/generated-client-response.js';
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
      { ...createExactThreadStartResponseFixture(), reasoningEffort: null },
    ],
    [
      'thread/resume',
      createExactThreadResumeResponseFixture(),
      { ...createExactThreadResumeResponseFixture(), reasoningEffort: null },
    ],
    [
      'turn/start',
      createExactTurnStartResponseFixture(),
      {
        turn: { ...createExactTurnStartResponseFixture().turn, error: null },
      },
    ],
    ['turn/interrupt', { ignoredExactExtra: true }, {}],
    [
      'model/list',
      createExactModelListResponseFixture(),
      { ...createExactModelListResponseFixture(), nextCursor: null },
    ],
  ];

  it.each(exactResponses)(
    'accepts an exact %s result and projects the donor response contract',
    (method, result, expected) => {
      const original = structuredClone(result);

      expect(decodeGeneratedClientResponse(method, result)).toEqual(expected);
      expect(result).toEqual(original);
    },
  );

  it('adds only donor-required defaults while preserving generated omissions and extras', () => {
    const result = createExactThreadStartResponseFixture() as Record<string, unknown>;
    result.compatibilityExtra = { preserved: true };

    const decoded = decodeGeneratedClientResponse('thread/start', result);

    expect(decoded).not.toBe(result);
    expect(decoded).toHaveProperty('reasoningEffort', null);
    expect(decoded).not.toHaveProperty('runtimeWorkspaceRoots');
    expect(decoded).toHaveProperty('compatibilityExtra', { preserved: true });
    expect(result).not.toHaveProperty('reasoningEffort');
  });

  it('projects schema-optional Turn and ThreadItem fields required by donor types', () => {
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

    expect(decoded).toMatchObject({
      turn: {
        error: {
          message: 'failed',
          codexErrorInfo: { httpConnectionFailed: { httpStatusCode: null } },
          additionalDetails: null,
        },
        items: [
          {
            content: [
              { text_elements: [] },
              { type: 'image', url: 'https://example.test/image.png' },
              { type: 'localImage', path: '/tmp/image.png' },
            ],
          },
          { phase: null },
          { summary: [], content: [] },
          { processId: null, aggregatedOutput: null, exitCode: null, durationMs: null },
          { result: null, error: null, durationMs: null },
          { namespace: null, contentItems: null, success: null, durationMs: null },
          { prompt: null },
          { action: null },
          { revisedPrompt: null },
        ],
      },
    });
    expect(result).toEqual(original);
  });

  it('preserves the exact sessionBudgetExceeded error variant', () => {
    const result = {
      turn: {
        id: 'turn_1',
        status: 'failed',
        items: [],
        error: { message: 'budget exhausted', codexErrorInfo: 'sessionBudgetExceeded' },
      },
    };

    expect(decodeGeneratedClientResponse('turn/start', result)).toMatchObject({
      turn: {
        error: {
          codexErrorInfo: 'sessionBudgetExceeded',
          additionalDetails: null,
        },
      },
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
