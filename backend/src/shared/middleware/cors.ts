import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'

const allowedOrigin = new URL(env.adminWebUrl).origin

export const corsHandler: RequestHandler = (request, response, next) => {
  const requestOrigin = request.headers.origin

  if (requestOrigin === allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
}
