/**
 * End-to-end integration tests: AI SDK v7 (`ai` package) <-> App Server projection.
 *
 * The process-per-call Exec provider was retired in FP-0007a. These tests remain as the
 * executable App Server projection oracle until a native turn facade takes ownership.
 */
import { describe, expect, it } from 'vitest';
import { streamObject, streamText } from 'ai';
import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { AppServerLanguageModel } from '../app-server/language-model.js';
import type { TurnStartParams } from '../app-server/protocol/types.js';

class FakeAppServerClient extends EventEmitter {
  turnStartCalls: TurnStartParams[] = [];
  threadStartCalls: unknown[] = [];
  turnStartImpl?: (params: TurnStartParams) => Promise<{ turn: { id: string } }>;
  private nextContextId = 1;

  async threadStart(params: unknown) {
    this.threadStartCalls.push(params);
    return {
      thread: { id: 'thr_v7' },
      model: 'gpt-5.3-codex',
      modelProvider: 'openai',
      cwd: '/tmp',
      approvalPolicy: 'never',
      sandbox: { type: 'workspaceWrite' },
      reasoningEffort: null,
    };
  }

  async turnStart(params: TurnStartParams) {
    this.turnStartCalls.push(params);
    if (!this.turnStartImpl) throw new Error('turnStartImpl not installed for this test');
    return await this.turnStartImpl(params);
  }

  async turnInterrupt(_params: { threadId: string; turnId: string }) {
    return {};
  }

  async withThreadLock(_threadId: string, fn: () => Promise<unknown>) {
    return await fn();
  }

  registerRequestContext(
    _threadId: string,
    _context: { handlers: Record<string, unknown>; autoApprove?: boolean },
  ): string {
    return `ctx_${this.nextContextId++}`;
  }

  bindRequestContext(_contextId: string, _turnId: string) {}

  clearRequestContext(_contextId: string) {}

  clearRequestContextForTurn(_turnId: string) {}

  hasTurnCompleted(_turnId: string): boolean {
    return false;
  }
}

describe('AI SDK v7 integration (app-server provider)', () => {
  it('streamObject resolves the object built from json-mode buffered deltas', async () => {
    const client = new FakeAppServerClient();
    client.turnStartImpl = async (params) => {
      setImmediate(() => {
        client.emit('notification', 'item/agentMessage/delta', {
          threadId: params.threadId,
          turnId: 'turn_json_1',
          itemId: 'item_json_1',
          delta: '{"name":"Grace Hopper"',
        });
        client.emit('notification', 'item/agentMessage/delta', {
          threadId: params.threadId,
          turnId: 'turn_json_1',
          itemId: 'item_json_1',
          delta: ',"age":45}',
        });
        client.emit('notification', 'turn/completed', {
          threadId: params.threadId,
          turn: { id: 'turn_json_1', items: [], status: 'completed', error: null },
        });
      });
      return { turn: { id: 'turn_json_1' } };
    };

    const model = new AppServerLanguageModel({ id: 'gpt-5.3-codex', client: client as never });

    const result = streamObject({
      model: model as never,
      schema: z.object({ name: z.string(), age: z.number() }),
      prompt: 'Extract the person',
    });

    const partials: unknown[] = [];
    for await (const partial of result.partialObjectStream) {
      partials.push(partial);
    }

    expect(partials).toEqual([{ name: 'Grace Hopper', age: 45 }]);
    await expect(result.object).resolves.toEqual({ name: 'Grace Hopper', age: 45 });

    const turnStart = client.turnStartCalls[0] as TurnStartParams & { outputSchema?: unknown };
    expect(turnStart?.outputSchema).toMatchObject({ type: 'object' });
  });

  it('streamText include.rawChunks enables app-server raw chunks through ai@7', async () => {
    const client = new FakeAppServerClient();
    client.turnStartImpl = async (params) => {
      setImmediate(() => {
        client.emit('notification', 'item/agentMessage/delta', {
          threadId: params.threadId,
          turnId: 'turn_raw_v7',
          itemId: 'item_raw_v7',
          delta: 'raw text',
        });
        client.emit('notification', 'turn/completed', {
          threadId: params.threadId,
          turn: { id: 'turn_raw_v7', items: [], status: 'completed', error: null },
        });
      });
      return { turn: { id: 'turn_raw_v7' } };
    };

    const model = new AppServerLanguageModel({ id: 'gpt-5.3-codex', client: client as never });

    const result = streamText({
      model: model as never,
      prompt: 'Stream with raw chunks',
      include: { rawChunks: true },
    });

    const parts: unknown[] = [];
    for await (const part of result.stream) {
      parts.push(part);
    }

    function isRawDeltaNotification(part: unknown): part is {
      type: 'raw';
      rawValue: { method?: unknown };
    } {
      if (part === null || typeof part !== 'object' || !('type' in part)) return false;
      if (part.type !== 'raw' || !('rawValue' in part)) return false;
      const rawValue = part.rawValue;
      return (
        rawValue !== null &&
        typeof rawValue === 'object' &&
        'method' in rawValue &&
        rawValue.method === 'item/agentMessage/delta'
      );
    }

    expect(parts.some(isRawDeltaNotification)).toBe(true);
    const [threadStart] = client.threadStartCalls;
    expect(threadStart).toMatchObject({ experimentalRawEvents: true });
  });
});
