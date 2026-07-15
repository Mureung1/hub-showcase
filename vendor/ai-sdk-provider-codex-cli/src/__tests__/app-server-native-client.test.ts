import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { NativeCodexClient, NativeCodexTurnHandle } from '../app-server/native/client.js';
import type { CommandExecutionRequestApprovalParams } from '../app-server/protocol/generated/typescript/v2/CommandExecutionRequestApprovalParams.js';
import type { ItemCompletedNotification } from '../app-server/protocol/generated/typescript/v2/ItemCompletedNotification.js';
import type { ItemStartedNotification } from '../app-server/protocol/generated/typescript/v2/ItemStartedNotification.js';
import type { TurnCompletedNotification } from '../app-server/protocol/generated/typescript/v2/TurnCompletedNotification.js';
import type {
  ThreadResumeParams,
  ThreadStartParams,
  TurnInterruptParams,
  TurnStartParams,
} from '../app-server/protocol/types.js';

class FakeNativeRpcClient extends EventEmitter {
  readonly operations: string[] = [];
  readonly threadStartCalls: ThreadStartParams[] = [];
  readonly threadResumeCalls: ThreadResumeParams[] = [];
  readonly turnInterruptCalls: TurnInterruptParams[] = [];
  readonly turnStartCalls: TurnStartParams[] = [];
  threadStartImpl: (params: ThreadStartParams) => Promise<{ thread: { id: string } }> =
    async () => ({ thread: { id: 'thread-native' } });
  turnStartImpl: (params: TurnStartParams) => Promise<{ turn: { id: string } }> = async () => {
    this.emitCompletedTurn('thread-native', 'turn-native', 'native result');
    return { turn: { id: 'turn-native' } };
  };

  async threadStart(params: ThreadStartParams): Promise<{ thread: { id: string } }> {
    this.threadStartCalls.push(params);
    this.operations.push('thread/start');
    return await this.threadStartImpl(params);
  }

  async threadResume(params: ThreadResumeParams): Promise<{ thread: { id: string } }> {
    this.threadResumeCalls.push(params);
    this.operations.push('thread/resume');
    return { thread: { id: 'thread-resumed-authoritative' } };
  }

  async turnStart(params: TurnStartParams): Promise<{ turn: { id: string } }> {
    this.turnStartCalls.push(params);
    this.operations.push('turn/start');

    return await this.turnStartImpl(params);
  }

  async turnInterrupt(params: TurnInterruptParams): Promise<Record<string, never>> {
    this.turnInterruptCalls.push(params);
    return {};
  }

  async withThreadLock<T>(_threadId: string, fn: () => Promise<T>): Promise<T> {
    this.operations.push('lock:enter');
    try {
      return await fn();
    } finally {
      this.operations.push('lock:leave');
    }
  }

  registerRequestContext(): string {
    this.operations.push('context:register');
    return 'context-native';
  }

  bindRequestContext(_contextId: string, _turnId: string): void {
    this.operations.push('context:bind');
  }

  clearRequestContext(_contextId: string): void {
    this.operations.push('context:clear-pending');
  }

  clearRequestContextForTurn(_turnId: string): void {
    this.operations.push('context:clear-turn');
  }

  emitCompletedTurn(threadId: string, turnId: string, text: string): void {
    const itemCompleted = {
      threadId,
      turnId,
      completedAtMs: 2,
      item: {
        type: 'agentMessage',
        id: `message-${turnId}`,
        text,
        phase: 'final_answer',
        memoryCitation: null,
      },
    } satisfies ItemCompletedNotification;
    const turnCompleted = {
      threadId,
      turn: {
        id: turnId,
        items: [],
        itemsView: 'full',
        status: 'completed',
        error: null,
        startedAt: 1,
        completedAt: 2,
        durationMs: 1_000,
      },
    } satisfies TurnCompletedNotification;
    this.emit('notification', 'item/completed', itemCompleted);
    this.emit('notification', 'turn/completed', turnCompleted);
  }
}

describe('NativeCodexClient', () => {
  it('converges pre-response turn events on response-authoritative native identities', async () => {
    const rpc = new FakeNativeRpcClient();
    const client = new NativeCodexClient(rpc);

    const thread = await client.startThread({ model: 'gpt-5.3-codex' });
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
      model: 'gpt-5.3-codex',
    });
    const result = await turn.run();

    expect(thread.id).toBe('thread-native');
    expect(turn.threadId).toBe('thread-native');
    expect(turn.id).toBe('turn-native');
    expect(result).toMatchObject({
      id: 'turn-native',
      status: 'completed',
      finalResponse: 'native result',
      items: [
        {
          type: 'agentMessage',
          id: 'message-turn-native',
          text: 'native result',
        },
      ],
    });
    expect(rpc.turnStartCalls).toEqual([
      {
        threadId: 'thread-native',
        input: [{ type: 'text', text: 'hello', text_elements: [] }],
        model: 'gpt-5.3-codex',
      },
    ]);
    expect(rpc.operations).toEqual([
      'thread/start',
      'lock:enter',
      'context:register',
      'turn/start',
      'context:bind',
      'context:clear-turn',
      'lock:leave',
    ]);
    expect(rpc.listenerCount('notification')).toBe(0);
    expect(rpc.listenerCount('server-request')).toBe(0);
  });

  it('converges response-first events to the same native result', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      setTimeout(() => rpc.emitCompletedTurn('thread-native', 'turn-native', 'native result'), 0);
      return { turn: { id: 'turn-native' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});
    const result = await thread.run({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });

    expect(result).toMatchObject({
      id: 'turn-native',
      status: 'completed',
      finalResponse: 'native result',
    });
    expect(rpc.listenerCount('notification')).toBe(0);
  });

  it('streams notification-first turn notifications in ingress FIFO without Server requests', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      const itemStarted = {
        threadId: 'thread-native',
        turnId: 'turn-streamed',
        startedAtMs: 1,
        item: {
          type: 'agentMessage',
          id: 'message-streamed',
          text: '',
          phase: 'final_answer',
          memoryCitation: null,
        },
      } satisfies ItemStartedNotification;
      const approvalRequest = {
        threadId: 'thread-native',
        turnId: 'turn-streamed',
        itemId: 'command-streamed',
        startedAtMs: 2,
        environmentId: null,
      } satisfies CommandExecutionRequestApprovalParams;
      rpc.emit('notification', 'item/started', itemStarted);
      rpc.emit('server-request', 'item/commandExecution/requestApproval', approvalRequest, 41);
      rpc.emit('notification', 'thread/custom', {
        threadId: 'thread-native',
        marker: 'not turn-scoped',
      });
      rpc.emit('notification', 'unknown/direct', {
        threadId: 'thread-native',
        turnId: 'turn-streamed',
        marker: 'direct',
      });
      rpc.emit('notification', 'unknown/nested', {
        threadId: 'thread-native',
        turn: { id: 'turn-streamed' },
        marker: 'nested',
      });
      rpc.emit('notification', 'item/agentMessage/delta', {
        threadId: 'thread-native',
        turnId: 'turn-streamed',
        itemId: 'message-streamed',
        delta: 'early',
      });
      rpc.emitCompletedTurn('thread-native', 'turn-streamed', 'streamed result');
      return { turn: { id: 'turn-streamed' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });
    const events = [];

    for await (const event of turn.stream()) {
      events.push(event);
    }

    expect(events.map((event) => event.method)).toEqual([
      'item/started',
      'unknown/direct',
      'unknown/nested',
      'item/agentMessage/delta',
      'item/completed',
      'turn/completed',
    ]);
    expect(events.at(3)?.params.delta).toBe('early');
    expect(events.every((event) => event.kind === 'notification')).toBe(true);
  });

  it('keeps native streams independent while A awaits its response and B completes', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.threadStartImpl = async (params) => ({
      thread: { id: params.model === 'model-a' ? 'thread-a' : 'thread-b' },
    });

    let resolveAResponse: ((response: { turn: { id: string } }) => void) | undefined;
    let markAStarted!: () => void;
    const aStarted = new Promise<void>((resolve) => {
      markAStarted = resolve;
    });
    rpc.turnStartImpl = async (params) => {
      if (params.threadId === 'thread-a') {
        markAStarted();
        return await new Promise((resolve) => {
          resolveAResponse = resolve;
        });
      }

      rpc.emitCompletedTurn('thread-b', 'turn-b', 'result B');
      return { turn: { id: 'turn-b' } };
    };

    const client = new NativeCodexClient(rpc);
    const threadA = await client.startThread({ model: 'model-a' });
    const threadB = await client.startThread({ model: 'model-b' });
    const pendingTurnA = threadA.turn({
      input: [{ type: 'text', text: 'A', text_elements: [] }],
    });
    await aStarted;

    const turnB = await threadB.turn({
      input: [{ type: 'text', text: 'B', text_elements: [] }],
    });
    const methodsB = [];
    for await (const event of turnB.stream()) methodsB.push(event.method);

    rpc.emit('notification', 'item/agentMessage/delta', {
      threadId: 'thread-a',
      turnId: 'turn-a',
      itemId: 'message-turn-a',
      delta: 'A after B',
    });
    rpc.emitCompletedTurn('thread-a', 'turn-a', 'result A');
    resolveAResponse?.({ turn: { id: 'turn-a' } });

    const turnA = await pendingTurnA;
    const methodsA = [];
    for await (const event of turnA.stream()) methodsA.push(event.method);

    expect(methodsB).toEqual(['item/completed', 'turn/completed']);
    expect(methodsA).toEqual(['item/agentMessage/delta', 'item/completed', 'turn/completed']);
  });

  it('delivers a matching terminal once and drops same-turn events after it', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      const turnCompleted = {
        threadId: 'thread-native',
        turn: {
          id: 'turn-terminal-stream',
          items: [],
          itemsView: 'full',
          status: 'completed',
          error: null,
          startedAt: 1,
          completedAt: 2,
          durationMs: 1_000,
        },
      } satisfies TurnCompletedNotification;
      rpc.emit('notification', 'turn/completed', turnCompleted);
      rpc.emit('notification', 'item/agentMessage/delta', {
        threadId: 'thread-native',
        turnId: 'turn-terminal-stream',
        itemId: 'message-late',
        delta: 'late',
      });
      rpc.emit('notification', 'turn/completed', turnCompleted);
      return { turn: { id: 'turn-terminal-stream' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });
    const methods = [];

    for await (const event of turn.stream()) {
      methods.push(event.method);
    }

    expect(methods).toEqual(['turn/completed']);
  });

  it('allows only one consumer for a native turn stream', async () => {
    const rpc = new FakeNativeRpcClient();
    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });

    for await (const _event of turn.stream()) {
      // Drain the response-before-handle terminal buffered by the fake.
    }

    await expect(
      (async () => {
        for await (const _event of turn.stream()) {
          // A second consumer must fail before observing any event.
        }
      })(),
    ).rejects.toThrow('already been consumed');
  });

  it('stops buffering after an early stream return without interrupting the active turn', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => ({ turn: { id: 'turn-early-return' } });

    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });
    const stream = turn.stream()[Symbol.asyncIterator]();

    rpc.emit('notification', 'item/agentMessage/delta', {
      threadId: 'thread-native',
      turnId: 'turn-early-return',
      itemId: 'message-early-return',
      delta: 'first',
    });
    await expect(stream.next()).resolves.toMatchObject({
      done: false,
      value: { method: 'item/agentMessage/delta' },
    });
    await stream.return?.();

    expect(rpc.turnInterruptCalls).toHaveLength(0);
    expect(rpc.listenerCount('notification')).toBe(1);

    rpc.emitCompletedTurn('thread-native', 'turn-early-return', 'completed after return');
    await expect(turn.waitForCompletion()).resolves.toMatchObject({
      id: 'turn-early-return',
      status: 'completed',
    });
    expect(rpc.listenerCount('notification')).toBe(0);
  });

  it('interrupts the response-authoritative native turn with exact scope', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => ({ turn: { id: 'turn-interrupt' } });

    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });

    await turn.interrupt();

    expect(rpc.turnInterruptCalls).toEqual([
      { threadId: 'thread-native', turnId: 'turn-interrupt' },
    ]);

    rpc.emitCompletedTurn('thread-native', 'turn-interrupt', 'interrupted result');
    await turn.waitForCompletion();
  });

  it('starts follow-up turns on the same native thread with independent contexts', async () => {
    const rpc = new FakeNativeRpcClient();
    let nextTurn = 0;
    rpc.turnStartImpl = async () => {
      nextTurn += 1;
      const turnId = `turn-follow-up-${nextTurn}`;
      setTimeout(() => rpc.emitCompletedTurn('thread-native', turnId, `result ${nextTurn}`), 0);
      return { turn: { id: turnId } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});
    await thread.run({ input: [{ type: 'text', text: 'first', text_elements: [] }] });
    await thread.run({ input: [{ type: 'text', text: 'second', text_elements: [] }] });

    expect(rpc.turnStartCalls.map((params) => params.threadId)).toEqual([
      'thread-native',
      'thread-native',
    ]);
    expect(rpc.operations.filter((operation) => operation === 'context:register')).toHaveLength(2);
    expect(rpc.operations.filter((operation) => operation === 'context:bind')).toHaveLength(2);
    expect(rpc.operations.filter((operation) => operation === 'context:clear-turn')).toHaveLength(
      2,
    );
  });

  it('coalesces repeated start calls without issuing another turn/start', async () => {
    const rpc = new FakeNativeRpcClient();
    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });

    await turn.start();

    expect(rpc.turnStartCalls).toHaveLength(1);
    expect(rpc.operations.filter((operation) => operation === 'context:register')).toHaveLength(1);
  });

  it('rejects starting a handle disposed before its first start', async () => {
    const rpc = new FakeNativeRpcClient();
    const turn = new NativeCodexTurnHandle({
      client: rpc,
      params: {
        threadId: 'thread-native',
        input: [{ type: 'text', text: 'hello', text_elements: [] }],
      },
    });
    const pendingStreamEvent = turn.stream()[Symbol.asyncIterator]().next();
    turn.dispose();

    await expect(pendingStreamEvent).resolves.toEqual({ done: true, value: undefined });
    await expect(turn.start()).rejects.toThrow('disposed before start');
    expect(rpc.turnStartCalls).toHaveLength(0);
  });

  it('uses the thread/resume response identity instead of the requested identity', async () => {
    const rpc = new FakeNativeRpcClient();

    const thread = await new NativeCodexClient(rpc).resumeThread({
      threadId: 'thread-requested',
    });

    expect(thread.id).toBe('thread-resumed-authoritative');
    expect(rpc.threadResumeCalls).toEqual([{ threadId: 'thread-requested' }]);
  });

  it('cleans pending context and listeners when turn/start rejects', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      throw new Error('turn start failed');
    };

    const thread = await new NativeCodexClient(rpc).startThread({});

    await expect(
      thread.turn({ input: [{ type: 'text', text: 'hello', text_elements: [] }] }),
    ).rejects.toThrow('turn start failed');
    expect(rpc.operations).toContain('context:clear-pending');
    expect(rpc.operations).not.toContain('context:bind');
    expect(rpc.listenerCount('notification')).toBe(0);
    expect(rpc.listenerCount('server-request')).toBe(0);
  });

  it('rejects high-level run with the authoritative failed terminal message', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      setTimeout(() => {
        rpc.emit('notification', 'turn/completed', {
          threadId: 'thread-native',
          turn: {
            id: 'turn-failed',
            status: 'failed',
            error: { message: 'model failed' },
          },
        });
      }, 0);
      return { turn: { id: 'turn-failed' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});

    await expect(
      thread.run({ input: [{ type: 'text', text: 'hello', text_elements: [] }] }),
    ).rejects.toThrow('model failed');
    expect(rpc.operations.filter((operation) => operation === 'context:clear-turn')).toHaveLength(
      1,
    );
  });

  it('uses the first-party failed-status fallback when the terminal has no error', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      setTimeout(() => {
        rpc.emit('notification', 'turn/completed', {
          threadId: 'thread-native',
          turn: {
            id: 'turn-failed-without-error',
            status: 'failed',
            error: null,
          },
        });
      }, 0);
      return { turn: { id: 'turn-failed-without-error' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});

    await expect(
      thread.run({ input: [{ type: 'text', text: 'hello', text_elements: [] }] }),
    ).rejects.toThrow('turn failed with status failed');
  });

  it('does not release staged same-turn events that follow the authoritative terminal', async () => {
    const rpc = new FakeNativeRpcClient();
    const releasedMethods: string[] = [];
    const turnMethods: string[] = [];
    rpc.turnStartImpl = async () => {
      rpc.emit('notification', 'turn/completed', {
        threadId: 'thread-native',
        turn: {
          id: 'turn-terminal-first',
          status: 'completed',
          error: null,
        },
      });
      rpc.emit('notification', 'item/agentMessage/delta', {
        threadId: 'thread-native',
        turnId: 'turn-terminal-first',
        itemId: 'message-late',
        delta: 'late delta',
      });
      return { turn: { id: 'turn-terminal-first' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});
    const turn = await thread.turn(
      { input: [{ type: 'text', text: 'hello', text_elements: [] }] },
      {
        observer: {
          onReleasedEvent: (event) => releasedMethods.push(event.method),
          onTurnEvent: (event) => turnMethods.push(event.method),
        },
      },
    );
    await turn.waitForCompletion();

    expect(releasedMethods).toEqual(['turn/completed']);
    expect(turnMethods).toEqual(['turn/completed']);
  });

  it('ignores foreign events and settles only once for the response turn', async () => {
    const rpc = new FakeNativeRpcClient();
    rpc.turnStartImpl = async () => {
      rpc.emitCompletedTurn('thread-foreign', 'turn-native', 'foreign thread');
      rpc.emitCompletedTurn('thread-native', 'turn-foreign', 'foreign turn');
      rpc.emitCompletedTurn('thread-native', 'turn-native', 'matching result');
      rpc.emitCompletedTurn('thread-native', 'turn-native', 'late duplicate');
      return { turn: { id: 'turn-native' } };
    };

    const thread = await new NativeCodexClient(rpc).startThread({});
    const result = await thread.run({
      input: [{ type: 'text', text: 'hello', text_elements: [] }],
    });

    expect(result.finalResponse).toBe('matching result');
    expect(result.items).toHaveLength(1);
    expect(rpc.operations.filter((operation) => operation === 'context:clear-turn')).toHaveLength(
      1,
    );
  });
});
