export class TeamFlowApiError extends Error {
  constructor({
    status,
    code,
    message,
    aiRun = null,
    durationMs = null,
    cause,
  }) {
    super(message, cause ? { cause } : undefined)
    this.name = 'TeamFlowApiError'
    this.status = status
    this.code = code
    this.aiRun = aiRun
    this.durationMs = durationMs
  }

  withAiRun(aiRun) {
    this.aiRun = aiRun
    return this
  }
}
