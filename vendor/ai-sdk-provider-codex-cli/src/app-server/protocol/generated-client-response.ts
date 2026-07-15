import type { ValidateFunction } from 'ajv';
import initializeResponseSchema from './generated/json-schema/v1/InitializeResponse.json';
import modelListResponseSchema from './generated/json-schema/v2/ModelListResponse.json';
import threadResumeResponseSchema from './generated/json-schema/v2/ThreadResumeResponse.json';
import threadStartResponseSchema from './generated/json-schema/v2/ThreadStartResponse.json';
import turnInterruptResponseSchema from './generated/json-schema/v2/TurnInterruptResponse.json';
import turnStartResponseSchema from './generated/json-schema/v2/TurnStartResponse.json';
import type { GeneratedClientRequestMethod } from './generated-client-contract.js';
import { createGeneratedSchemaAjv } from './generated-schema-ajv.js';
import type {
  InitializeResponse,
  ModelListResponse,
  ThreadResumeResponse,
  ThreadStartResponse,
  TurnInterruptResponse,
  TurnStartResponse,
} from './types.js';

type GeneratedClientResponseValidators = {
  [M in GeneratedClientRequestMethod]: ValidateFunction<Record<string, unknown>>;
};

const ajv = createGeneratedSchemaAjv();
const validators: GeneratedClientResponseValidators = {
  initialize: ajv.compile(initializeResponseSchema),
  'thread/start': ajv.compile(threadStartResponseSchema),
  'thread/resume': ajv.compile(threadResumeResponseSchema),
  'turn/start': ajv.compile(turnStartResponseSchema),
  'turn/interrupt': ajv.compile(turnInterruptResponseSchema),
  'model/list': ajv.compile(modelListResponseSchema),
};

interface DecodedClientResponseByMethod {
  initialize: InitializeResponse;
  'thread/start': ThreadStartResponse;
  'thread/resume': ThreadResumeResponse;
  'turn/start': TurnStartResponse;
  'turn/interrupt': TurnInterruptResponse;
  'model/list': ModelListResponse;
}

export type DecodedClientResponseFor<M extends GeneratedClientRequestMethod> =
  DecodedClientResponseByMethod[M];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withMissing(
  value: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  let projected = value;
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (Object.prototype.hasOwnProperty.call(projected, key)) continue;
    if (projected === value) projected = { ...value };
    projected[key] = defaultValue;
  }
  return projected;
}

function withoutNull(
  value: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  let projected = value;
  for (const key of keys) {
    if (projected[key] !== null) continue;
    if (projected === value) projected = { ...value };
    delete projected[key];
  }
  return projected;
}

function normalizeUserInput(input: Record<string, unknown>): Record<string, unknown> {
  switch (input.type) {
    case 'text':
      return withMissing(input, { text_elements: [] });
    case 'image':
    case 'localImage':
      return withoutNull(input, ['detail']);
    default:
      return input;
  }
}

function normalizeUserMessage(item: Record<string, unknown>): Record<string, unknown> {
  const content = item.content as unknown[];
  let projectedContent = content;
  for (let index = 0; index < content.length; index++) {
    const input = content[index];
    if (!isRecord(input)) continue;
    const projectedInput = normalizeUserInput(input);
    if (projectedInput === input) continue;
    if (projectedContent === content) projectedContent = [...content];
    projectedContent[index] = projectedInput;
  }
  return projectedContent === content ? item : { ...item, content: projectedContent };
}

function normalizeThreadItem(item: Record<string, unknown>): Record<string, unknown> {
  switch (item.type) {
    case 'userMessage':
      return normalizeUserMessage(item);
    case 'agentMessage':
      return withMissing(item, { phase: null });
    case 'reasoning':
      return withMissing(item, { summary: [], content: [] });
    case 'commandExecution':
      return withMissing(item, {
        processId: null,
        aggregatedOutput: null,
        exitCode: null,
        durationMs: null,
      });
    case 'mcpToolCall':
      return withoutNull(withMissing(item, { result: null, error: null, durationMs: null }), [
        'mcpAppResourceUri',
      ]);
    case 'dynamicToolCall':
      return withMissing(item, {
        namespace: null,
        contentItems: null,
        success: null,
        durationMs: null,
      });
    case 'collabAgentToolCall':
      return withMissing(item, { prompt: null });
    case 'webSearch':
      return withMissing(item, { action: null });
    case 'imageGeneration':
      return withoutNull(withMissing(item, { revisedPrompt: null }), ['savedPath']);
    default:
      return item;
  }
}

function normalizeCodexErrorInfo(info: Record<string, unknown>): Record<string, unknown> {
  const httpVariants = [
    'httpConnectionFailed',
    'responseStreamConnectionFailed',
    'responseStreamDisconnected',
    'responseTooManyFailedAttempts',
  ] as const;

  for (const variant of httpVariants) {
    const details = info[variant];
    if (!isRecord(details)) continue;
    const projectedDetails = withMissing(details, { httpStatusCode: null });
    return projectedDetails === details ? info : { ...info, [variant]: projectedDetails };
  }
  return info;
}

function normalizeTurnError(error: Record<string, unknown>): Record<string, unknown> {
  let projected = withMissing(error, {
    codexErrorInfo: null,
    additionalDetails: null,
  });
  if (isRecord(projected.codexErrorInfo)) {
    const codexErrorInfo = normalizeCodexErrorInfo(projected.codexErrorInfo);
    if (codexErrorInfo !== projected.codexErrorInfo) {
      projected = { ...projected, codexErrorInfo };
    }
  }
  return projected;
}

function normalizeTurn(value: Record<string, unknown>): Record<string, unknown> {
  let projected = withMissing(value, { error: null });

  if (isRecord(projected.error)) {
    const error = normalizeTurnError(projected.error);
    if (error !== projected.error) projected = { ...projected, error };
  }

  const items = projected.items as unknown[];
  let projectedItems = items;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!isRecord(item)) continue;
    const projectedItem = normalizeThreadItem(item);
    if (projectedItem === item) continue;
    if (projectedItems === items) projectedItems = [...items];
    projectedItems[index] = projectedItem;
  }
  if (projectedItems !== items) projected = { ...projected, items: projectedItems };

  return projected;
}

type ClientResponseProjectors = {
  [M in GeneratedClientRequestMethod]: (
    value: Record<string, unknown>,
  ) => DecodedClientResponseByMethod[M];
};

const projectors = {
  initialize: (value) => value as unknown as InitializeResponse,
  'thread/start': (value) =>
    withMissing(value, { reasoningEffort: null }) as unknown as ThreadStartResponse,
  'thread/resume': (value) =>
    withMissing(value, { reasoningEffort: null }) as unknown as ThreadResumeResponse,
  'turn/start': (value) => {
    const turn = normalizeTurn(value.turn as Record<string, unknown>);
    return (turn === value.turn ? value : { ...value, turn }) as unknown as TurnStartResponse;
  },
  // The exact pinned source returns this method as an empty acknowledgement.
  'turn/interrupt': () => ({}),
  'model/list': (value) => withMissing(value, { nextCursor: null }) as unknown as ModelListResponse,
} satisfies ClientResponseProjectors;

/**
 * Validate one successful result after exact JSON-RPC id correlation.
 *
 * JSON Schema is the wire authority. This decoder deliberately returns the
 * same wire meaning. A copy-on-write compatibility projection adds only the
 * schema-optional values that the existing donor public response types mark
 * as required; it does not apply the broader generated default graph. The
 * generated TypeScript response types remain compile-time provenance rather
 * than a runtime cast.
 */
export function decodeGeneratedClientResponse<M extends GeneratedClientRequestMethod>(
  method: M,
  value: unknown,
): DecodedClientResponseFor<M> {
  if (!validators[method](value)) {
    throw new Error(
      `Generated Codex response for method '${method}' failed exact schema validation`,
    );
  }
  return projectors[method](value) as DecodedClientResponseFor<M>;
}
