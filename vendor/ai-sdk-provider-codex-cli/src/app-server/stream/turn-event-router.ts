import type { ServerRequest as GeneratedServerRequest } from '../protocol/generated/typescript/ServerRequest.js';

type GeneratedServerRequestId = GeneratedServerRequest['id'];

type NotificationListener = (method: string, params: Record<string, unknown>) => void;
type ServerRequestListener = (
  method: string,
  params: Record<string, unknown>,
  id: GeneratedServerRequestId,
) => void;

export interface AppServerTurnEventSource {
  on(event: 'notification', listener: NotificationListener): unknown;
  on(event: 'server-request', listener: ServerRequestListener): unknown;
  off(event: 'notification', listener: NotificationListener): unknown;
  off(event: 'server-request', listener: ServerRequestListener): unknown;
}

export type RoutedAppServerNotification = {
  kind: 'notification';
  method: string;
  params: Record<string, unknown>;
};

export type RoutedAppServerRequest = {
  kind: 'server-request';
  method: string;
  params: Record<string, unknown>;
  id: GeneratedServerRequestId;
};

export type RoutedAppServerEvent = RoutedAppServerNotification | RoutedAppServerRequest;

export interface AppServerTurnEventRouterOptions {
  source: AppServerTurnEventSource;
  threadId: string;
  onTurnEvent: (event: RoutedAppServerEvent) => void;
  onReleasedEvent?: (event: RoutedAppServerEvent) => void;
  onThreadNotification?: (event: RoutedAppServerNotification) => void;
}

/**
 * Correlates one thread's App Server events with a turn whose id may arrive
 * after its first notifications.
 *
 * Same-thread events that carry a turn id are staged until the turn is bound.
 * Binding replays only the matching turn in ingress order. Once bound,
 * `onReleasedEvent` continues to observe same-thread events for donor raw-chunk
 * compatibility while `onTurnEvent` receives only the bound turn (plus
 * thread-scoped events without a turn id).
 */
export class AppServerTurnEventRouter {
  private turnId?: string;
  private stagedEvents: RoutedAppServerEvent[] = [];
  private notificationListener?: NotificationListener;
  private serverRequestListener?: ServerRequestListener;

  constructor(private readonly options: AppServerTurnEventRouterOptions) {}

  setTurnId(turnId: string): void {
    this.turnId = turnId;
    this.flushStagedEvents();
  }

  getBoundTurnId(): string | undefined {
    return this.turnId;
  }

  isSameTurn(params: Record<string, unknown>): boolean {
    const turnId = this.extractTurnId(params);
    if (!this.turnId) {
      return turnId === undefined;
    }
    return turnId === undefined || turnId === this.turnId;
  }

  subscribe(): () => void {
    this.notificationListener = (method, params) => {
      if (!this.isSameThread(params)) return;

      const event: RoutedAppServerNotification = { kind: 'notification', method, params };
      this.options.onThreadNotification?.(event);
      this.accept(event);
    };
    this.options.source.on('notification', this.notificationListener);

    this.serverRequestListener = (method, params, id) => {
      if (!this.isSameThread(params)) return;
      this.accept({ kind: 'server-request', method, params, id });
    };
    this.options.source.on('server-request', this.serverRequestListener);

    return () => this.unsubscribe();
  }

  unsubscribe(): void {
    if (this.notificationListener) {
      this.options.source.off('notification', this.notificationListener);
      this.notificationListener = undefined;
    }
    if (this.serverRequestListener) {
      this.options.source.off('server-request', this.serverRequestListener);
      this.serverRequestListener = undefined;
    }
    this.stagedEvents = [];
  }

  private accept(event: RoutedAppServerEvent): void {
    if (!this.turnId && this.extractTurnId(event.params) !== undefined) {
      this.stagedEvents.push(event);
      return;
    }
    this.release(event);
  }

  private release(event: RoutedAppServerEvent): void {
    this.options.onReleasedEvent?.(event);
    if (this.isSameTurn(event.params)) {
      this.options.onTurnEvent(event);
    }
  }

  private flushStagedEvents(): void {
    if (!this.turnId || this.stagedEvents.length === 0) return;

    const staged = this.stagedEvents;
    this.stagedEvents = [];
    for (const event of staged) {
      if (this.isSameThread(event.params) && this.extractTurnId(event.params) === this.turnId) {
        this.release(event);
      }
    }
  }

  private isSameThread(params: Record<string, unknown>): boolean {
    return typeof params.threadId === 'string' && params.threadId === this.options.threadId;
  }

  private extractTurnId(params: Record<string, unknown>): string | undefined {
    if (typeof params.turnId === 'string') return params.turnId;

    const turn = params.turn;
    if (!turn || typeof turn !== 'object') return undefined;
    const id = (turn as { id?: unknown }).id;
    return typeof id === 'string' ? id : undefined;
  }
}
