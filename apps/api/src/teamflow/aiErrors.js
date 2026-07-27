export class TeamFlowApiError extends Error {
  constructor({
    status,
    code,
    message,
    aiRun = null,
    task = null,
    durationMs = null,
    cause,
  }) {
    super(message, cause ? { cause } : undefined)
    this.name = 'TeamFlowApiError'
    this.status = status
    this.code = code
    this.aiRun = aiRun
    this.task = task
    this.durationMs = durationMs
  }

  withAiRun(aiRun, task = null) {
    this.aiRun = aiRun
    this.task = task
    return this
  }
}
