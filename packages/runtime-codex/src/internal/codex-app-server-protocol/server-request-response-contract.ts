import type { ApplyPatchApprovalResponse } from './generated/ApplyPatchApprovalResponse.js'
import type { ExecCommandApprovalResponse } from './generated/ExecCommandApprovalResponse.js'
import type { ServerRequest } from './generated/ServerRequest.js'
import type { AttestationGenerateResponse } from './generated/v2/AttestationGenerateResponse.js'
import type { ChatgptAuthTokensRefreshResponse } from './generated/v2/ChatgptAuthTokensRefreshResponse.js'
import type { CommandExecutionRequestApprovalResponse } from './generated/v2/CommandExecutionRequestApprovalResponse.js'
import type { DynamicToolCallResponse } from './generated/v2/DynamicToolCallResponse.js'
import type { FileChangeRequestApprovalResponse } from './generated/v2/FileChangeRequestApprovalResponse.js'
import type { McpServerElicitationRequestResponse } from './generated/v2/McpServerElicitationRequestResponse.js'
import type { PermissionsRequestApprovalResponse } from './generated/v2/PermissionsRequestApprovalResponse.js'
import type { ToolRequestUserInputResponse } from './generated/v2/ToolRequestUserInputResponse.js'

type ServerRequestResponseContract<Response> = {
  schemaPath: string
  response?: Response
}

function defineServerRequestResponse<Response>(
  schemaName: string,
): ServerRequestResponseContract<Response> {
  return { schemaPath: `${schemaName}.json` }
}

export const serverRequestResponseContracts = {
  'item/commandExecution/requestApproval':
    defineServerRequestResponse<CommandExecutionRequestApprovalResponse>(
      'CommandExecutionRequestApprovalResponse',
    ),
  'item/fileChange/requestApproval':
    defineServerRequestResponse<FileChangeRequestApprovalResponse>(
      'FileChangeRequestApprovalResponse',
    ),
  'item/tool/requestUserInput':
    defineServerRequestResponse<ToolRequestUserInputResponse>(
      'ToolRequestUserInputResponse',
    ),
  'mcpServer/elicitation/request':
    defineServerRequestResponse<McpServerElicitationRequestResponse>(
      'McpServerElicitationRequestResponse',
    ),
  'item/permissions/requestApproval':
    defineServerRequestResponse<PermissionsRequestApprovalResponse>(
      'PermissionsRequestApprovalResponse',
    ),
  'item/tool/call': defineServerRequestResponse<DynamicToolCallResponse>(
    'DynamicToolCallResponse',
  ),
  'account/chatgptAuthTokens/refresh':
    defineServerRequestResponse<ChatgptAuthTokensRefreshResponse>(
      'ChatgptAuthTokensRefreshResponse',
    ),
  'attestation/generate':
    defineServerRequestResponse<AttestationGenerateResponse>(
      'AttestationGenerateResponse',
    ),
  applyPatchApproval: defineServerRequestResponse<ApplyPatchApprovalResponse>(
    'ApplyPatchApprovalResponse',
  ),
  execCommandApproval: defineServerRequestResponse<ExecCommandApprovalResponse>(
    'ExecCommandApprovalResponse',
  ),
} satisfies Record<
  ServerRequest['method'],
  ServerRequestResponseContract<unknown>
>

export type ServerRequestResponseByMethod = {
  [Method in ServerRequest['method']]: (typeof serverRequestResponseContracts)[Method] extends ServerRequestResponseContract<
    infer Response
  >
    ? Response
    : never
}
