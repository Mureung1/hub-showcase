import { AppServerRpcClient } from '../rpc/client.js';
import { AppServerStreamEmitter } from './emitter.js';
import { ToolTracker, type ToolExecutionStats } from './tool-tracker.js';
import {
  createNotificationHandlers,
  type NotificationHandler,
} from './router-notification-handlers.js';
import {
  createServerRequestHandlers,
  type ServerRequestHandler,
} from './router-server-request-handlers.js';
import { AppServerTurnEventRouter, type RoutedAppServerEvent } from './turn-event-router.js';
import { AppServerTurnResultCollector, type NativeTurnResult } from './turn-result-collector.js';

export interface AppServerNotificationRouterOptions {
  client: AppServerRpcClient;
  emitter: AppServerStreamEmitter;
  threadId: string;
  onThreadTurnCompleted?: (turn: { id: string }) => void;
  onTurnCompleted: (result: NativeTurnResult) => void;
  onError: (error: Error) => void;
}

export class AppServerNotificationRouter {
  private readonly emitter: AppServerStreamEmitter;
  private readonly onTurnCompleted: (result: NativeTurnResult) => void;
  private readonly onError: (error: Error) => void;

  private readonly toolTracker = new ToolTracker();
  private textItemIdsWithDelta = new Set<string>();
  private reasoningItemIdsWithDelta = new Set<string>();
  private readonly turnEventRouter: AppServerTurnEventRouter;
  private turnResultCollector?: AppServerTurnResultCollector;

  private readonly notificationHandlers: Record<string, NotificationHandler>;
  private readonly serverRequestHandlers: Record<string, ServerRequestHandler>;

  constructor(options: AppServerNotificationRouterOptions) {
    this.emitter = options.emitter;
    this.onTurnCompleted = options.onTurnCompleted;
    this.onError = options.onError;

    this.turnEventRouter = new AppServerTurnEventRouter({
      source: options.client,
      threadId: options.threadId,
      onReleasedEvent: (event) => this.emitRaw(event),
      onTurnEvent: (event) => this.handleTurnEvent(event),
      onThreadNotification: (event) => {
        if (
          event.method === 'turn/completed' &&
          event.params.turn &&
          typeof event.params.turn === 'object' &&
          typeof (event.params.turn as { id?: unknown }).id === 'string'
        ) {
          options.onThreadTurnCompleted?.(event.params.turn as { id: string });
        }
      },
    });

    this.notificationHandlers = createNotificationHandlers({
      emitter: this.emitter,
      toolTracker: this.toolTracker,
      textItemIdsWithDelta: this.textItemIdsWithDelta,
      reasoningItemIdsWithDelta: this.reasoningItemIdsWithDelta,
      onError: this.onError,
      isSameTurn: (params) => this.turnEventRouter.isSameTurn(params),
    });

    this.serverRequestHandlers = createServerRequestHandlers({
      emitter: this.emitter,
      isSameTurn: (params) => this.turnEventRouter.isSameTurn(params),
    });
  }

  setTurnId(turnId: string): void {
    this.turnResultCollector = new AppServerTurnResultCollector(turnId);
    this.turnEventRouter.setTurnId(turnId);
  }

  getToolExecutionStats(): ToolExecutionStats {
    return this.toolTracker.getStats();
  }

  subscribe(): () => void {
    return this.turnEventRouter.subscribe();
  }

  unsubscribe(): void {
    this.turnEventRouter.unsubscribe();
  }

  private handleTurnEvent(event: RoutedAppServerEvent): void {
    const result = this.turnResultCollector?.accept(event);
    if (result) this.onTurnCompleted(result);

    const handlers =
      event.kind === 'notification' ? this.notificationHandlers : this.serverRequestHandlers;
    const handler = handlers[event.method];
    if (!handler) return;
    handler(event.params);
  }

  private emitRaw(event: RoutedAppServerEvent): void {
    if (event.kind === 'notification') {
      this.emitter.emitRaw(event.method, event.params);
      return;
    }
    this.emitter.emitRaw(event.method, event.params, event.id);
  }
}
