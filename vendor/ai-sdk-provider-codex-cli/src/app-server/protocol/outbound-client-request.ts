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

function threadStartParams(params: ThreadStartParams): Record<string, unknown> {
  const exact: Record<string, unknown> = {};
  setDefined(exact, 'model', params.model);
  setDefined(exact, 'modelProvider', params.modelProvider);
  setDefined(exact, 'cwd', params.cwd);
  setDefined(exact, 'sandbox', params.sandbox);
  setDefined(exact, 'config', params.config);
  setDefined(exact, 'baseInstructions', params.baseInstructions);
  setDefined(exact, 'developerInstructions', params.developerInstructions);
  setDefined(exact, 'personality', params.personality);
  setDefined(exact, 'approvalPolicy', params.approvalPolicy);
  setDefined(exact, 'ephemeral', params.ephemeral);
  setDefined(exact, 'experimentalRawEvents', params.experimentalRawEvents);
  return exact;
}

function threadResumeParams(params: ThreadResumeParams): Record<string, unknown> {
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
  setDefined(exact, 'approvalPolicy', params.approvalPolicy);
  return exact;
}

function turnInput(input: UserInput): Record<string, unknown> {
  switch (input.type) {
    case 'text':
      return {
        type: 'text',
        text: input.text,
        text_elements: [...input.text_elements],
      };
    case 'image': {
      const exact: Record<string, unknown> = { type: 'image', url: input.url };
      setDefined(exact, 'detail', input.detail);
      return exact;
    }
    case 'localImage': {
      const exact: Record<string, unknown> = { type: 'localImage', path: input.path };
      setDefined(exact, 'detail', input.detail);
      return exact;
    }
    case 'skill':
      return { type: 'skill', name: input.name, path: input.path };
    case 'mention':
      return { type: 'mention', name: input.name, path: input.path };
  }
}

function turnStartParams(params: TurnStartParams): Record<string, unknown> {
  const inputs = params.input.map(turnInput);
  const exact: Record<string, unknown> = {
    threadId: params.threadId,
    input: inputs,
  };
  setDefined(exact, 'cwd', params.cwd);
  setDefined(exact, 'sandboxPolicy', params.sandboxPolicy);
  setDefined(exact, 'model', params.model);
  setDefined(exact, 'effort', params.effort);
  setDefined(exact, 'summary', params.summary);
  setDefined(exact, 'personality', params.personality);
  setDefined(exact, 'approvalPolicy', params.approvalPolicy);
  setDefined(exact, 'outputSchema', params.outputSchema);
  setDefined(exact, 'collaborationMode', params.collaborationMode);
  return exact;
}

function modelListParams(params: ModelListParams): Record<string, unknown> {
  const exact: Record<string, unknown> = {};
  setDefined(exact, 'cursor', params.cursor);
  setDefined(exact, 'limit', params.limit);
  setDefined(exact, 'includeHidden', params.includeHidden);
  return exact;
}

/**
 * Build one of the six adopted client requests.
 *
 * The final request is rebuilt field-by-field and validated against the exact
 * pinned generated schema before it reaches pending registration or stdin.
 */
export function buildGeneratedClientRequest<M extends GeneratedClientRequestMethod>(
  id: GeneratedRequestId,
  method: M,
  params: GeneratedClientRequestInputByMethod[M],
): BuiltOutboundClientRequest<M> {
  switch (method) {
    case 'initialize':
      return validateExactCore(id, method, initializeParams(params as InitializeParams));
    case 'thread/start':
      return validateExactCore(id, method, threadStartParams(params as ThreadStartParams));
    case 'thread/resume':
      return validateExactCore(id, method, threadResumeParams(params as ThreadResumeParams));
    case 'turn/start':
      return validateExactCore(id, method, turnStartParams(params as TurnStartParams));
    case 'turn/interrupt': {
      const interrupt = params as TurnInterruptParams;
      return validateExactCore(id, method, {
        threadId: interrupt.threadId,
        turnId: interrupt.turnId,
      });
    }
    case 'model/list':
      return validateExactCore(id, method, modelListParams(params as ModelListParams));
  }

  throw new Error(`Unsupported generated Codex request method '${String(method)}'`);
}
