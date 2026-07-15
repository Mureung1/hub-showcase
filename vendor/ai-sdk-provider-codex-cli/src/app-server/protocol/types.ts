import type { AskForApproval } from './generated/typescript/v2/AskForApproval.js';

export type JsonRpcId = number | string;

export interface JsonRpcRequest {
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  id: JsonRpcId;
  result: T;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcErrorResponse {
  id: JsonRpcId | null;
  error: JsonRpcError;
}

export interface JsonRpcNotification {
  method: string;
  params?: Record<string, unknown>;
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcResponse
  | JsonRpcErrorResponse
  | JsonRpcNotification;

export interface ClientInfo {
  name: string;
  title?: string | null;
  version: string;
}

export interface InitializeCapabilities {
  experimentalApi: boolean;
  /** Opt into `attestation/generate` requests (codex >= 0.142). */
  requestAttestation?: boolean;
  /** Allow MCP servers to request OpenAI extended form elicitations (codex >= 0.142). */
  mcpServerOpenaiFormElicitation?: boolean;
  optOutNotificationMethods?: string[] | null;
}

export interface InitializeParams {
  clientInfo: ClientInfo;
  capabilities: InitializeCapabilities | null;
}

export interface ModelListParams {
  cursor?: string | null;
  limit?: number | null;
  /** Include models hidden from the default picker list (codex >= 0.142). */
  includeHidden?: boolean | null;
}

/**
 * Vendored subset of the codex 0.142.5 `Model` wire type (renamed upstream
 * from `ModelInfo`), plus fields only pre-0.142 servers return.
 */
export interface ModelInfo {
  id: string;
  /** Underlying model slug (codex >= 0.142). */
  model?: string;
  /** Display name; replaces the pre-0.142 `name` field (codex >= 0.142). */
  displayName?: string;
  description?: string | null;
  /** Whether the model is hidden from the default picker list (codex >= 0.142). */
  hidden?: boolean;
  isDefault?: boolean | null;
  /** External contract: only pre-0.142 servers return `name`. */
  name?: string | null;
  /** External contract: only pre-0.142 servers return `modelProvider`. */
  modelProvider?: string | null;
  [k: string]: unknown;
}

export interface ThreadStartParams {
  model?: string | null;
  modelProvider?: string | null;
  cwd?: string | null;
  approvalPolicy?: AskForApproval | null;
  sandbox?: unknown;
  config?: Record<string, unknown> | null;
  baseInstructions?: string | null;
  developerInstructions?: string | null;
  personality?: 'none' | 'friendly' | 'pragmatic' | null;
  ephemeral?: boolean | null;
  experimentalRawEvents?: boolean;
}

export interface ThreadResumeParams {
  threadId: string;
  history?: unknown[] | null;
  path?: string | null;
  model?: string | null;
  modelProvider?: string | null;
  cwd?: string | null;
  approvalPolicy?: AskForApproval | null;
  sandbox?: unknown;
  config?: Record<string, unknown> | null;
  baseInstructions?: string | null;
  developerInstructions?: string | null;
  personality?: 'none' | 'friendly' | 'pragmatic' | null;
}

export type UserInput =
  | { type: 'text'; text: string; text_elements: unknown[] }
  | {
      type: 'image';
      url: string;
      /** Optional rendering detail hint (codex >= 0.142). */
      detail?: 'auto' | 'low' | 'high' | 'original';
    }
  | {
      type: 'localImage';
      path: string;
      /** Optional rendering detail hint (codex >= 0.142). */
      detail?: 'auto' | 'low' | 'high' | 'original';
    }
  | { type: 'skill'; name: string; path: string }
  | { type: 'mention'; name: string; path: string };

export interface TurnStartParams {
  threadId: string;
  input: UserInput[];
  cwd?: string | null;
  approvalPolicy?: AskForApproval | null;
  sandboxPolicy?: unknown;
  model?: string | null;
  /**
   * Reasoning effort. Open-ended string upstream (`ReasoningEffort = string`
   * in codex 0.142.5); known values include 'none', 'minimal', 'low',
   * 'medium', 'high', 'xhigh', and 'ultra'.
   */
  effort?: string | null;
  summary?: 'auto' | 'concise' | 'detailed' | 'none' | null;
  personality?: 'none' | 'friendly' | 'pragmatic' | null;
  outputSchema?: unknown;
  collaborationMode?: unknown;
}

export interface TurnInterruptParams {
  threadId: string;
  turnId: string;
}

export interface CommandExecutionRequestApprovalParams {
  threadId: string;
  turnId: string;
  itemId: string;
  /** Unix timestamp (ms) when this approval request started (codex >= 0.142). */
  startedAtMs?: number;
  approvalId?: string | null;
  /** Environment in which the command will run (codex >= 0.142). */
  environmentId?: string | null;
  reason?: string | null;
  networkApprovalContext?: unknown | null;
  command?: string | null;
  cwd?: string | null;
  commandActions?: unknown[] | null;
  /** Additional permissions requested for this command (codex >= 0.142). */
  additionalPermissions?: unknown | null;
  proposedExecpolicyAmendment?: unknown | null;
  /** Proposed network policy amendments for future requests (codex >= 0.142). */
  proposedNetworkPolicyAmendments?: unknown[] | null;
  /** Ordered decisions the client may present for this prompt (codex >= 0.142). */
  availableDecisions?: unknown[] | null;
}

export interface CommandExecutionRequestApprovalResponse {
  decision:
    | 'accept'
    | 'acceptForSession'
    | 'decline'
    | 'cancel'
    | { acceptWithExecpolicyAmendment: { execpolicy_amendment: unknown } }
    | { applyNetworkPolicyAmendment: { network_policy_amendment: unknown } };
}

export interface FileChangeRequestApprovalParams {
  threadId: string;
  turnId: string;
  itemId: string;
  /** Unix timestamp (ms) when this approval request started (codex >= 0.142). */
  startedAtMs?: number;
  reason?: string | null;
  grantRoot?: string | null;
}

export interface FileChangeRequestApprovalResponse {
  decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel';
}

export interface ToolRequestUserInputParams {
  threadId: string;
  turnId: string;
  itemId: string;
  questions: unknown[];
  /** Auto-resolution deadline in milliseconds, when set (codex >= 0.142). */
  autoResolutionMs?: number | null;
}

export interface ToolRequestUserInputResponse {
  answers: Record<string, unknown>;
}

export type McpServerElicitationAction = 'accept' | 'decline' | 'cancel';

export interface McpServerElicitationRequestParams {
  threadId: string;
  /** Nullable: the elicitation may arrive outside of an active turn. */
  turnId?: string | null;
  serverName: string;
  /**
   * 'form' and 'openai/form' (codex >= 0.142) requests carry
   * message/requestedSchema; 'url' requests carry url/elicitationId.
   */
  mode?: string;
  message?: string;
  requestedSchema?: unknown;
  url?: string;
  elicitationId?: string;
  /**
   * For MCP tool approval elicitations, Codex sets
   * `codex_approval_kind: 'mcp_tool_call'` and may include `persist` hints.
   */
  _meta?: Record<string, unknown> | null;
}

export interface McpServerElicitationRequestResponse {
  action: McpServerElicitationAction;
  /** Structured user input for accepted elicitations; null for decline/cancel. */
  content?: Record<string, unknown> | null;
  /** Optional client metadata for form-mode action handling (codex >= 0.142). */
  _meta?: Record<string, unknown> | null;
}

export interface DynamicToolCallParams {
  threadId: string;
  turnId: string;
  callId: string;
  /** Dynamic tool namespace (codex >= 0.142). */
  namespace?: string | null;
  tool: string;
  arguments: unknown;
}

export interface DynamicToolCallResponse {
  contentItems: unknown[];
  success: boolean;
}

export interface ChatgptAuthTokensRefreshParams {
  /** Codex 0.142.5 only sends 'unauthorized'; kept open for forward compat. */
  reason: string;
  previousAccountId?: string | null;
}

export interface ChatgptAuthTokensRefreshResponse {
  accessToken: string;
  chatgptAccountId: string;
  chatgptPlanType: string | null;
}
