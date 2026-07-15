import type { ValidateFunction } from 'ajv';
import clientRequestSchema from './generated/json-schema/ClientRequest.json';
import type { ClientRequest } from './generated/typescript/ClientRequest.js';
import type {
  GeneratedClientRequestFor,
  GeneratedClientRequestMethod,
  GeneratedRequestId,
} from './generated-client-contract.js';
import { createGeneratedSchemaAjv } from './generated-schema-ajv.js';
import type {
  InitializeParams,
  ModelListParams,
  ThreadResumeParams,
  ThreadStartParams,
  TurnInterruptParams,
  TurnStartParams,
  UserInput,
} from './types.js';

export interface GeneratedClientRequestInputByMethod {
  initialize: InitializeParams;
  'thread/start': ThreadStartParams;
  'thread/resume': ThreadResumeParams;
  'turn/start': TurnStartParams;
  'turn/interrupt': TurnInterruptParams;
  'model/list': ModelListParams;
}

type ValidatedGeneratedClientRequest<M extends GeneratedClientRequestMethod> = {
  id: GeneratedClientRequestFor<M>['id'];
  method: M;
  params: Record<string, unknown>;
};

/**
 * Final outbound message for an adopted method. Its exact core passed the
 * pinned generated schema; params can additionally contain an explicit donor
 * compatibility overlay that is not represented as generated authority.
 */
export type BuiltOutboundClientRequest<M extends GeneratedClientRequestMethod> =
  ValidatedGeneratedClientRequest<M>;

const validateGeneratedClientRequest = createGeneratedSchemaAjv().compile(
  clientRequestSchema,
) as ValidateFunction<ClientRequest>;

function setDefined(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value;
}

function validateExactCore<M extends GeneratedClientRequestMethod>(
  id: GeneratedRequestId,
  method: M,
  params: Record<string, unknown>,
): ValidatedGeneratedClientRequest<M> {
  const request = { id, method, params };
  if (!validateGeneratedClientRequest(request)) {
    throw new Error(`Generated Codex request '${method}' failed exact schema validation`);
  }
  return request as ValidatedGeneratedClientRequest<M>;
}

function withCompatibilityParams<M extends GeneratedClientRequestMethod>(
  request: ValidatedGeneratedClientRequest<M>,
  compatibilityParams: Record<string, unknown>,
): BuiltOutboundClientRequest<M> {
  if (Object.keys(compatibilityParams).length === 0) return request;
  return {
    ...request,
    params: { ...request.params, ...compatibilityParams },
  };
}

function initializeParams(params: InitializeParams): Record<string, unknown> {
  const capabilities = params.capabilities
    ? {
        experimentalApi: params.capabilities.experimentalApi,
        requestAttestation: params.capabilities.requestAttestation ?? false,
        ...(params.capabilities.mcpServerOpenaiFormElicitation === undefined
          ? {}
          : {
              mcpServerOpenaiFormElicitation: params.capabilities.mcpServerOpenaiFormElicitation,
            }),
        ...(params.capabilities.optOutNotificationMethods === undefined
          ? {}
          : { optOutNotificationMethods: params.capabilities.optOutNotificationMethods }),
      }
    : null;

  return {
    clientInfo: {
      name: params.clientInfo.name,
      title: params.clientInfo.title ?? null,
      version: params.clientInfo.version,
    },
    capabilities,
  };
}

function threadStartParams(params: ThreadStartParams): {
  exact: Record<string, unknown>;
  compatibility: Record<string, unknown>;
} {
  const exact: Record<string, unknown> = {};
  setDefined(exact, 'model', params.model);
  setDefined(exact, 'modelProvider', params.modelProvider);
  setDefined(exact, 'cwd', params.cwd);
  setDefined(exact, 'sandbox', params.sandbox);
  setDefined(exact, 'config', params.config);
  setDefined(exact, 'baseInstructions', params.baseInstructions);
  setDefined(exact, 'developerInstructions', params.developerInstructions);
  setDefined(exact, 'personality', params.personality);
  setDefined(exact, 'ephemeral', params.ephemeral);
  setDefined(exact, 'experimentalRawEvents', params.experimentalRawEvents);

  // ApprovalPolicy still admits pre-pin donor shapes. Keep it outside the
  // generated core until the explicit legacy-authority checkpoint.
  const compatibility: Record<string, unknown> = {};
  setDefined(compatibility, 'approvalPolicy', params.approvalPolicy);
  setDefined(compatibility, 'persistExtendedHistory', params.persistExtendedHistory);
  return { exact, compatibility };
}

function threadResumeParams(params: ThreadResumeParams): {
  exact: Record<string, unknown>;
  compatibility: Record<string, unknown>;
} {
  const exact: Record<string, unknown> = { threadId: params.threadId };
  setDefined(exact, 'history', params.history);
  setDefined(exact, 'path', params.path);
  setDefined(exact, 'model', params.model);
  setDefined(exact, 'modelProvider', params.modelProvider);
  setDefined(exact, 'cwd', params.cwd);
  setDefined(exact, 'sandbox', params.sandbox);
  setDefined(exact, 'config', params.config);
  setDefined(exact, 'baseInstructions', params.baseInstructions);
  setDefined(exact, 'developerInstructions', params.developerInstructions);
  setDefined(exact, 'personality', params.personality);

  const compatibility: Record<string, unknown> = {};
  setDefined(compatibility, 'approvalPolicy', params.approvalPolicy);
  setDefined(compatibility, 'persistExtendedHistory', params.persistExtendedHistory);
  return { exact, compatibility };
}

function turnInput(input: UserInput): {
  exact: Record<string, unknown>;
  compatibility?: Record<string, unknown>;
} {
  switch (input.type) {
    case 'text':
      return {
        exact: {
          type: 'text',
          text: input.text,
          text_elements: [...input.text_elements],
        },
      };
    case 'image': {
      const exact: Record<string, unknown> = { type: 'image', url: input.url };
      setDefined(exact, 'detail', input.detail);
      if (input.imageUrl === undefined) return { exact };
      return {
        exact,
        compatibility: { ...exact, imageUrl: input.imageUrl },
      };
    }
    case 'localImage': {
      const exact: Record<string, unknown> = { type: 'localImage', path: input.path };
      setDefined(exact, 'detail', input.detail);
      return { exact };
    }
    case 'skill':
      return { exact: { type: 'skill', name: input.name, path: input.path } };
    case 'mention':
      return { exact: { type: 'mention', name: input.name, path: input.path } };
  }
}

function turnStartParams(params: TurnStartParams): {
  exact: Record<string, unknown>;
  compatibility: Record<string, unknown>;
} {
  const inputs = params.input.map(turnInput);
  const exact: Record<string, unknown> = {
    threadId: params.threadId,
    input: inputs.map((input) => input.exact),
  };
  setDefined(exact, 'cwd', params.cwd);
  setDefined(exact, 'sandboxPolicy', params.sandboxPolicy);
  setDefined(exact, 'model', params.model);
  setDefined(exact, 'effort', params.effort);
  setDefined(exact, 'summary', params.summary);
  setDefined(exact, 'personality', params.personality);
  setDefined(exact, 'outputSchema', params.outputSchema);
  setDefined(exact, 'collaborationMode', params.collaborationMode);

  const compatibility: Record<string, unknown> = {};
  setDefined(compatibility, 'approvalPolicy', params.approvalPolicy);
  if (inputs.some((input) => input.compatibility !== undefined)) {
    compatibility.input = inputs.map((input) => input.compatibility ?? input.exact);
  }
  return { exact, compatibility };
}

function modelListParams(params: ModelListParams): {
  exact: Record<string, unknown>;
  compatibility: Record<string, unknown>;
} {
  const exact: Record<string, unknown> = {};
  setDefined(exact, 'cursor', params.cursor);
  setDefined(exact, 'limit', params.limit);
  setDefined(exact, 'includeHidden', params.includeHidden);

  const compatibility: Record<string, unknown> = {};
  setDefined(compatibility, 'modelProviders', params.modelProviders);
  return { exact, compatibility };
}

/**
 * Build one of the six adopted client requests.
 *
 * The exact core is rebuilt field-by-field and validated before named donor
 * compatibility values are overlaid. The overlay preserves current public
 * behavior without presenting those values as generated 0.144.4 authority.
 */
export function buildGeneratedClientRequest<M extends GeneratedClientRequestMethod>(
  id: GeneratedRequestId,
  method: M,
  params: GeneratedClientRequestInputByMethod[M],
): BuiltOutboundClientRequest<M> {
  switch (method) {
    case 'initialize':
      return validateExactCore(id, method, initializeParams(params as InitializeParams));
    case 'thread/start': {
      const split = threadStartParams(params as ThreadStartParams);
      return withCompatibilityParams(
        validateExactCore(id, method, split.exact),
        split.compatibility,
      );
    }
    case 'thread/resume': {
      const split = threadResumeParams(params as ThreadResumeParams);
      return withCompatibilityParams(
        validateExactCore(id, method, split.exact),
        split.compatibility,
      );
    }
    case 'turn/start': {
      const split = turnStartParams(params as TurnStartParams);
      return withCompatibilityParams(
        validateExactCore(id, method, split.exact),
        split.compatibility,
      );
    }
    case 'turn/interrupt': {
      const interrupt = params as TurnInterruptParams;
      return validateExactCore(id, method, {
        threadId: interrupt.threadId,
        turnId: interrupt.turnId,
      });
    }
    case 'model/list': {
      const split = modelListParams(params as ModelListParams);
      return withCompatibilityParams(
        validateExactCore(id, method, split.exact),
        split.compatibility,
      );
    }
  }

  throw new Error(`Unsupported generated Codex request method '${String(method)}'`);
}
