import Ajv, { type AnySchema, type ValidateFunction } from 'ajv';
import jsonRpcMessageSchema from './generated/json-schema/JSONRPCMessage.json';
import serverNotificationSchema from './generated/json-schema/ServerNotification.json';
import serverRequestSchema from './generated/json-schema/ServerRequest.json';
import type { ServerNotification as GeneratedServerNotification } from './generated/typescript/ServerNotification.js';
import type { ServerRequest as GeneratedServerRequest } from './generated/typescript/ServerRequest.js';
import type { JsonRpcError, JsonRpcId, JsonRpcResponse } from './types.js';

type GeneratedServerRequestMethod = GeneratedServerRequest['method'];
type GeneratedServerNotificationMethod = GeneratedServerNotification['method'];

type GeneratedServerRequestFor<M extends GeneratedServerRequestMethod> = Extract<
  GeneratedServerRequest,
  { method: M }
>;

type GeneratedServerNotificationFor<M extends GeneratedServerNotificationMethod> = Extract<
  GeneratedServerNotification,
  { method: M }
>;

type SchemaValidatedEnvelope<T> = {
  [K in keyof T]: K extends 'params' ? Record<string, unknown> : T[K];
};

type KnownServerRequestMessage = {
  [M in GeneratedServerRequestMethod]: SchemaValidatedEnvelope<GeneratedServerRequestFor<M>>;
}[GeneratedServerRequestMethod];

type KnownServerNotificationMessage = {
  [M in GeneratedServerNotificationMethod]: SchemaValidatedEnvelope<
    GeneratedServerNotificationFor<M>
  >;
}[GeneratedServerNotificationMethod];

interface UnknownServerRequestMessage {
  id: JsonRpcId;
  method: string;
  params: Record<string, unknown>;
}

interface UnknownServerNotificationMessage {
  method: string;
  params: Record<string, unknown>;
}

export type DecodedInboundMessage =
  | { kind: 'response'; message: JsonRpcResponse }
  | {
      kind: 'error-response';
      message: { id: JsonRpcId; error: JsonRpcError };
    }
  | { kind: 'server-request'; message: KnownServerRequestMessage }
  | { kind: 'unknown-server-request'; message: UnknownServerRequestMessage }
  | { kind: 'server-notification'; message: KnownServerNotificationMessage }
  | { kind: 'unknown-notification'; message: UnknownServerNotificationMessage }
  | {
      kind: 'invalid-server-request';
      message: Pick<UnknownServerRequestMessage, 'id' | 'method'>;
    }
  | {
      kind: 'invalid-server-notification';
      message: Pick<UnknownServerNotificationMessage, 'method'>;
    }
  | { kind: 'unrecognized' };

interface JsonSchemaRoot {
  $schema?: string;
  definitions?: Record<string, unknown>;
  oneOf?: unknown[];
}

const ajv = new Ajv({
  strict: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});

// These bounds enforce the range that remains observable after JSON.parse.
// Distinguishing adjacent unsafe int64/uint64 literals requires the deferred
// raw-byte RequestId/parser hardening rather than pretending a JS number kept
// their lexical identity.
const numericFormats = {
  double: (value: number) => Number.isFinite(value),
  int32: (value: number) =>
    Number.isInteger(value) && value >= -2_147_483_648 && value <= 2_147_483_647,
  int64: (value: number) =>
    Number.isInteger(value) &&
    value >= Number('-9223372036854775808') &&
    value <= Number('9223372036854775807'),
  uint: (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= Number('18446744073709551615'),
  uint16: (value: number) => Number.isInteger(value) && value >= 0 && value <= 65_535,
  uint32: (value: number) => Number.isInteger(value) && value >= 0 && value <= 4_294_967_295,
  uint64: (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= Number('18446744073709551615'),
} as const;

for (const [name, validate] of Object.entries(numericFormats)) {
  ajv.addFormat(name, { type: 'number', validate });
}

function definitionSchema(root: JsonSchemaRoot, definition: string): AnySchema {
  return {
    ...(root.$schema ? { $schema: root.$schema } : {}),
    definitions: root.definitions,
    $ref: `#/definitions/${definition}`,
  };
}

function methodRoster(root: JsonSchemaRoot): ReadonlySet<string> {
  if (!Array.isArray(root.oneOf)) {
    throw new Error('Generated Codex method schema is missing oneOf branches');
  }

  const methods = root.oneOf.map((branch) => {
    if (!isRecord(branch)) {
      throw new Error('Generated Codex method schema contains a non-object branch');
    }
    const properties = branch.properties;
    if (!isRecord(properties) || !isRecord(properties.method)) {
      throw new Error('Generated Codex method schema branch is missing a method property');
    }
    const values = properties.method.enum;
    if (!Array.isArray(values) || values.length !== 1 || typeof values[0] !== 'string') {
      throw new Error('Generated Codex method schema branch has an invalid method enum');
    }
    return values[0];
  });

  if (new Set(methods).size !== methods.length) {
    throw new Error('Generated Codex method schema contains duplicate methods');
  }
  return new Set(methods);
}

const jsonRpcSchemaRoot = jsonRpcMessageSchema as unknown as JsonSchemaRoot;
const generatedServerRequestSchema = serverRequestSchema as unknown as JsonSchemaRoot;
const generatedServerNotificationSchema = serverNotificationSchema as unknown as JsonSchemaRoot;

const validateResponse = ajv.compile(
  definitionSchema(jsonRpcSchemaRoot, 'JSONRPCResponse'),
) as ValidateFunction<JsonRpcResponse>;
const validateErrorResponse = ajv.compile(
  definitionSchema(jsonRpcSchemaRoot, 'JSONRPCError'),
) as ValidateFunction<{ id: JsonRpcId; error: JsonRpcError }>;
const validateRequestEnvelope = ajv.compile(
  definitionSchema(jsonRpcSchemaRoot, 'JSONRPCRequest'),
) as ValidateFunction<{ id: JsonRpcId; method: string; params?: unknown }>;
const validateNotificationEnvelope = ajv.compile(
  definitionSchema(jsonRpcSchemaRoot, 'JSONRPCNotification'),
) as ValidateFunction<{ method: string; params?: unknown }>;
const validateKnownServerRequest = ajv.compile(
  generatedServerRequestSchema as AnySchema,
) as ValidateFunction<GeneratedServerRequest>;
const validateKnownServerNotification = ajv.compile(
  generatedServerNotificationSchema as AnySchema,
) as ValidateFunction<GeneratedServerNotification>;

const knownServerRequestMethods = methodRoster(generatedServerRequestSchema);
const knownServerNotificationMethods = methodRoster(generatedServerNotificationSchema);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwnId(value: unknown): boolean {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'id');
}

function normalizeParams(params: unknown): Record<string, unknown> | undefined {
  if (params === undefined) return {};
  return isRecord(params) ? params : undefined;
}

/**
 * Classifies one already-parsed stdout value at the sole App Server ingress.
 *
 * Generated JSON Schema is the exact-pin wire authority. The generated
 * TypeScript unions narrow method discriminants only: serde defaults make a
 * few schema-valid fields optional on the wire even when ts-rs marks them as
 * required, so this seam deliberately keeps params as an unmodified record.
 */
export function decodeInboundMessage(value: unknown): DecodedInboundMessage {
  if (validateResponse(value)) {
    return { kind: 'response', message: value };
  }

  if (validateErrorResponse(value)) {
    return { kind: 'error-response', message: value };
  }

  if (validateRequestEnvelope(value)) {
    const params = normalizeParams(value.params);
    if (knownServerRequestMethods.has(value.method)) {
      if (validateKnownServerRequest(value) && params) {
        return {
          kind: 'server-request',
          message: value as KnownServerRequestMessage,
        };
      }
      return {
        kind: 'invalid-server-request',
        message: { id: value.id, method: value.method },
      };
    }

    if (params) {
      return {
        kind: 'unknown-server-request',
        message: { id: value.id, method: value.method, params },
      };
    }
    return { kind: 'unrecognized' };
  }

  // A message carrying an id is request/response-shaped. Do not let an
  // invalid id or response downgrade into the permissive notification shape.
  if (hasOwnId(value)) {
    return { kind: 'unrecognized' };
  }

  if (validateNotificationEnvelope(value)) {
    const params = normalizeParams(value.params);
    if (knownServerNotificationMethods.has(value.method)) {
      if (validateKnownServerNotification(value) && params) {
        return {
          kind: 'server-notification',
          message: value as KnownServerNotificationMessage,
        };
      }
      return {
        kind: 'invalid-server-notification',
        message: { method: value.method },
      };
    }

    if (params) {
      return {
        kind: 'unknown-notification',
        message: { method: value.method, params },
      };
    }
  }

  return { kind: 'unrecognized' };
}
