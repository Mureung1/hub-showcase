import type { MessagePhase } from '../protocol/generated/typescript/MessagePhase.js';
import type { ThreadItem } from '../protocol/generated/typescript/v2/ThreadItem.js';
import type { ThreadTokenUsage } from '../protocol/generated/typescript/v2/ThreadTokenUsage.js';
import type { TurnError } from '../protocol/generated/typescript/v2/TurnError.js';
import type { TurnStatus } from '../protocol/generated/typescript/v2/TurnStatus.js';
import type { RoutedAppServerEvent } from './turn-event-router.js';

type GeneratedAgentMessage = Extract<ThreadItem, { type: 'agentMessage' }>;

type SchemaAgentMessage = Pick<GeneratedAgentMessage, 'type' | 'id' | 'text'> &
  Partial<Pick<GeneratedAgentMessage, 'phase'>>;

export type NativeTurnItem = Readonly<Record<string, unknown>> & {
  readonly type: string;
};

export type NativeThreadTokenUsage = Pick<ThreadTokenUsage, 'total' | 'last'> &
  Partial<Pick<ThreadTokenUsage, 'modelContextWindow'>>;

export type NativeTurnError = Readonly<Record<string, unknown>> & {
  readonly message: TurnError['message'];
  readonly codexErrorInfo?: unknown;
  readonly additionalDetails?: TurnError['additionalDetails'];
};

export interface NativeTurnResult {
  readonly id: string;
  readonly status: TurnStatus;
  readonly error?: NativeTurnError | null;
  readonly startedAt?: number | null;
  readonly completedAt?: number | null;
  readonly durationMs?: number | null;
  readonly finalResponse: string | null;
  readonly items: readonly NativeTurnItem[];
  readonly usage: NativeThreadTokenUsage | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTurnStatus(value: unknown): value is TurnStatus {
  return (
    value === 'completed' || value === 'interrupted' || value === 'failed' || value === 'inProgress'
  );
}

function isTurnItem(value: unknown): value is NativeTurnItem {
  return isRecord(value) && typeof value.type === 'string';
}

function isThreadTokenUsage(value: unknown): value is NativeThreadTokenUsage {
  return isRecord(value) && isRecord(value.total) && isRecord(value.last);
}

function isTurnError(value: unknown): value is NativeTurnError {
  return isRecord(value) && typeof value.message === 'string';
}

function isAgentMessage(item: NativeTurnItem): item is NativeTurnItem & SchemaAgentMessage {
  return (
    item.type === 'agentMessage' && typeof item.id === 'string' && typeof item.text === 'string'
  );
}

function finalAssistantResponse(items: readonly NativeTurnItem[]): string | null {
  let hasUnknownPhaseResponse = false;
  let lastUnknownPhaseResponse = '';

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (!item || !isAgentMessage(item)) continue;

    const phase = item.phase as MessagePhase | null | undefined;
    if (phase === 'final_answer') return item.text;
    if ((phase === null || phase === undefined) && !hasUnknownPhaseResponse) {
      hasUnknownPhaseResponse = true;
      lastUnknownPhaseResponse = item.text;
    }
  }

  return hasUnknownPhaseResponse ? lastUnknownPhaseResponse : null;
}

/**
 * Reduces one already-correlated turn event stream into the native result shape
 * used by first-party external clients. Wire validation and turn correlation
 * remain owned by the ingress decoder and AppServerTurnEventRouter.
 */
export class AppServerTurnResultCollector {
  private readonly items: NativeTurnItem[] = [];
  private usage: NativeThreadTokenUsage | null = null;
  private settled = false;

  constructor(private readonly turnId: string) {}

  accept(event: RoutedAppServerEvent): NativeTurnResult | undefined {
    if (this.settled || event.kind !== 'notification') return undefined;

    switch (event.method) {
      case 'item/completed':
        this.collectItem(event.params);
        return undefined;
      case 'thread/tokenUsage/updated':
        this.collectUsage(event.params);
        return undefined;
      case 'turn/completed':
        return this.collectTerminal(event.params);
      default:
        return undefined;
    }
  }

  private collectItem(params: Record<string, unknown>): void {
    if (params.turnId !== this.turnId || !isTurnItem(params.item)) return;
    this.items.push(params.item);
  }

  private collectUsage(params: Record<string, unknown>): void {
    if (params.turnId !== this.turnId || !isThreadTokenUsage(params.tokenUsage)) return;
    this.usage = params.tokenUsage;
  }

  private collectTerminal(params: Record<string, unknown>): NativeTurnResult | undefined {
    const turn = params.turn;
    if (!isRecord(turn) || turn.id !== this.turnId || !isTurnStatus(turn.status)) {
      return undefined;
    }

    this.settled = true;

    return {
      id: this.turnId,
      status: turn.status,
      ...(turn.error === null || isTurnError(turn.error) ? { error: turn.error } : {}),
      ...(turn.startedAt === null || typeof turn.startedAt === 'number'
        ? { startedAt: turn.startedAt }
        : {}),
      ...(turn.completedAt === null || typeof turn.completedAt === 'number'
        ? { completedAt: turn.completedAt }
        : {}),
      ...(turn.durationMs === null || typeof turn.durationMs === 'number'
        ? { durationMs: turn.durationMs }
        : {}),
      finalResponse: finalAssistantResponse(this.items),
      items: [...this.items],
      usage: this.usage,
    };
  }
}
