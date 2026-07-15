import type { DecodedClientResponseFor } from '../protocol/generated-client-response.js';
import type {
  ThreadResumeParams,
  ThreadStartParams,
  TurnInterruptParams,
  TurnStartParams,
} from '../protocol/types.js';
import type { CodexAppServerRequestHandlers } from '../types.js';
import {
  AppServerTurnEventRouter,
  type AppServerTurnEventSource,
  type RoutedAppServerEvent,
  type RoutedAppServerNotification,
  turnIdFromRoutedParams,
} from '../stream/turn-event-router.js';
import {
  AppServerTurnResultCollector,
  type NativeTurnResult,
} from '../stream/turn-result-collector.js';

type NativeTurnStartParams = Omit<TurnStartParams, 'threadId'>;

export type NativeTurnNotification = RoutedAppServerNotification;

class NativeTurnNotificationBuffer {
  private readonly events: NativeTurnNotification[] = [];
  private readonly waiters: Array<
    (result: IteratorResult<NativeTurnNotification, undefined>) => void
  > = [];
  private finished = false;

  push(event: NativeTurnNotification): void {
    if (this.finished) return;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ done: false, value: event });
      return;
    }
    this.events.push(event);
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveFinishedWaiters();
  }

  abandon(): void {
    this.events.length = 0;
    this.finish();
  }

  async next(): Promise<IteratorResult<NativeTurnNotification, undefined>> {
    const event = this.events.shift();
    if (event) return { done: false, value: event };
    if (this.finished) return { done: true, value: undefined };

    return await new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private resolveFinishedWaiters(): void {
    if (this.events.length > 0) return;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }
}

export interface NativeCodexRpcClient extends AppServerTurnEventSource {
  threadStart(params: ThreadStartParams): Promise<DecodedClientResponseFor<'thread/start'>>;
  threadResume(params: ThreadResumeParams): Promise<DecodedClientResponseFor<'thread/resume'>>;
  turnStart(params: TurnStartParams): Promise<DecodedClientResponseFor<'turn/start'>>;
  turnInterrupt(params: TurnInterruptParams): Promise<DecodedClientResponseFor<'turn/interrupt'>>;
  withThreadLock<T>(threadId: string, fn: () => Promise<T>): Promise<T>;
  registerRequestContext(
    threadId: string,
    context: {
      handlers: Partial<CodexAppServerRequestHandlers>;
      autoApprove?: boolean;
    },
  ): string;
  bindRequestContext(contextId: string, turnId: string): void;
  clearRequestContext(contextId: string): void;
  clearRequestContextForTurn(turnId: string): void;
}

export interface NativeTurnObserver {
  onReleasedEvent?: (event: RoutedAppServerEvent) => void;
  onTurnEvent?: (event: RoutedAppServerEvent) => void;
  onThreadTurnCompleted?: (turn: { id: string }) => void;
}

export interface NativeTurnOptions {
  requestHandlers?: Partial<CodexAppServerRequestHandlers>;
  autoApprove?: boolean;
  observer?: NativeTurnObserver;
}

interface NativeCodexTurnHandleOptions extends NativeTurnOptions {
  client: NativeCodexRpcClient;
  params: TurnStartParams;
}

function failedTurnError(result: NativeTurnResult): Error {
  return new Error(result.error?.message ?? `turn failed with status ${result.status}`);
}

export class NativeCodexTurnHandle {
  readonly threadId: string;
  private turnId?: string;
  private requestContextId?: string;
  private resultCollector?: AppServerTurnResultCollector;
  private readonly eventRouter: AppServerTurnEventRouter;
  private readonly completion: Promise<NativeTurnResult>;
  private readonly notificationBuffer = new NativeTurnNotificationBuffer();
  private resolveCompletion!: (result: NativeTurnResult) => void;
  private startPromise?: Promise<this>;
  private streamConsumed = false;
  private subscribed = false;
  private disposed = false;

  constructor(private readonly options: NativeCodexTurnHandleOptions) {
    this.threadId = options.params.threadId;
    this.completion = new Promise<NativeTurnResult>((resolve) => {
      this.resolveCompletion = resolve;
    });
    this.eventRouter = new AppServerTurnEventRouter({
      source: options.client,
      threadId: this.threadId,
      onReleasedEvent: (event) => {
        if (!this.disposed) options.observer?.onReleasedEvent?.(event);
      },
      onTurnEvent: (event) => this.acceptTurnEvent(event),
      onThreadNotification: (event) => this.observeThreadNotification(event),
    });
  }

  get id(): string {
    if (!this.turnId) {
      throw new Error('Native Codex turn has not started');
    }
    return this.turnId;
  }

  start(): Promise<this> {
    if (this.startPromise) return this.startPromise;
    if (this.disposed) {
      return Promise.reject(new Error('Native Codex turn was disposed before start'));
    }

    this.startPromise = this.startOnce();
    return this.startPromise;
  }

  private async startOnce(): Promise<this> {
    if (!this.subscribed) {
      this.eventRouter.subscribe();
      this.subscribed = true;
    }

    try {
      await this.options.client.withThreadLock(this.threadId, async () => {
        this.requestContextId = this.options.client.registerRequestContext(this.threadId, {
          handlers: this.options.requestHandlers ?? {},
          autoApprove: this.options.autoApprove,
        });

        try {
          const response = await this.options.client.turnStart(this.options.params);
          this.turnId = response.turn.id;

          if (this.disposed) {
            this.clearPendingRequestContext();
            return;
          }

          this.options.client.bindRequestContext(this.requestContextId, this.turnId);
          this.requestContextId = undefined;
          this.resultCollector = new AppServerTurnResultCollector(this.turnId);
          this.eventRouter.setTurnId(this.turnId);
        } catch (error) {
          this.clearPendingRequestContext();
          throw error;
        }
      });
    } catch (error) {
      this.dispose();
      throw error;
    }

    return this;
  }

  async waitForCompletion(): Promise<NativeTurnResult> {
    return await this.completion;
  }

  async run(): Promise<NativeTurnResult> {
    const result = await this.waitForCompletion();
    if (result.status === 'failed') {
      throw failedTurnError(result);
    }
    return result;
  }

  async *stream(): AsyncGenerator<NativeTurnNotification, void, void> {
    if (this.streamConsumed) {
      throw new Error('Native Codex turn stream has already been consumed');
    }
    this.streamConsumed = true;

    try {
      while (true) {
        const next = await this.notificationBuffer.next();
        if (next.done) return;
        yield next.value;
      }
    } finally {
      this.notificationBuffer.abandon();
    }
  }

  async interrupt(): Promise<void> {
    await this.options.client.turnInterrupt({ threadId: this.threadId, turnId: this.id });
  }

  dispose(): void {
    this.disposeInternal(true);
  }

  private disposeInternal(abandonStream: boolean): void {
    if (this.disposed) return;
    this.disposed = true;

    if (abandonStream) {
      this.notificationBuffer.abandon();
    }

    if (this.subscribed) {
      this.eventRouter.unsubscribe();
      this.subscribed = false;
    }
    this.clearPendingRequestContext();
    if (this.turnId) {
      this.options.client.clearRequestContextForTurn(this.turnId);
    }
  }

  private acceptTurnEvent(event: RoutedAppServerEvent): void {
    if (this.disposed) return;
    const result = this.resultCollector?.accept(event);
    if (
      event.kind === 'notification' &&
      this.turnId !== undefined &&
      turnIdFromRoutedParams(event.params) === this.turnId
    ) {
      this.notificationBuffer.push(event);
    }
    if (result) {
      this.notificationBuffer.finish();
      this.resolveCompletion(result);
      this.disposeInternal(false);
      this.options.observer?.onTurnEvent?.(event);
      return;
    }
    this.options.observer?.onTurnEvent?.(event);
  }

  private observeThreadNotification(event: RoutedAppServerNotification): void {
    if (event.method !== 'turn/completed') return;
    const turn = event.params.turn;
    if (!turn || typeof turn !== 'object') return;
    const id = (turn as { id?: unknown }).id;
    if (typeof id === 'string') {
      this.options.observer?.onThreadTurnCompleted?.({ id });
    }
  }

  private clearPendingRequestContext(): void {
    if (!this.requestContextId) return;
    this.options.client.clearRequestContext(this.requestContextId);
    this.requestContextId = undefined;
  }
}

export class NativeCodexThread {
  constructor(
    readonly id: string,
    private readonly client: NativeCodexRpcClient,
  ) {}

  async turn(
    params: NativeTurnStartParams,
    options: NativeTurnOptions = {},
  ): Promise<NativeCodexTurnHandle> {
    return await new NativeCodexTurnHandle({
      client: this.client,
      params: { ...params, threadId: this.id },
      ...options,
    }).start();
  }

  async run(
    params: NativeTurnStartParams,
    options: NativeTurnOptions = {},
  ): Promise<NativeTurnResult> {
    const turn = await this.turn(params, options);
    return await turn.run();
  }
}

export class NativeCodexClient {
  constructor(private readonly client: NativeCodexRpcClient) {}

  async startThread(params: ThreadStartParams): Promise<NativeCodexThread> {
    const response = await this.client.threadStart(params);
    return new NativeCodexThread(response.thread.id, this.client);
  }

  async resumeThread(params: ThreadResumeParams): Promise<NativeCodexThread> {
    const response = await this.client.threadResume(params);
    return new NativeCodexThread(response.thread.id, this.client);
  }
}
