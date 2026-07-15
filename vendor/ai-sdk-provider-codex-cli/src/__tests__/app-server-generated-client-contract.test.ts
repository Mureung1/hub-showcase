import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  generatedClientRequestMethods,
  type GeneratedClientRequestFor,
  type GeneratedClientRequestParams,
  type GeneratedClientResponseFor,
} from '../app-server/protocol/generated-client-contract.js';
import type { ClientRequest } from '../app-server/protocol/generated/typescript/ClientRequest.js';
import type { InitializeParams } from '../app-server/protocol/generated/typescript/InitializeParams.js';
import type { InitializeResponse } from '../app-server/protocol/generated/typescript/InitializeResponse.js';
import type { ModelListParams } from '../app-server/protocol/generated/typescript/v2/ModelListParams.js';
import type { ModelListResponse } from '../app-server/protocol/generated/typescript/v2/ModelListResponse.js';
import type { ThreadResumeParams } from '../app-server/protocol/generated/typescript/v2/ThreadResumeParams.js';
import type { ThreadResumeResponse } from '../app-server/protocol/generated/typescript/v2/ThreadResumeResponse.js';
import type { ThreadStartParams } from '../app-server/protocol/generated/typescript/v2/ThreadStartParams.js';
import type { ThreadStartResponse } from '../app-server/protocol/generated/typescript/v2/ThreadStartResponse.js';
import type { TurnInterruptParams } from '../app-server/protocol/generated/typescript/v2/TurnInterruptParams.js';
import type { TurnInterruptResponse } from '../app-server/protocol/generated/typescript/v2/TurnInterruptResponse.js';
import type { TurnStartParams } from '../app-server/protocol/generated/typescript/v2/TurnStartParams.js';
import type { TurnStartResponse } from '../app-server/protocol/generated/typescript/v2/TurnStartResponse.js';

type ExpectedParamsByMethod = {
  initialize: InitializeParams;
  'thread/start': ThreadStartParams;
  'thread/resume': ThreadResumeParams;
  'turn/start': TurnStartParams;
  'turn/interrupt': TurnInterruptParams;
  'model/list': ModelListParams;
};

type ExpectedResponseByMethod = {
  initialize: InitializeResponse;
  'thread/start': ThreadStartResponse;
  'thread/resume': ThreadResumeResponse;
  'turn/start': TurnStartResponse;
  'turn/interrupt': TurnInterruptResponse;
  'model/list': ModelListResponse;
};

type ActualParamsByMethod = {
  [M in keyof ExpectedParamsByMethod]: GeneratedClientRequestParams<M>;
};

type ActualResponseByMethod = {
  [M in keyof ExpectedResponseByMethod]: GeneratedClientResponseFor<M>;
};

describe('generated client contract', () => {
  it('tracks only the request methods currently used by the fork', () => {
    expect(generatedClientRequestMethods).toEqual([
      'initialize',
      'thread/start',
      'thread/resume',
      'turn/start',
      'turn/interrupt',
      'model/list',
    ]);
  });

  it('derives request params from ClientRequest and associates direct generated responses', () => {
    expectTypeOf<ActualParamsByMethod>().toEqualTypeOf<ExpectedParamsByMethod>();
    expectTypeOf<ActualResponseByMethod>().toEqualTypeOf<ExpectedResponseByMethod>();
    expectTypeOf<GeneratedClientRequestFor<'turn/start'>>().toEqualTypeOf<
      Extract<ClientRequest, { method: 'turn/start' }>
    >();
  });
});
