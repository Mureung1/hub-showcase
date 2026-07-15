import express from 'express'

/**
 * Creates the TeamFlow API application without binding a network port.
 * Keeping construction separate makes the service straightforward to test.
 */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      service: 'teamflow-api',
    })
  })

  return app
}
