import express from 'express'

import { createTeamFlowRouter } from './teamflow/teamFlowRoutes.js'

/**
 * Creates the TeamFlow API application without binding a network port.
 * Keeping construction separate makes the service straightforward to test.
 */
export function createApp({ authVerifier, repositoryFactory, demoRepository } = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'teamflow-api',
    })
  })

  if (authVerifier && repositoryFactory && demoRepository) {
    app.use('/api', createTeamFlowRouter({ authVerifier, repositoryFactory, demoRepository }))
  }

  return app
}
