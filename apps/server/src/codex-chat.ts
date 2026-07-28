import {
  resolveCodexChatRuntimeSource,
  type CodexChatBootstrap,
} from './codex-chat-config.js'
import { CodexChatService } from './codex-chat-service.js'

const DEFAULT_DISCONNECT_DRAIN_MS = 5_000

export interface CreateCodexChatCompositionOptions {
  readonly bootstrap?: CodexChatBootstrap
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
  const source = resolveCodexChatRuntimeSource(options.bootstrap)
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
} from './codex-chat-config.js'
