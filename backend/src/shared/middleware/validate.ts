import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

type ValidationSchemas = {
  body?: ZodType
  params?: ZodType
  query?: ZodType
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (request, _response, next) => {
    if (schemas.body) {
      request.body = schemas.body.parse(request.body)
    }

    if (schemas.params) {
      schemas.params.parse(request.params)
    }

    if (schemas.query) {
      schemas.query.parse(request.query)
    }

    next()
  }
}
