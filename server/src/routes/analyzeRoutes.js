import { Router } from 'express'
import { analyzeWithAi } from '../services/aiAnalysisService.js'
import { analyzeWithMock } from '../services/mockAnalysisService.js'
import {
  serverValidationWarnings,
  validateAnalysisResult,
} from '../utils/validateAnalysisResult.js'

export const analyzeRouter = Router()

analyzeRouter.post('/', async (request, response, next) => {
  try {
    const analysisMode = request.body?.mode || 'mock'
    const supportedModes = new Set(['mock', 'ai'])

    if (!supportedModes.has(analysisMode)) {
      const error = new Error(`Unsupported analysis mode: ${analysisMode}`)
      error.statusCode = 400
      error.type = 'unsupported_mode'
      error.publicMessage = 'Unsupported analysis mode. Use "mock" or "ai".'
      throw error
    }

    const rawResult =
      analysisMode === 'ai'
        ? await analyzeWithAi(request.body)
        : await analyzeWithMock(request.body)

    response.json(validateAnalysisResult(rawResult, serverValidationWarnings))
  } catch (error) {
    next(error)
  }
})
