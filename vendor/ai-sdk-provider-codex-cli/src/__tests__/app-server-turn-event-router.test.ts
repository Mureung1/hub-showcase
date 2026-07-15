import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import {
  AppServerTurnEventRouter,
  type RoutedAppServerEvent,
} from '../app-server/stream/turn-event-router.js';

class FakeEventSource extends EventEmitter {}

function notification(
  method: string,
  threadId: string | undefined,
  turnId: string | undefined,
  marker: string,
): RoutedAppServerEvent {
  return {
    kind: 'notification',
    method,
    params: {
      ...(threadId === undefined ? {} : { threadId }),
      ...(turnId === undefined ? {} : { turnId }),
      marker,
    },
  };
}

function emit(source: FakeEventSource, event: RoutedAppServerEvent): void {
  if (event.kind === 'notification') {
    source.emit('notification', event.method, event.params);
    return;
  }

  source.emit('server-request', event.method, event.params, event.id);
}

describe('AppServerTurnEventRouter', () => {
  it('converges response-first and notification-first delivery', () => {
    const route = (order: 'response-first' | 'notification-first') => {
      const source = new FakeEventSource();
      const turnEvents: RoutedAppServerEvent[] = [];
      const router = new AppServerTurnEventRouter({
        source,
        threadId: 'thread-a',
        onTurnEvent: (event) => turnEvents.push(event),
      });

      router.subscribe();
      if (order === 'response-first') router.setTurnId('turn-a');
      emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'message'));
      if (order === 'notification-first') router.setTurnId('turn-a');
      return turnEvents;
    };

    expect(route('notification-first')).toEqual(route('response-first'));
  });

  it('replays matching pre-bind events in ingress order and preserves the Server RequestId', () => {
    const source = new FakeEventSource();
    const released: RoutedAppServerEvent[] = [];
    const turnEvents: RoutedAppServerEvent[] = [];
    const observedNotifications: RoutedAppServerEvent[] = [];
    const router = new AppServerTurnEventRouter({
      source,
      threadId: 'thread-a',
      onReleasedEvent: (event) => released.push(event),
      onTurnEvent: (event) => turnEvents.push(event),
      onThreadNotification: (event) => observedNotifications.push(event),
    });

    router.subscribe();
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-other', 'drop'));
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'first'));
    emit(source, {
      kind: 'server-request',
      method: 'item/commandExecution/requestApproval',
      params: { threadId: 'thread-a', turnId: 'turn-a', marker: 'second' },
      id: 'request-original',
    });
    emit(source, {
      kind: 'notification',
      method: 'turn/completed',
      params: {
        threadId: 'thread-a',
        turn: { id: 'turn-a', items: [], status: 'completed', error: null },
        marker: 'third',
      },
    });

    expect(released).toEqual([]);
    expect(turnEvents).toEqual([]);
    expect(observedNotifications).toHaveLength(3);

    router.setTurnId('turn-a');

    expect(released.map((event) => event.params.marker)).toEqual(['first', 'second', 'third']);
    expect(turnEvents).toEqual(released);
    expect(turnEvents[1]).toMatchObject({
      kind: 'server-request',
      id: 'request-original',
    });
  });

  it('keeps same-thread raw observation while gating bound-turn delivery', () => {
    const source = new FakeEventSource();
    const released: RoutedAppServerEvent[] = [];
    const turnEvents: RoutedAppServerEvent[] = [];
    const router = new AppServerTurnEventRouter({
      source,
      threadId: 'thread-a',
      onReleasedEvent: (event) => released.push(event),
      onTurnEvent: (event) => turnEvents.push(event),
    });

    router.setTurnId('turn-a');
    router.subscribe();
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-other', 'raw-only'));
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'target'));
    emit(source, notification('thread/name/updated', 'thread-a', undefined, 'thread-scoped'));
    emit(source, notification('item/agentMessage/delta', 'thread-b', 'turn-a', 'foreign-thread'));
    emit(source, notification('item/agentMessage/delta', undefined, 'turn-a', 'threadless'));

    expect(released.map((event) => event.params.marker)).toEqual([
      'raw-only',
      'target',
      'thread-scoped',
    ]);
    expect(turnEvents.map((event) => event.params.marker)).toEqual(['target', 'thread-scoped']);
  });

  it('rechecks thread ownership before replaying a mutable staged event', () => {
    const source = new FakeEventSource();
    const released: RoutedAppServerEvent[] = [];
    const router = new AppServerTurnEventRouter({
      source,
      threadId: 'thread-a',
      onReleasedEvent: (event) => released.push(event),
      onTurnEvent: () => undefined,
      onThreadNotification: (event) => {
        event.params.threadId = 'thread-b';
      },
    });

    router.subscribe();
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'mutated'));
    router.setTurnId('turn-a');

    expect(released).toEqual([]);
  });

  it('lets thread B progress while thread A is waiting for its turn id', () => {
    const source = new FakeEventSource();
    const threadAEvents: RoutedAppServerEvent[] = [];
    const threadBEvents: RoutedAppServerEvent[] = [];
    const threadA = new AppServerTurnEventRouter({
      source,
      threadId: 'thread-a',
      onTurnEvent: (event) => threadAEvents.push(event),
    });
    const threadB = new AppServerTurnEventRouter({
      source,
      threadId: 'thread-b',
      onTurnEvent: (event) => threadBEvents.push(event),
    });

    threadA.subscribe();
    threadB.setTurnId('turn-b');
    threadB.subscribe();

    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'a-pending'));
    emit(source, notification('item/agentMessage/delta', 'thread-b', 'turn-b', 'b-progress'));
    emit(source, {
      kind: 'notification',
      method: 'turn/completed',
      params: {
        threadId: 'thread-b',
        turn: { id: 'turn-b', items: [], status: 'completed', error: null },
        marker: 'b-complete',
      },
    });

    expect(threadAEvents).toEqual([]);
    expect(threadBEvents.map((event) => event.params.marker)).toEqual(['b-progress', 'b-complete']);

    threadA.setTurnId('turn-a');
    expect(threadAEvents.map((event) => event.params.marker)).toEqual(['a-pending']);
  });

  it('detaches listeners and clears staged events when unsubscribed', () => {
    const source = new FakeEventSource();
    const onTurnEvent = vi.fn();
    const router = new AppServerTurnEventRouter({
      source,
      threadId: 'thread-a',
      onTurnEvent,
    });

    router.subscribe();
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'staged'));
    router.unsubscribe();
    router.setTurnId('turn-a');
    emit(source, notification('item/agentMessage/delta', 'thread-a', 'turn-a', 'late'));

    expect(onTurnEvent).not.toHaveBeenCalled();
    expect(source.listenerCount('notification')).toBe(0);
    expect(source.listenerCount('server-request')).toBe(0);
  });
});
