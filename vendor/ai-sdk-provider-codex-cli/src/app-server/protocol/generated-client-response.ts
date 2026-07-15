import type { ValidateFunction } from 'ajv';
import initializeResponseSchema from './generated/json-schema/v1/InitializeResponse.json';
import modelListResponseSchema from './generated/json-schema/v2/ModelListResponse.json';
import threadResumeResponseSchema from './generated/json-schema/v2/ThreadResumeResponse.json';
import threadStartResponseSchema from './generated/json-schema/v2/ThreadStartResponse.json';
import turnInterruptResponseSchema from './generated/json-schema/v2/TurnInterruptResponse.json';
import turnStartResponseSchema from './generated/json-schema/v2/TurnStartResponse.json';
import type {
  GeneratedClientRequestMethod,
  GeneratedClientResponseFor,
} from './generated-client-contract.js';
import { createGeneratedSchemaAjv } from './generated-schema-ajv.js';

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

type ThreadIdentityResponse<M extends 'thread/start' | 'thread/resume'> = {
  thread: Pick<GeneratedClientResponseFor<M>['thread'], 'id'>;
};

type TurnIdentityResponse = {
  turn: Pick<GeneratedClientResponseFor<'turn/start'>['turn'], 'id'>;
};

type InitializeBootstrapResponse = Pick<GeneratedClientResponseFor<'initialize'>, 'userAgent'>;

type ModelListItemResponse = Pick<
  GeneratedClientResponseFor<'model/list'>['data'][number],
  'id' | 'isDefault'
>;

type ModelListConsumerResponse = {
  data: ModelListItemResponse[];
  nextCursor?: GeneratedClientResponseFor<'model/list'>['nextCursor'];
};

interface DecodedClientResponseByMethod {
  initialize: InitializeBootstrapResponse;
  'thread/start': ThreadIdentityResponse<'thread/start'>;
  'thread/resume': ThreadIdentityResponse<'thread/resume'>;
  'turn/start': TurnIdentityResponse;
  'turn/interrupt': Record<string, unknown>;
  'model/list': ModelListConsumerResponse;
}

export type DecodedClientResponseFor<M extends GeneratedClientRequestMethod> =
  DecodedClientResponseByMethod[M];

type ClientResponseProjectors = {
  [M in GeneratedClientRequestMethod]: (
    value: Record<string, unknown>,
  ) => DecodedClientResponseByMethod[M];
};

const projectors = {
  // Runtime JSON Schema proves these consumer fields. The narrower views keep
  // unused generated details and schema-valid extensions out of the internal
  // client contract while returning the original object unchanged.
  initialize: (value) => value as InitializeBootstrapResponse,
  'thread/start': (value) => value as ThreadIdentityResponse<'thread/start'>,
  'thread/resume': (value) => value as ThreadIdentityResponse<'thread/resume'>,
  'turn/start': (value) => value as TurnIdentityResponse,
  'turn/interrupt': (value) => value,
  'model/list': (value) => value as ModelListConsumerResponse,
} satisfies ClientResponseProjectors;

/**
 * Validate one successful result after exact JSON-RPC id correlation.
 *
 * JSON Schema is the wire authority. This decoder deliberately returns the
 * same wire meaning for every adopted method. Package-private result types
 * expose only fields used by current consumers, derived from the generated
 * response association; no defaults or compatibility capabilities are added.
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
