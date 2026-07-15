import type {
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
  SharedV4Warning,
} from '@ai-sdk/provider';
import { createEmptyCodexUsage, sanitizeJsonSchema } from '../../shared-utils.js';
import { NativeCodexTurnHandle } from '../native/client.js';
import type { TurnStartParams } from '../protocol/types.js';
import { AppServerRpcClient } from '../rpc/client.js';
import type { CodexAppServerRequestHandlers } from '../types.js';
import { AppServerSession } from '../session.js';
import { AppServerAiSdkProjection } from './router.js';
import { AppServerStreamEmitter } from './emitter.js';
import type { NativeTurnResult } from './turn-result-collector.js';

const INTERRUPT_COMPLETION_TIMEOUT_MS = 5_000;

function waitForPromiseOrTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(undefined);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(undefined);
      });
  });
}

function isThreadNotFoundError(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error);
  return /thread.*not found/i.test(message);
}

function createStaleThreadError(threadId: string): Error {
  return new Error(
    `Thread '${threadId}' not found after server restart. Create a new thread by omitting threadId.`,
  );
}

function mapTurnStatusToFinishReason(turn: NativeTurnResult) {
  switch (turn.status) {
    case 'completed':
      return { unified: 'stop', raw: 'completed' } as const;
    case 'interrupted':
      return { unified: 'stop', raw: 'interrupted' } as const;
    case 'failed': {
      const errorInfo = turn.error?.codexErrorInfo;
      if (errorInfo === 'contextWindowExceeded') {
        return { unified: 'length', raw: 'context_window_exceeded' } as const;
      }
      if (errorInfo === 'usageLimitExceeded') {
        return { unified: 'length', raw: 'usage_limit_exceeded' } as const;
      }
      return { unified: 'error', raw: turn.error?.message ?? 'failed' } as const;
    }
    default:
      return { unified: 'other', raw: turn.status } as const;
  }
}

function mapNativeTurnUsage(turn: NativeTurnResult): LanguageModelV4Usage {
  const last = turn.usage?.last;
  if (!last) return createEmptyCodexUsage();

  return {
    inputTokens: {
      total: last.inputTokens,
      noCache: Math.max(0, last.inputTokens - last.cachedInputTokens),
      cacheRead: last.cachedInputTokens,
      cacheWrite: 0,
    },
    outputTokens: {
      total: last.outputTokens,
      text: undefined,
      reasoning: last.reasoningOutputTokens,
    },
    raw: (last as unknown as import('@ai-sdk/provider').JSONObject) ?? undefined,
  };
}

type TurnStreamState =
  | 'created'
  | 'starting'
  | 'awaiting_turn_id'
  | 'running'
  | 'interrupting'
  | 'finishing'
  | 'errored'
  | 'closed';

export interface TurnStreamControllerOptions {
  client: AppServerRpcClient;
  modelId: string;
  threadId: string;
  warnings: SharedV4Warning[];
  includeRawChunks: boolean;
  jsonModeLastTextBlockOnly: boolean;
  turnStartParams: TurnStartParams;
  requestHandlers?: Partial<CodexAppServerRequestHandlers>;
  autoApprove?: boolean;
  session?: AppServerSession;
  abortSignal?: AbortSignal;
  hadInitialThreadId: boolean;
  threadResolution: {
    persistent: boolean;
    explicit: boolean;
  };
  releaseResources: () => void;
  clearPersistentThreadState: (threadId: string) => void;
}

export class TurnStreamController {
  private state: TurnStreamState = 'created';
  private turnId?: string;
  private cleanedUp = false;
  private pendingCancelReason: unknown | undefined;
  private cancelBeforeTurnId = false;
  private pendingAbortReason: unknown | undefined;
  private interruptWaitPromise?: Promise<void>;
  private cancelWaitPromise?: Promise<void>;
  private projectionFailurePromise: Promise<never> = new Promise<never>(() => undefined);
  private turnOutcomePromise: Promise<NativeTurnResult> = new Promise<NativeTurnResult>(
    () => undefined,
  );
  private rejectProjectionFailure?: (error: unknown) => void;
  private emitter?: AppServerStreamEmitter;
  private projection?: AppServerAiSdkProjection;
  private nativeTurn?: NativeCodexTurnHandle;
  private onAbort?: () => void;

  constructor(private readonly options: TurnStreamControllerOptions) {}

  private isTerminalState(): boolean {
    return this.state === 'closed' || this.state === 'errored' || this.state === 'finishing';
  }

  private isClosedState(): boolean {
    return this.state === 'closed';
  }

  async start(
    controller: ReadableStreamDefaultController<LanguageModelV4StreamPart>,
  ): Promise<void> {
    if (this.state !== 'created') {
      return;
    }
    this.state = 'starting';

    this.projectionFailurePromise = new Promise<never>((_resolve, reject) => {
      this.rejectProjectionFailure = reject;
    });

    this.emitter = new AppServerStreamEmitter(controller, {
      modelId: this.options.modelId,
      threadId: this.options.threadId,
      includeRawChunks: this.options.includeRawChunks,
      jsonModeLastTextBlockOnly: this.options.jsonModeLastTextBlockOnly,
    });
    this.emitter.emitStreamStart(this.options.warnings);
    this.emitter.emitResponseMetadata();

    this.projection = new AppServerAiSdkProjection({
      emitter: this.emitter,
      onError: (error) => {
        this.rejectProjectionFailure?.(error);
      },
    });
    this.nativeTurn = new NativeCodexTurnHandle({
      client: this.options.client,
      params: this.options.turnStartParams,
      requestHandlers: this.options.requestHandlers,
      autoApprove: this.options.autoApprove,
      observer: {
        onReleasedEvent: (event) => this.projection?.acceptReleasedEvent(event),
        onTurnEvent: (event) => this.projection?.acceptTurnEvent(event),
        onThreadTurnCompleted: (turn) => this.options.session?.setInactive(turn.id),
      },
    });
    this.turnOutcomePromise = Promise.race([
      this.nativeTurn.waitForCompletion(),
      this.projectionFailurePromise,
    ]);

    this.attachAbortSignal();

    if (this.pendingCancelReason !== undefined) {
      await this.requestCancel(this.pendingCancelReason);
      if (this.isClosedState()) return;
    }

    if (this.pendingAbortReason !== undefined) {
      await this.failWithError(this.pendingAbortReason);
      return;
    }

    try {
      this.state = 'awaiting_turn_id';
      await this.nativeTurn.start();

      this.turnId = this.nativeTurn.id;
      this.options.session?.setTurnId(this.turnId);

      if (this.isClosedState()) {
        if (this.pendingCancelReason !== undefined && this.cancelBeforeTurnId) {
          await this.requestCancel(this.pendingCancelReason);
        }
        return;
      }
      this.state = 'running';

      if (this.pendingCancelReason !== undefined) {
        await this.requestCancel(this.pendingCancelReason);
        return;
      }

      if (this.pendingAbortReason !== undefined) {
        await this.interruptAndAwaitCompletion();
        throw this.pendingAbortReason;
      }

      const turn = await this.turnOutcomePromise;
      if (this.pendingCancelReason !== undefined) {
        this.finishSilently();
        return;
      }
      if (this.pendingAbortReason !== undefined) {
        throw this.pendingAbortReason;
      }

      if (this.isTerminalState()) return;
      this.state = 'finishing';
      const toolExecutionStats =
        this.projection.getToolExecutionStats() as unknown as import('@ai-sdk/provider').JSONObject;

      this.emitter.emitFinish(mapTurnStatusToFinishReason(turn), mapNativeTurnUsage(turn), {
        'codex-app-server': {
          threadId: this.options.threadId,
          ...(this.turnId ? { turnId: this.turnId } : {}),
          toolExecutionStats,
        },
      });
      this.emitter.close();
      this.cleanup();
      this.state = 'closed';
    } catch (error) {
      if (this.pendingCancelReason !== undefined) {
        if (this.turnId) {
          await this.requestCancel(this.pendingCancelReason);
        } else {
          this.finishSilently();
        }
        return;
      }

      if (this.options.hadInitialThreadId && isThreadNotFoundError(error)) {
        if (this.options.threadResolution.persistent && !this.options.threadResolution.explicit) {
          this.options.clearPersistentThreadState(this.options.threadId);
        }
        await this.failWithError(createStaleThreadError(this.options.threadId));
        return;
      }

      if (this.pendingAbortReason !== undefined && this.turnId) {
        await this.interruptAndAwaitCompletion();
      }
      await this.failWithError(error);
    }
  }

  async cancel(reason?: unknown): Promise<void> {
    this.pendingCancelReason = reason ?? this.pendingCancelReason ?? new Error('Stream canceled');

    switch (this.state) {
      case 'closed':
      case 'errored':
      case 'finishing':
        return;
      case 'interrupting':
        await this.cancelWaitPromise;
        return;
      default:
        await this.requestCancel(reason);
    }
  }

  private attachAbortSignal(): void {
    const signal = this.options.abortSignal;
    if (!signal) {
      return;
    }

    if (signal.aborted) {
      this.pendingAbortReason = signal.reason ?? new Error('Request aborted');
      return;
    }

    this.onAbort = () => {
      this.pendingAbortReason = signal.reason ?? new Error('Request aborted');
      if (!this.turnId) return;
      void (async () => {
        await this.interruptAndAwaitCompletion();
        await this.failWithError(this.pendingAbortReason);
      })();
    };
    signal.addEventListener('abort', this.onAbort, { once: true });
  }

  private async requestCancel(reason?: unknown): Promise<void> {
    this.pendingCancelReason = reason ?? this.pendingCancelReason ?? new Error('Stream canceled');

    if (!this.turnId) {
      this.cancelBeforeTurnId = this.state === 'starting' || this.state === 'awaiting_turn_id';
      this.finishSilently();
      return;
    }

    if (this.isTerminalState() && !this.cancelBeforeTurnId) return;

    if (!this.cancelWaitPromise) {
      this.cancelWaitPromise = (async () => {
        this.state = 'interrupting';
        if (this.cancelBeforeTurnId) {
          await this.nativeTurn?.interrupt().catch(() => undefined);
          this.cancelBeforeTurnId = false;
        } else {
          await this.interruptAndAwaitCompletion();
        }
        this.finishSilently();
      })();
    }
    await this.cancelWaitPromise;
  }

  private async interruptAndAwaitCompletion(): Promise<void> {
    if (!this.turnId) return;
    if (!this.interruptWaitPromise) {
      this.interruptWaitPromise = (async () => {
        await this.nativeTurn?.interrupt().catch(() => undefined);
        await waitForPromiseOrTimeout(
          (this.nativeTurn?.waitForCompletion() ?? Promise.resolve()).then(() => undefined),
          INTERRUPT_COMPLETION_TIMEOUT_MS,
        );
      })();
    }
    await this.interruptWaitPromise;
  }

  private async failWithError(error: unknown): Promise<void> {
    if (this.isTerminalState()) return;
    this.state = 'errored';
    this.emitter?.error(error);
    this.cleanup();
  }

  private finishSilently(): void {
    if (this.isTerminalState()) return;
    this.cleanup();
    this.state = 'closed';
  }

  private cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;

    this.nativeTurn?.dispose();

    if (this.options.abortSignal && this.onAbort) {
      this.options.abortSignal.removeEventListener('abort', this.onAbort);
    }
    this.onAbort = undefined;
    this.rejectProjectionFailure = undefined;

    this.options.releaseResources();
  }
}

export function buildTurnStartParams(args: {
  threadId: string;
  modelId: string;
  input: TurnStartParams['input'];
  settings: {
    cwd?: string;
    approvalPolicy?: TurnStartParams['approvalPolicy'];
    sandboxPolicy?: unknown;
    effort?: TurnStartParams['effort'];
    summary?: TurnStartParams['summary'];
    personality?: TurnStartParams['personality'];
  };
  responseFormat?: {
    type?: string;
    schema?: unknown;
  };
}): TurnStartParams {
  return {
    threadId: args.threadId,
    input: args.input,
    cwd: args.settings.cwd,
    approvalPolicy: args.settings.approvalPolicy,
    sandboxPolicy: args.settings.sandboxPolicy,
    model: args.modelId,
    effort: args.settings.effort,
    summary: args.settings.summary,
    personality: args.settings.personality,
    ...(args.responseFormat?.type === 'json' && args.responseFormat.schema
      ? { outputSchema: sanitizeJsonSchema(args.responseFormat.schema) }
      : {}),
  };
}
