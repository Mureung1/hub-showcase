export type ServerStartupCleanupInput = {
  readonly signal: AbortSignal
}

export type ServerStartupCleanupResult =
  | { readonly status: 'closed'; readonly processTreeGone: true }
  | { readonly status: 'ambiguous'; readonly processTreeGone: false }

export type ServerStartupCleanup = (
  input: ServerStartupCleanupInput,
) => Promise<ServerStartupCleanupResult>

export class ServerStartupCleanupError extends Error {
  readonly code = 'server_startup_cleanup_ambiguous'
  readonly #cleanup: ServerStartupCleanup

  constructor(cleanup: ServerStartupCleanup) {
    super('Server startup cleanup was ambiguous')
    this.name = 'ServerStartupCleanupError'
    this.#cleanup = cleanup
  }

  close(
    input: ServerStartupCleanupInput,
  ): Promise<ServerStartupCleanupResult> {
    return this.#cleanup(input)
  }
}

export async function requireServerStartupCleanup(
  cleanup: ServerStartupCleanup,
): Promise<void> {
  let result: ServerStartupCleanupResult
  try {
    result = await cleanup({
      signal: new AbortController().signal,
    })
  } catch {
    throw new ServerStartupCleanupError(cleanup)
  }
  if (result.status !== 'closed' || !result.processTreeGone) {
    throw new ServerStartupCleanupError(cleanup)
  }
}
