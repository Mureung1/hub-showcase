import { z } from 'zod';
import type { CodexAppServerSettings } from './types.js';
import { isValidConfigOverrideKey, isValidMcpServerName } from './config-key-utils.js';

const loggerFunctionSchema = z.object({
  debug: z.any().refine((val) => typeof val === 'function', {
    message: 'debug must be a function',
  }),
  info: z.any().refine((val) => typeof val === 'function', {
    message: 'info must be a function',
  }),
  warn: z.any().refine((val) => typeof val === 'function', {
    message: 'warn must be a function',
  }),
  error: z.any().refine((val) => typeof val === 'function', {
    message: 'error must be a function',
  }),
});

const mcpServerBaseSchema = z.object({
  enabled: z.boolean().optional(),
  startupTimeoutSec: z.number().int().positive().optional(),
  toolTimeoutSec: z.number().int().positive().optional(),
  enabledTools: z.array(z.string()).optional(),
  disabledTools: z.array(z.string()).optional(),
});

const mcpServerStdioSchema = mcpServerBaseSchema.extend({
  transport: z.literal('stdio'),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
});

const mcpServerHttpSchema = mcpServerBaseSchema.extend({
  transport: z.literal('http'),
  url: z.string().min(1),
  bearerToken: z.string().optional(),
  bearerTokenEnvVar: z.string().optional(),
  httpHeaders: z.record(z.string(), z.string()).optional(),
  envHttpHeaders: z.record(z.string(), z.string()).optional(),
});

const mcpServerSchema = z.discriminatedUnion('transport', [
  mcpServerStdioSchema,
  mcpServerHttpSchema,
]);

const mcpServerNameSchema = z
  .string()
  .min(1)
  .refine((value) => isValidMcpServerName(value), {
    message: 'MCP server names must match /^[A-Za-z0-9_-]+$/.',
  });

const sdkMcpServerSchema = z
  .object({
    name: mcpServerNameSchema,
    _start: z.any().refine((val) => typeof val === 'function', {
      message: '_start must be a function',
    }),
    _stop: z.any().refine((val) => typeof val === 'function', {
      message: '_stop must be a function',
    }),
  })
  .passthrough();

export const appServerMcpServersSchema = z.record(
  mcpServerNameSchema,
  z.union([mcpServerSchema, sdkMcpServerSchema]),
);

const configOverrideKeySchema = z
  .string()
  .min(1)
  .refine((value) => isValidConfigOverrideKey(value), {
    message: 'configOverrides keys must match /^[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*$/.',
  });

const configOverridesSchema = z
  .record(
    configOverrideKeySchema,
    z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())]),
  )
  .optional();

const approvalPolicySchema = z.union([
  z.enum(['untrusted', 'on-request', 'never']),
  z
    .object({
      granular: z
        .object({
          sandbox_approval: z.boolean(),
          rules: z.boolean(),
          skill_approval: z.boolean(),
          request_permissions: z.boolean(),
          mcp_elicitations: z.boolean(),
        })
        .strict(),
    })
    .strict(),
]);

const sandboxPolicySchema = z.union([
  z.enum(['read-only', 'workspace-write', 'danger-full-access']),
  z
    .object({
      type: z.string(),
    })
    .passthrough(),
]);

const serverRequestsSchema = z
  .object({
    onCommandExecutionApproval: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onCommandExecutionApproval must be a function',
      })
      .optional(),
    onFileChangeApproval: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onFileChangeApproval must be a function',
      })
      .optional(),
    onMcpElicitation: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onMcpElicitation must be a function',
      })
      .optional(),
    onToolRequestUserInput: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onToolRequestUserInput must be a function',
      })
      .optional(),
    onDynamicToolCall: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onDynamicToolCall must be a function',
      })
      .optional(),
    onAuthRefresh: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onAuthRefresh must be a function',
      })
      .optional(),
    onUnhandled: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onUnhandled must be a function',
      })
      .optional(),
  })
  .strict()
  .optional();

export const appServerSettingsSchema = z
  .object({
    codexPath: z.string().optional(),
    cwd: z.string().optional(),
    env: z.record(z.string(), z.string()).optional(),
    verbose: z.boolean().optional(),
    logger: z.union([z.literal(false), loggerFunctionSchema]).optional(),

    personality: z.enum(['none', 'friendly', 'pragmatic']).optional(),
    effort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).optional(),
    summary: z.enum(['auto', 'concise', 'detailed', 'none']).optional(),
    approvalPolicy: approvalPolicySchema.optional(),
    sandboxPolicy: sandboxPolicySchema.optional(),
    baseInstructions: z.string().optional(),
    developerInstructions: z.string().optional(),

    mcpServers: appServerMcpServersSchema.optional(),
    rmcpClient: z.boolean().optional(),
    configOverrides: configOverridesSchema,

    autoApprove: z.boolean().optional(),
    connectionTimeoutMs: z.number().int().positive().optional(),
    requestTimeoutMs: z.number().int().positive().optional(),
    idleTimeoutMs: z.number().int().positive().optional(),
    minCodexVersion: z
      .string()
      .regex(/^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/, 'minCodexVersion must be a semver string')
      .optional(),
    threadMode: z.enum(['stateless', 'persistent']).optional(),
    resume: z.string().optional(),
    includeRawChunks: z.boolean().optional(),

    serverRequests: serverRequestsSchema,
    onSessionCreated: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onSessionCreated must be a function',
      })
      .optional(),
  })
  .strict();

export const appServerProviderOptionsSchema = z
  .object({
    threadId: z.string().optional(),
    resume: z.string().optional(),
    threadMode: z.enum(['stateless', 'persistent']).optional(),
    includeRawChunks: z.boolean().optional(),

    personality: z.enum(['none', 'friendly', 'pragmatic']).optional(),
    effort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).optional(),
    summary: z.enum(['auto', 'concise', 'detailed', 'none']).optional(),
    approvalPolicy: approvalPolicySchema.optional(),
    sandboxPolicy: sandboxPolicySchema.optional(),
    baseInstructions: z.string().optional(),
    developerInstructions: z.string().optional(),

    mcpServers: appServerMcpServersSchema.optional(),
    rmcpClient: z.boolean().optional(),
    configOverrides: configOverridesSchema,

    autoApprove: z.boolean().optional(),
    serverRequests: serverRequestsSchema,
    onSessionCreated: z
      .any()
      .refine((val) => val === undefined || typeof val === 'function', {
        message: 'onSessionCreated must be a function',
      })
      .optional(),
  })
  .strict();

function parseValidationIssues(error: unknown): string[] {
  type ZodIssueLike = { path?: (string | number)[]; message?: string };

  let issues: ZodIssueLike[] = [];
  if (error && typeof error === 'object') {
    const v4 = (error as { issues?: unknown }).issues;
    const v3 = (error as { errors?: unknown }).errors;
    if (Array.isArray(v4)) issues = v4 as ZodIssueLike[];
    else if (Array.isArray(v3)) issues = v3 as ZodIssueLike[];
  }

  return issues.map((i) => {
    const path = Array.isArray(i?.path) ? i.path.join('.') : '';
    const message = i?.message || 'Invalid value';
    return `${path ? path + ': ' : ''}${message}`;
  });
}

export function validateAppServerSettings(settings: unknown): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const parsed = appServerSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    return {
      valid: false,
      warnings,
      errors: parseValidationIssues(parsed.error),
    };
  }

  const s = parsed.data as CodexAppServerSettings;
  if (s.autoApprove && s.approvalPolicy !== undefined) {
    warnings.push('autoApprove overrides approvalPolicy for server-initiated approval requests.');
  }
  if (s.threadMode === 'persistent' && s.resume) {
    warnings.push(
      'threadMode=persistent ignores resume when an explicit thread is already active.',
    );
  }

  return { valid: true, warnings, errors: [] };
}

export function validateModelId(modelId: string): string | undefined {
  if (!modelId || modelId.trim() === '') return 'Model ID cannot be empty';
  return undefined;
}
