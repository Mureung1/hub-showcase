import type {
  CodexChatRuntime,
  CodexProductCapableRuntime,
} from '../src/index.js'
import type { CodexChatRuntime as BrowserCodexChatRuntime } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive the private product-thread input.
import type { StartThreadInput } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive private MCP credentials.
import type { CodexPrivateMcpServerInput } from '../src/contract.js'

// @ts-expect-error Product callers must not receive private thread configuration.
import type { StartThreadInput as ProductStartThreadInput } from '../src/index.js'

declare const browserRuntime: BrowserCodexChatRuntime
declare const productRuntime: CodexProductCapableRuntime
declare const chatRuntime: CodexChatRuntime

void browserRuntime.startThread()
void chatRuntime.startThread()
void productRuntime.startThread()

void productRuntime.startProductTurn({
  threadId: 'native-thread',
  permissionProfile: 'workspace_write',
  text: 'Continue the product conversation.',
})

void productRuntime.startProductTurn({
  threadId: 'native-thread',
  permissionProfile: 'workspace_write',
  text: 'Continue the product conversation.',
  // @ts-expect-error Product callers do not own model or reasoning selection.
  plan: { model: 'legacy-model', reasoningEffort: 'medium' },
})
