const defaultPort = 3000

function parsePort(value: string | undefined) {
  if (!value) {
    return defaultPort
  }

  const port = Number(value)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer')
  }

  return port
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
}
