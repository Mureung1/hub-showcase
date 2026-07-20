import type { Router } from 'express'

import {
  resolveCodexChatRuntimeSource,
  type CodexChatBootstrap,
} from './codex-chat-config.js'
import { createCodexChatRouter } from './codex-chat-http.js'
import { CodexChatService } from './codex-chat-service.js'

const DEFAULT_DISCONNECT_DRAIN_MS = 5_000

export interface CreateCodexChatCompositionOptions {
  readonly bootstrap?: CodexChatBootstrap
  readonly environment?: NodeJS.ProcessEnv
}

export interface CodexChatComposition {
  readonly router: Router
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
    environment: options.environment ?? process.env,
  })
  const service = new CodexChatService(
    source,
    options.bootstrap?.disconnectDrainMs ?? DEFAULT_DISCONNECT_DRAIN_MS,
  )
  return {
    router: createCodexChatRouter(
      service,
      source.origin,
      options.bootstrap?.httpWriteDrainMs,
    ),
    origin: source.origin,
    service,
    beginShutdown: () => service.beginShutdown(),
    close: () => service.close(),
  }
}

export { isLoopbackAddress, type CodexChatBootstrap } from './codex-chat-config.js'
export { writeNdjsonLine, type NdjsonWritable } from './codex-chat-http.js'
