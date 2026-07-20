import express from 'express'

import { createTaskRouter } from './tasks/taskRoutes.js'

/**
 * Creates the TeamFlow API application without binding a network port.
 * Keeping construction separate makes the service straightforward to test.
 */
export function createApp({ taskRepository } = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'teamflow-api',
    })
  })

  if (taskRepository) {
    app.use('/api/tasks', createTaskRouter({ taskRepository }))
  }

  return app
}
