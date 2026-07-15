import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { NativeCodexClient, NativeCodexTurnHandle } from '../app-server/native/client.js';
import type {
  ThreadResumeParams,
  ThreadStartParams,
  TurnStartParams,
} from '../app-server/protocol/types.js';

class FakeNativeRpcClient extends EventEmitter {
  readonly operations: string[] = [];
  readonly threadStartCalls: ThreadStartParams[] = [];
  readonly threadResumeCalls: ThreadResumeParams[] = [];
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

  async turnInterrupt(): Promise<Record<string, never>> {
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
    this.emit('notification', 'item/completed', {
      threadId,
      turnId,
      item: {
        type: 'agentMessage',
        id: `message-${turnId}`,
        text,
        phase: 'final_answer',
      },
    });
    this.emit('notification', 'turn/completed', {
      threadId,
      turn: {
        id: turnId,
        status: 'completed',
        error: null,
      },
    });
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
    turn.dispose();

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
