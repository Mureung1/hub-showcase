import { safeStringify } from '../../shared-utils.js';
import type { AppServerStreamEmitter } from './emitter.js';
import type { ToolTracker } from './tool-tracker.js';
import { isNativeTurnItem, type NativeTurnItem } from './turn-result-collector.js';

function mapTool(item: NativeTurnItem): { toolName: string; dynamic?: boolean } | undefined {
  if (item.type === 'commandExecution') {
    return { toolName: 'exec', dynamic: true };
  }

  if (item.type === 'fileChange') {
    return { toolName: 'patch', dynamic: true };
  }

  if (item.type === 'mcpToolCall') {
    const server = typeof item.server === 'string' ? item.server || 'server' : 'server';
    const tool = typeof item.tool === 'string' ? item.tool || 'tool' : 'tool';
    return {
      toolName: `mcp__${server}__${tool}`,
      dynamic: true,
    };
  }

  if (item.type === 'dynamicToolCall') {
    const tool = 'tool' in item && typeof item.tool === 'string' && item.tool ? item.tool : 'tool';
    const namespace =
      'namespace' in item && typeof item.namespace === 'string' && item.namespace
        ? item.namespace
        : undefined;
    return {
      toolName: namespace ? `${namespace}__${tool}` : tool,
      dynamic: true,
    };
  }

  if (item.type === 'webSearch') {
    return { toolName: 'web_search', dynamic: true };
  }

  // hookPrompt, subAgentActivity, sleep, and imageGeneration items (plus any
  // unknown future item types) are intentionally unmapped: raw chunks only for now.
  return undefined;
}

export interface NotificationHandlerContext {
  emitter: AppServerStreamEmitter;
  toolTracker: ToolTracker;
  textItemIdsWithDelta: Set<string>;
  reasoningItemIdsWithDelta: Set<string>;
  onError: (error: Error) => void;
  isSameTurn: (params: Record<string, unknown>) => boolean;
}

export type NotificationHandler = (params: Record<string, unknown>) => void;

export function createNotificationHandlers(
  context: NotificationHandlerContext,
): Record<string, NotificationHandler> {
  const handleReasoningDelta =
    (isSummary: boolean): NotificationHandler =>
    (params) => {
      if (!context.isSameTurn(params) || typeof params.delta !== 'string') return;
      if (typeof params.itemId !== 'string') return;
      const itemId = params.itemId;
      context.reasoningItemIdsWithDelta.add(itemId);
      context.emitter.emitReasoningDelta(params.delta, isSummary, itemId);
    };

  const handleItemCompleted: NotificationHandler = (params) => {
    if (!context.isSameTurn(params)) return;
    if (!isNativeTurnItem(params.item)) return;
    const item = params.item;

    if (item.type === 'agentMessage') {
      const itemId = item.id;
      const text = (item as { text?: unknown }).text;
      if (
        !context.textItemIdsWithDelta.has(itemId) &&
        typeof text === 'string' &&
        text.length > 0
      ) {
        context.emitter.emitTextDelta(text, itemId);
      }
      return;
    }

    if (item.type === 'reasoning') {
      const itemId = item.id;
      if (!context.reasoningItemIdsWithDelta.has(itemId)) {
        const summary = (item as { summary?: unknown }).summary;
        const content = (item as { content?: unknown }).content;
        if (Array.isArray(summary) && summary.length > 0) {
          context.emitter.emitReasoningDelta(summary.join('\n'), true, itemId);
        }
        if (Array.isArray(content) && content.length > 0) {
          context.emitter.emitReasoningDelta(content.join('\n'), false, itemId);
        }
      }
      return;
    }

    const tool = mapTool(item);
    if (!tool) return;

    const toolCallId = item.id;
    const resolved = context.toolTracker.complete(
      toolCallId,
      tool,
      typeof item.durationMs === 'number' ? item.durationMs : undefined,
    );
    context.emitter.emitToolResult(
      toolCallId,
      resolved.toolName,
      item,
      resolved.dynamic,
      item.status === 'failed',
    );
  };

  const handleOutputDelta =
    (defaultToolName: 'exec' | 'patch'): NotificationHandler =>
    (params) => {
      if (!context.isSameTurn(params) || typeof params.delta !== 'string') return;
      if (typeof params.itemId !== 'string') return;
      const itemId = params.itemId;
      const tracked = context.toolTracker.get(itemId);
      context.emitter.emitToolOutputDelta(
        itemId,
        tracked?.toolName ?? defaultToolName,
        params.delta,
        tracked?.dynamic ?? true,
      );
    };

  return {
    'item/agentMessage/delta': (params) => {
      if (!context.isSameTurn(params) || typeof params.delta !== 'string') return;
      if (typeof params.itemId !== 'string') return;
      const itemId = params.itemId;
      context.textItemIdsWithDelta.add(itemId);
      context.emitter.emitTextDelta(params.delta, itemId);
    },
    'item/reasoning/textDelta': handleReasoningDelta(false),
    'item/reasoning/summaryTextDelta': handleReasoningDelta(true),
    'item/started': (params) => {
      if (!context.isSameTurn(params)) return;
      if (!isNativeTurnItem(params.item)) return;
      const item = params.item;
      const tool = mapTool(item);
      if (!tool) return;
      const toolCallId = item.id;
      context.toolTracker.start(toolCallId, tool);
      context.emitter.emitToolCall(toolCallId, tool.toolName, safeStringify(item), tool.dynamic);
    },
    'item/completed': handleItemCompleted,
    'item/commandExecution/outputDelta': handleOutputDelta('exec'),
    'item/fileChange/outputDelta': handleOutputDelta('patch'),
    error: (params) => {
      if (!context.isSameTurn(params)) return;
      if (params.willRetry === true) return;
      const nested = params.error;
      if (
        nested &&
        typeof nested === 'object' &&
        typeof (nested as { message?: unknown }).message === 'string'
      ) {
        context.onError(new Error((nested as { message: string }).message));
      }
    },
  };
}
