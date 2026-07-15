import { describe, expect, it } from 'vitest';
import { AppServerTurnResultCollector } from '../app-server/stream/turn-result-collector.js';
import type { RoutedAppServerEvent } from '../app-server/stream/turn-event-router.js';

function notification(method: string, params: Record<string, unknown>): RoutedAppServerEvent {
  return { kind: 'notification', method, params };
}

function agentMessage(
  id: string,
  text: string,
  phase?: 'commentary' | 'final_answer' | null,
): Record<string, unknown> {
  return {
    type: 'agentMessage',
    id,
    text,
    ...(phase === undefined ? {} : { phase }),
  };
}

function usage(totalTokens: number): Record<string, unknown> {
  const breakdown = {
    totalTokens,
    inputTokens: totalTokens - 2,
    cachedInputTokens: 1,
    outputTokens: 2,
    reasoningOutputTokens: 0,
  };
  return { total: breakdown, last: breakdown };
}

describe('AppServerTurnResultCollector', () => {
  it('collects completed items and latest usage until the authoritative terminal', () => {
    const collector = new AppServerTurnResultCollector('turn-1');

    expect(
      collector.accept(
        notification('item/completed', {
          threadId: 'thread-1',
          turnId: 'turn-1',
          item: agentMessage('commentary', 'working', 'commentary'),
          completedAtMs: 10,
        }),
      ),
    ).toBeUndefined();
    collector.accept(
      notification('item/completed', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        item: agentMessage('legacy', 'legacy answer'),
        completedAtMs: 11,
      }),
    );
    collector.accept(
      notification('item/completed', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        item: { type: 'plan', id: 'plan', text: 'ship it' },
        completedAtMs: 11,
      }),
    );
    collector.accept(
      notification('item/completed', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        item: agentMessage('final', 'final answer', 'final_answer'),
        completedAtMs: 12,
      }),
    );
    collector.accept(
      notification('thread/tokenUsage/updated', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        tokenUsage: usage(10),
      }),
    );
    collector.accept(
      notification('thread/tokenUsage/updated', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        tokenUsage: usage(20),
      }),
    );

    const result = collector.accept(
      notification('turn/completed', {
        threadId: 'thread-1',
        turn: {
          id: 'turn-1',
          items: [],
          status: 'completed',
        },
      }),
    );

    expect(result).toEqual({
      id: 'turn-1',
      status: 'completed',
      finalResponse: 'final answer',
      items: [
        agentMessage('commentary', 'working', 'commentary'),
        agentMessage('legacy', 'legacy answer'),
        { type: 'plan', id: 'plan', text: 'ship it' },
        agentMessage('final', 'final answer', 'final_answer'),
      ],
      usage: usage(20),
    });
  });

  it('uses the last phase-unknown message, preserving empty text', () => {
    const collector = new AppServerTurnResultCollector('turn-empty');

    for (const item of [agentMessage('first', 'first'), agentMessage('last', '')]) {
      collector.accept(
        notification('item/completed', {
          threadId: 'thread-1',
          turnId: 'turn-empty',
          item,
          completedAtMs: 10,
        }),
      );
    }

    const result = collector.accept(
      notification('turn/completed', {
        threadId: 'thread-1',
        turn: { id: 'turn-empty', items: [], status: 'completed' },
      }),
    );

    expect(result?.finalResponse).toBe('');
  });

  it('does not promote commentary-only output to a final response', () => {
    const collector = new AppServerTurnResultCollector('turn-commentary');
    collector.accept(
      notification('item/completed', {
        threadId: 'thread-1',
        turnId: 'turn-commentary',
        item: agentMessage('commentary', 'still working', 'commentary'),
        completedAtMs: 10,
      }),
    );

    const result = collector.accept(
      notification('turn/completed', {
        threadId: 'thread-1',
        turn: { id: 'turn-commentary', items: [], status: 'completed' },
      }),
    );

    expect(result?.finalResponse).toBeNull();
  });

  it('ignores foreign turns and settles matching terminal only once', () => {
    const collector = new AppServerTurnResultCollector('turn-target');

    collector.accept(
      notification('item/completed', {
        threadId: 'thread-1',
        turnId: 'turn-foreign',
        item: agentMessage('foreign', 'wrong'),
        completedAtMs: 10,
      }),
    );
    expect(
      collector.accept(
        notification('turn/completed', {
          threadId: 'thread-1',
          turn: { id: 'turn-foreign', items: [], status: 'completed' },
        }),
      ),
    ).toBeUndefined();

    const first = collector.accept(
      notification('turn/completed', {
        threadId: 'thread-1',
        turn: {
          id: 'turn-target',
          items: [],
          status: 'failed',
          error: { message: 'boom' },
          startedAt: 100,
          completedAt: 101,
          durationMs: 1_000,
        },
      }),
    );
    const duplicate = collector.accept(
      notification('turn/completed', {
        threadId: 'thread-1',
        turn: { id: 'turn-target', items: [], status: 'completed' },
      }),
    );

    expect(first).toMatchObject({
      id: 'turn-target',
      status: 'failed',
      error: { message: 'boom' },
      startedAt: 100,
      completedAt: 101,
      durationMs: 1_000,
      items: [],
      usage: null,
    });
    expect(duplicate).toBeUndefined();
  });
});
