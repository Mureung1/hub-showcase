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
import type { RoutedAppServerEvent } from './turn-event-router.js';

export interface AppServerAiSdkProjectionOptions {
  emitter: AppServerStreamEmitter;
  onError: (error: Error) => void;
}

/**
 * Projects events already correlated by NativeCodexTurnHandle into AI SDK
 * stream parts. It deliberately owns no App Server subscription, turn
 * identity, request context, or terminal result lifecycle.
 */
export class AppServerAiSdkProjection {
  private readonly emitter: AppServerStreamEmitter;
  private readonly toolTracker = new ToolTracker();
  private readonly textItemIdsWithDelta = new Set<string>();
  private readonly reasoningItemIdsWithDelta = new Set<string>();
  private readonly notificationHandlers: Record<string, NotificationHandler>;
  private readonly serverRequestHandlers: Record<string, ServerRequestHandler>;

  constructor(options: AppServerAiSdkProjectionOptions) {
    this.emitter = options.emitter;
    this.notificationHandlers = createNotificationHandlers({
      emitter: this.emitter,
      toolTracker: this.toolTracker,
      textItemIdsWithDelta: this.textItemIdsWithDelta,
      reasoningItemIdsWithDelta: this.reasoningItemIdsWithDelta,
      onError: options.onError,
      isSameTurn: () => true,
    });
    this.serverRequestHandlers = createServerRequestHandlers({
      emitter: this.emitter,
      isSameTurn: () => true,
    });
  }

  getToolExecutionStats(): ToolExecutionStats {
    return this.toolTracker.getStats();
  }

  acceptReleasedEvent(event: RoutedAppServerEvent): void {
    if (event.kind === 'notification') {
      this.emitter.emitRaw(event.method, event.params);
      return;
    }
    this.emitter.emitRaw(event.method, event.params, event.id);
  }

  acceptTurnEvent(event: RoutedAppServerEvent): void {
    const handlers =
      event.kind === 'notification' ? this.notificationHandlers : this.serverRequestHandlers;
    const handler = handlers[event.method];
    if (handler) handler(event.params);
  }
}
