import type { LanguageModelV4Usage } from '@ai-sdk/provider';
import type { Turn } from '../protocol/types.js';
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

export interface AppServerNotificationRouterOptions {
  client: AppServerRpcClient;
  emitter: AppServerStreamEmitter;
  threadId: string;
  onUsage: (usage: LanguageModelV4Usage) => void;
  onThreadTurnCompleted?: (turn: Turn) => void;
  onTurnCompleted: (turn: Turn) => void;
  onError: (error: Error) => void;
}

export class AppServerNotificationRouter {
  private readonly emitter: AppServerStreamEmitter;
  private readonly onUsage: (usage: LanguageModelV4Usage) => void;
  private readonly onTurnCompleted: (turn: Turn) => void;
  private readonly onError: (error: Error) => void;

  private readonly toolTracker = new ToolTracker();
  private textItemIdsWithDelta = new Set<string>();
  private reasoningItemIdsWithDelta = new Set<string>();
  private readonly turnEventRouter: AppServerTurnEventRouter;

  private readonly notificationHandlers: Record<string, NotificationHandler>;
  private readonly serverRequestHandlers: Record<string, ServerRequestHandler>;

  constructor(options: AppServerNotificationRouterOptions) {
    this.emitter = options.emitter;
    this.onUsage = options.onUsage;
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
          typeof event.params.turn === 'object'
        ) {
          options.onThreadTurnCompleted?.(event.params.turn as Turn);
        }
      },
    });

    this.notificationHandlers = createNotificationHandlers({
      emitter: this.emitter,
      toolTracker: this.toolTracker,
      textItemIdsWithDelta: this.textItemIdsWithDelta,
      reasoningItemIdsWithDelta: this.reasoningItemIdsWithDelta,
      onUsage: this.onUsage,
      onTurnCompleted: this.onTurnCompleted,
      onError: this.onError,
      isSameTurn: (params) => this.turnEventRouter.isSameTurn(params),
      getBoundTurnId: () => this.turnEventRouter.getBoundTurnId(),
    });

    this.serverRequestHandlers = createServerRequestHandlers({
      emitter: this.emitter,
      isSameTurn: (params) => this.turnEventRouter.isSameTurn(params),
    });
  }

  setTurnId(turnId: string): void {
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
