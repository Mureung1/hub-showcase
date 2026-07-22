import express from 'express'

import { createTeamFlowRouter } from './teamflow/teamFlowRoutes.js'

/**
 * Creates the TeamFlow API application without binding a network port.
 * Keeping construction separate makes the service straightforward to test.
 */
export function createApp({ authVerifier, repositoryFactory, demoRepository } = {}) {
  const app = express()

  app.disable('x-powered-by')
  // Notes allow up to 100,000 Unicode characters. Keep a finite request cap,
  // but leave enough byte headroom for multibyte Korean text plus JSON fields.
  app.use(express.json({ limit: '512kb' }))

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
