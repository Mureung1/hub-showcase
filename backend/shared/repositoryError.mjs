export class RepositoryUnavailableError extends Error {
  constructor({ resource, operation, cause }) {
    super(`Repository operation failed: ${resource}.${operation}`, { cause })
    this.name = 'RepositoryUnavailableError'
    this.code = 'repository_unavailable'
    this.resource = resource
    this.operation = operation
    this.repositoryCode = cause?.code
  }
}

export function isRepositoryUnavailableError(error) {
  return error instanceof RepositoryUnavailableError
}

export async function executeSupabaseOperation({ resource, operation, run }) {
  try {
    const result = await run()

    if (result.error) {
      throw new RepositoryUnavailableError({ resource, operation, cause: result.error })
    }

    return result.data
  } catch (error) {
    if (isRepositoryUnavailableError(error)) throw error

    throw new RepositoryUnavailableError({ resource, operation, cause: error })
  }
}
