import {
  resolveCodexChatRuntimeSource,
  type CodexChatBootstrap,
  type ProductRuntimeBootstrap,
} from './codex-chat-config.js'
import { CodexChatService } from './codex-chat-service.js'

const DEFAULT_DISCONNECT_DRAIN_MS = 5_000

export interface CreateCodexChatCompositionOptions {
  readonly bootstrap?: CodexChatBootstrap
  readonly productRuntime?: ProductRuntimeBootstrap
  readonly workspace?: () => string
}

export interface CodexChatComposition {
  readonly origin: string | undefined
  readonly service: CodexChatService
  beginShutdown(): void
  close(): Promise<void>
}

export function createCodexChatComposition(
  options: CreateCodexChatCompositionOptions = {},
): CodexChatComposition {
  const source = resolveCodexChatRuntimeSource({
    bootstrap: options.bootstrap,
    productRuntime: options.productRuntime,
    workspace: options.workspace,
  })
  const service = new CodexChatService(
    source,
    options.bootstrap?.disconnectDrainMs ?? DEFAULT_DISCONNECT_DRAIN_MS,
  )
  return {
    origin: source.origin,
    service,
    beginShutdown: () => service.beginShutdown(),
    close: () => service.close(),
  }
}

export {
  isLoopbackAddress,
  type CodexChatBootstrap,
  type ProductRuntimeBootstrap,
} from './codex-chat-config.js'
