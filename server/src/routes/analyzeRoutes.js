import { Router } from 'express'
import { analyzeWithAi } from '../services/aiAnalysisService.js'
import { analyzeWithMock } from '../services/mockAnalysisService.js'
import {
  serverValidationWarnings,
  validateAnalysisResult,
} from '../utils/validateAnalysisResult.js'

async function defaultAnalyzeNotice({ mode, requestBody }) {
  return mode === 'ai'
    ? analyzeWithAi(requestBody)
    : analyzeWithMock(requestBody)
}

export function createAnalyzeRouter({ analyzeNotice = defaultAnalyzeNotice } = {}) {
  const analyzeRouter = Router()

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

      const rawResult = await analyzeNotice({
        mode: analysisMode,
        requestBody: request.body,
      })

      response.json(validateAnalysisResult(rawResult, serverValidationWarnings))
    } catch (error) {
      next(error)
    }
  })

  return analyzeRouter
}
