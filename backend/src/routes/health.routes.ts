import { Router } from 'express'
import { ok } from '../shared/http/api-response.js'

export const healthRouter = Router()

healthRouter.get('/health', (_request, response) => {
  response.status(200).json(
    ok({
      status: 'ok',
      message: 'Iris backend is running',
    }),
  )
})
