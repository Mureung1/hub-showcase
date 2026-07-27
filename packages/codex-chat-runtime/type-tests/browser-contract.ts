import type {
  CodexAccountLifecycle,
  CodexChatRuntime,
  CodexManagedRuntime,
  CodexProductCapableRuntime,
  CodexRuntimeRole,
  StartThreadInput as ProductStartThreadInput,
} from '../src/index.js'
import type { CodexChatRuntime as BrowserCodexChatRuntime } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive the private product-thread input.
import type { StartThreadInput } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive private MCP credentials.
import type { CodexPrivateMcpServerInput } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive the private account lifecycle.
import type { CodexAccountLifecycle as BrowserAccountLifecycle } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive process-owned Runtime roles.
import type { CodexRuntimeRole as BrowserRuntimeRole } from '../src/contract.js'

// @ts-expect-error Browser callers must not receive the managed process Runtime.
import type { CodexManagedRuntime as BrowserManagedRuntime } from '../src/contract.js'

declare const browserRuntime: BrowserCodexChatRuntime
declare const accountLifecycle: CodexAccountLifecycle
declare const managedRuntime: CodexManagedRuntime
declare const productRuntime: CodexProductCapableRuntime
declare const chatRuntime: CodexChatRuntime
declare const runtimeRole: CodexRuntimeRole
declare const privateThreadInput: ProductStartThreadInput

void accountLifecycle
void managedRuntime.readAccount({
  refreshToken: true,
  signal: new AbortController().signal,
})
void browserRuntime.startThread()
void chatRuntime.startThread()
void productRuntime.startThread(privateThreadInput)
void runtimeRole
void (null as unknown as BrowserAccountLifecycle)
void (null as unknown as BrowserManagedRuntime)
void (null as unknown as BrowserRuntimeRole)

// @ts-expect-error Browser Chat runtime accepts no private thread configuration.
void browserRuntime.startThread(privateThreadInput)

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
