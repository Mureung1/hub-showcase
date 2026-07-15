import type { ClientNotification } from './generated/typescript/ClientNotification.js';
import type { ClientRequest } from './generated/typescript/ClientRequest.js';
import type { InitializeResponse } from './generated/typescript/InitializeResponse.js';
import type { RequestId } from './generated/typescript/RequestId.js';
import type { ModelListResponse } from './generated/typescript/v2/ModelListResponse.js';
import type { ThreadResumeResponse } from './generated/typescript/v2/ThreadResumeResponse.js';
import type { ThreadStartResponse } from './generated/typescript/v2/ThreadStartResponse.js';
import type { TurnInterruptResponse } from './generated/typescript/v2/TurnInterruptResponse.js';
import type { TurnStartResponse } from './generated/typescript/v2/TurnStartResponse.js';

/**
 * Client requests currently exercised by donor production code.
 *
 * This is a coverage boundary, not an assertion that every generated method is
 * semantically integrated by the fork.
 */
export const generatedClientRequestMethods = [
  'initialize',
  'thread/start',
  'thread/resume',
  'turn/start',
  'turn/interrupt',
  'model/list',
] as const satisfies readonly ClientRequest['method'][];

export type GeneratedClientRequestMethod = (typeof generatedClientRequestMethods)[number];

export type GeneratedClientRequestFor<M extends GeneratedClientRequestMethod> = Extract<
  ClientRequest,
  { method: M }
>;

export type GeneratedClientRequestParams<M extends GeneratedClientRequestMethod> =
  GeneratedClientRequestFor<M>['params'];

type GeneratedClientResponseByMethod = {
  initialize: InitializeResponse;
  'thread/start': ThreadStartResponse;
  'thread/resume': ThreadResumeResponse;
  'turn/start': TurnStartResponse;
  'turn/interrupt': TurnInterruptResponse;
  'model/list': ModelListResponse;
};

/**
 * Compile-time association for the generated response artifacts.
 *
 * Runtime acceptance must use the generated JSON Schema. ts-rs represents
 * some serde-default fields as required, so schema-valid wire values must not
 * be cast to these types without an explicit normalization step.
 */
export type GeneratedClientResponseFor<M extends GeneratedClientRequestMethod> =
  GeneratedClientResponseByMethod[M];

export type GeneratedClientNotification = ClientNotification;
export type GeneratedRequestId = RequestId;
